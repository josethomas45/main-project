import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { useAuth } from '@clerk/clerk-expo';
import { useVehicle } from '../contexts/VehicleContext';
import { detectVehicleInfo } from '../utils/obdService';
import BluetoothService from '../utils/BluetoothService';
import OBDConnectionManager from '../utils/OBDConnectionManager';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

/**
 * VehicleCheckModal Component
 * 
 * Blocking modal that guides users through vehicle registration flow:
 * 1. Check OBD connection
 * 2. Scan for Bluetooth OBD Devices
 * 3. Connect to selected device
 * 4. Detect VIN
 * 5. Register vehicle with backend
 */
export default function VehicleCheckModal({ visible, onComplete }) {
  const { identifyVehicle } = useVehicle();
  const { getToken } = useAuth();

  // Flow states
  const [flowState, setFlowState] = useState('checking_obd'); // checking_obd, scanning, connecting, detecting_vin, manual_entry, registering, error, success
  const [statusMessage, setStatusMessage] = useState('Checking OBD connection...');
  const [errorMessage, setErrorMessage] = useState(null);
  const [detectedVIN, setDetectedVIN] = useState(null);
  const [detectedModel, setDetectedModel] = useState(null);
  const [manualVIN, setManualVIN] = useState('');
  const [devices, setDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (visible && !loadingRef.current) {
      // Reset state and start scanning
      setFlowState('scanning');
      setStatusMessage('Looking for OBD Devices...');
      setErrorMessage(null);
      setDetectedVIN(null);
      setDetectedModel(null);
      setManualVIN('');
      setDevices([]);
      
      // Start by listing paired devices, then discover new ones
      setTimeout(() => {
        loadDevices();
      }, 500);
    }
  }, [visible]);

  /**
   * Scan for real Bluetooth OBD devices.
   * First lists already-paired devices, then runs discovery for new ones.
   */
  const loadDevices = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    setFlowState('scanning');
    setStatusMessage('Searching for OBD Devices...');
    setIsScanning(true);
    setDevices([]);

    try {
      // Request Bluetooth permissions
      const hasPermission = await BluetoothService.requestPermissions();
      if (!hasPermission) {
        setFlowState('error');
        setErrorMessage('Bluetooth permissions are required to connect to your OBD adapter.');
        setIsScanning(false);
        loadingRef.current = false;
        return;
      }

      // Check Bluetooth is enabled
      const btEnabled = await BluetoothService.isBluetoothEnabled();
      if (!btEnabled) {
        setFlowState('error');
        setErrorMessage('Please turn on Bluetooth to scan for OBD devices.');
        setIsScanning(false);
        loadingRef.current = false;
        return;
      }

      // Get already-paired devices first (instant)
      const paired = await BluetoothService.getPairedDevices();
      const obdDevices = paired.filter(d => {
        const name = (d.name || '').toLowerCase();
        // Common ELM327/OBD adapter names
        return name.includes('obd') || name.includes('elm') || name.includes('vlink') ||
               name.includes('obdii') || name.includes('scan') || name.includes('auto');
      });

      if (obdDevices.length > 0) {
        // Show paired OBD devices immediately
        setDevices(obdDevices);
        setStatusMessage(`Found ${obdDevices.length} paired device(s)`);
      }

      // Also run discovery for unpaired devices
      setStatusMessage(obdDevices.length > 0 ? 'Scanning for more devices...' : 'Scanning for devices...');
      
      const allFound = [...obdDevices];
      const discovered = await BluetoothService.startDiscovery((device) => {
        // Add newly discovered devices that aren't already in the list
        if (device && !allFound.find(d => d.address === device.address)) {
          allFound.push(device);
          setDevices([...allFound]);
        }
      });

      // Merge any remaining discovered devices
      if (discovered && discovered.length > 0) {
        for (const d of discovered) {
          if (!allFound.find(existing => existing.address === d.address)) {
            allFound.push(d);
          }
        }
        setDevices([...allFound]);
      }

      if (allFound.length === 0) {
        setStatusMessage('No OBD devices found');
      } else {
        setStatusMessage(`Found ${allFound.length} device(s)`);
      }

      setIsScanning(false);
      loadingRef.current = false;
    } catch (err) {
      console.error('[VehicleCheck] Device scan error:', err);
      setIsScanning(false);
      loadingRef.current = false;
      setFlowState('error');
      setErrorMessage(err.message || 'Failed to scan for Bluetooth devices');
    }
  };



  /**
   * Connect to a real Bluetooth OBD device and initialize ELM327.
   */
  const connectToDevice = async (device) => {
    setFlowState('connecting');
    setStatusMessage(`Connecting to ${device.name || 'OBD Device'}...`);
    setIsScanning(false);

    try {
      // Stop any ongoing discovery
      await BluetoothService.stopDiscovery();

      // Connect via Bluetooth Classic (RFCOMM/SPP)
      await BluetoothService.connect(device);
      setStatusMessage('Initializing OBD Protocol...');

      // Initialize ELM327 (ATE0, ATSP0)
      await BluetoothService.initializeOBD();
      setStatusMessage('Connection Secured');

      // Short pause to let the UI show the success state
      await new Promise(r => setTimeout(r, 500));

      // Proceed to VIN detection
      await detectVIN();
    } catch (err) {
      console.error('[VehicleCheck] Connection error:', err);
      setFlowState('error');
      setErrorMessage(
        err.message?.includes('not enabled')
          ? 'Please turn on Bluetooth and try again.'
          : err.message?.includes('permissions')
          ? 'Bluetooth permissions are required.'
          : `Connection failed: ${err.message || 'Device not responding'}`
      );
    }
  };

  /**
   * Detect VIN from OBD device
   */
  const detectVIN = async () => {
    setFlowState('detecting_vin');
    setStatusMessage('Detecting vehicle...');
    setErrorMessage(null);

    try {
      const { vin, model } = await detectVehicleInfo();

      if (!vin) {
        // Auto-detection failed, switch to manual entry
        setFlowState('manual_entry');
        setStatusMessage('Manual VIN Entry Required');
        return;
      }

      setDetectedVIN(vin);
      setDetectedModel(model);

      // Automatically proceed to registration
      await registerVehicle(vin, model);
    } catch (err) {
      console.error('VIN detection error:', err);
      // On detection error, also allow manual entry
      setFlowState('manual_entry');
      setStatusMessage('Manual VIN Entry Required');
    }
  };

  /**
   * Register vehicle with backend
   */
  const registerVehicle = async (vin, model = null) => {
    setFlowState('registering');
    setStatusMessage('Registering vehicle...');
    setErrorMessage(null);

    try {
      const result = await identifyVehicle(vin, model);

      if (result.success) {
        setFlowState('success');
        setStatusMessage(result.isNew ? 'Vehicle registered!' : 'Welcome back!');

        // Start WebSocket + telemetry streaming immediately
        try {
          const token = await getToken();
          if (token && BACKEND_URL) {
            OBDConnectionManager.start(token, BACKEND_URL);
            console.log('[VehicleCheck] OBD streaming started after registration');
          }
        } catch (wsErr) {
          console.warn('[VehicleCheck] Failed to start OBD streaming:', wsErr);
        }
        
        // Close modal after short delay
        setTimeout(() => {
          onComplete?.();
        }, 1500);
      } else {
        setFlowState('error');
        setErrorMessage(result.error || 'Failed to register vehicle');
        setStatusMessage('Registration failed');
      }
    } catch (err) {
      console.error('Vehicle registration error:', err);
      setFlowState('error');
      setErrorMessage('Failed to register vehicle');
      setStatusMessage('Please try again');
    }
  };

  /**
   * Handle manual VIN submission
   */
  const handleManualSubmit = () => {
    if (manualVIN.length !== 17) {
      setErrorMessage('VIN must be exactly 17 characters');
      return;
    }
    setDetectedVIN(manualVIN.toUpperCase());
    registerVehicle(manualVIN.toUpperCase());
  };

  /**
   * Retry the current step
   */
  const handleRetry = () => {
    if (flowState === 'error') {
      // Restart from device scanning
      loadDevices();
    }
  };

  /**
   * Get icon and color for current state
   */
  const getStateIcon = () => {
    switch (flowState) {
      case 'scanning':
      case 'connecting':
      case 'detecting_vin':
      case 'registering':
        return { name: 'sync', color: '#6366f1' };
      case 'manual_entry':
        return { name: 'create', color: '#6366f1' };
      case 'error':
        return { name: 'warning', color: '#ef4444' };
      case 'success':
        return { name: 'checkmark-circle', color: '#10b981' };
      default:
        return { name: 'information-circle', color: '#64748b' };
    }
  };

  const stateIcon = getStateIcon();
  const isLoading = ['detecting_vin', 'registering'].includes(flowState);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        // Prevent closing - this is a blocking modal
      }}
    >
      <View style={styles.modalBackdrop}>
        {/* Background gradient */}
        <LinearGradient
          colors={['#1e293b', '#0f172a', '#0f172a']}
          style={StyleSheet.absoluteFill}
        />

        {/* Content */}
        <Animated.View
          entering={FadeIn.duration(500)}
          style={styles.contentContainer}
        >
          {/* Card */}
          <Animated.View
            entering={FadeInDown.duration(600).springify()}
            style={styles.card}
          >
            {/* Icon */}
            <Animated.View entering={ZoomIn.duration(600).delay(200)}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[stateIcon.color, `${stateIcon.color}dd`]}
                  style={styles.iconGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator size="large" color="#ffffff" />
                  ) : (
                    <Ionicons name={stateIcon.name} size={56} color="#ffffff" />
                  )}
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Status message */}
            <Text style={styles.statusMessage}>{statusMessage}</Text>

            {/* Device List (Scanning) */}
            {flowState === 'scanning' && (
              <Animated.View entering={FadeInDown} style={styles.deviceListContainer}>
                {devices.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    {isScanning ? (
                      <>
                        <ActivityIndicator size="small" color="#94a3b8" />
                        <Text style={styles.emptyText}>Looking for devices...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="bluetooth-outline" size={24} color="#94a3b8" />
                        <Text style={styles.emptyText}>No devices found</Text>
                        <TouchableOpacity onPress={() => loadDevices()} style={{ marginTop: 8 }}>
                          <Text style={{ color: '#6366f1', fontWeight: '600', fontSize: 14 }}>Scan Again</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ) : (
                  <>
                    {devices.map((device) => (
                      <TouchableOpacity
                        key={device.address || device.id || device.name}
                        style={styles.deviceItem}
                        onPress={() => connectToDevice(device)}
                      >
                        <View style={styles.deviceInfo}>
                          <Ionicons name="bluetooth" size={20} color="#6366f1" />
                          <View>
                            <Text style={styles.deviceName}>{device.name || 'Unknown Device'}</Text>
                            <Text style={{ color: '#64748b', fontSize: 11 }}>{device.address}</Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#475569" />
                      </TouchableOpacity>
                    ))}
                    {!isScanning && (
                      <TouchableOpacity onPress={() => loadDevices()} style={{ alignSelf: 'center', padding: 8, marginTop: 4 }}>
                        <Text style={{ color: '#6366f1', fontWeight: '600', fontSize: 13 }}>Scan Again</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </Animated.View>
            )}

            {/* Manual VIN Input */}
            {flowState === 'manual_entry' && (
              <Animated.View 
                entering={FadeInDown.duration(400)}
                style={styles.manualEntryContainer}
              >
                <TextInput
                  style={styles.vinInput}
                  placeholder="Enter 17-char VIN"
                  placeholderTextColor="#94a3b8"
                  value={manualVIN}
                  onChangeText={(text) => {
                    setManualVIN(text.toUpperCase());
                    if (errorMessage) setErrorMessage(null);
                  }}
                  maxLength={17}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleManualSubmit}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#6366f1', '#8b5cf6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.submitButtonGradient}
                  >
                    <Text style={styles.submitButtonText}>Register Vehicle</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => loadDevices()}
                  style={styles.retryDetectionButton}
                >
                  <Text style={styles.retryDetectionText}>Retry Detection</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* VIN display (when detected/entered) */}
            {(detectedVIN && flowState !== 'manual_entry') && (
              <View style={styles.vinContainer}>
                <Text style={styles.vinLabel}>VIN Detected</Text>
                <Text style={styles.vinText}>{detectedVIN}</Text>
              </View>
            )}

            {/* Error message */}
            {errorMessage && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Retry button */}
            {flowState === 'error' && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.retryButtonGradient}
                >
                  <Ionicons name="refresh" size={20} color="#ffffff" />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Info text */}
            {flowState === 'scanning' && (
              <Text style={styles.infoText}>
                Make sure your OBD device is plugged in and Bluetooth is on
              </Text>
            )}
          </Animated.View>

          {/* Branding */}
          <Animated.View
            entering={FadeIn.duration(600).delay(400)}
            style={styles.brandingContainer}
          >
            <Ionicons name="sparkles-sharp" size={20} color="#6366f1" />
            <Text style={styles.brandingText}>AutoVitals</Text>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  contentContainer: {
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  statusMessage: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 16,
  },
  vinContainer: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  vinLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
    textAlign: 'center',
  },
  vinText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366f1',
    textAlign: 'center',
    letterSpacing: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
    flex: 1,
  },
  retryButton: {
    width: '100%',
    marginTop: 8,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  infoText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  brandingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  // ── Bluetooth Scanning ──
  deviceListContainer: {
    width: '100%',
    maxHeight: 200,
    marginTop: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 16,
    padding: 8,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceName: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  // ── Manual Entry ──
  manualEntryContainer: {
    width: '100%',
    marginTop: 8,
    gap: 16,
  },
  vinInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 1,
  },
  submitButton: {
    width: '100%',
  },
  submitButtonGradient: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  retryDetectionButton: {
    alignSelf: 'center',
    padding: 8,
  },
  retryDetectionText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
