import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { useVehicle } from '../contexts/VehicleContext';
import { checkOBDConnection, detectVehicleInfo } from '../utils/obdService';
import BluetoothService from '../utils/BluetoothService';

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

  // Flow states
  const [flowState, setFlowState] = useState('checking_obd'); // checking_obd, scanning, connecting, detecting_vin, manual_entry, registering, error, success
  const [statusMessage, setStatusMessage] = useState('Checking OBD connection...');
  const [errorMessage, setErrorMessage] = useState(null);
  const [detectedVIN, setDetectedVIN] = useState(null);
  const [detectedModel, setDetectedModel] = useState(null);
  const [manualVIN, setManualVIN] = useState('');
  const [devices, setDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset state and start OBD check
      setFlowState('checking_obd');
      setStatusMessage('Checking OBD connection...');
      setErrorMessage(null);
      setDetectedVIN(null);
      setDetectedModel(null);
      setManualVIN('');
      
      // Start OBD check after a brief delay to let animations settle
      setTimeout(() => {
        checkOBD();
      }, 500);
    }
  }, [visible]);

  /**
   * Check if OBD device is connected
   */
  const checkOBD = async () => {
    setFlowState('checking_obd');
    setStatusMessage('Checking OBD connection...');
    setErrorMessage(null);

    try {
      const isConnected = await checkOBDConnection();

      if (!isConnected) {
        setFlowState('error');
        setErrorMessage('OBD device not connected');
        setStatusMessage('Please connect your OBD device to continue');
        return;
      }

      // OBD connected (hardware bridge check), proceed to scanning
      await scanForDevices();
    } catch (err) {
      console.error('OBD check error:', err);
      setFlowState('error');
      setErrorMessage('Failed to check OBD connection');
      setStatusMessage('Please try again');
    }
  };

  /**
   * Scan for Bluetooth OBD devices
   */
  const scanForDevices = async () => {
    setFlowState('scanning');
    setStatusMessage('Scanning for OBD Devices...');
    setDevices([]);
    setIsScanning(true);
    setErrorMessage(null);

    try {
      await BluetoothService.startScan((device) => {
        setDevices(prev => {
          if (prev.find(d => d.id === device.id)) return prev;
          return [...prev, device];
        });
      });
    } catch (err) {
      console.error('Scan error:', err);
      setFlowState('error');
      setErrorMessage(err.message || 'Failed to scan for Bluetooth devices');
    }
  };

  /**
   * Connect to a specific device
   */
  const connectToDevice = async (device) => {
    setFlowState('connecting');
    setStatusMessage(`Connecting to ${device.name}...`);
    setIsScanning(false);
    BluetoothService.stopScan();

    try {
      await BluetoothService.connect(device);
      await BluetoothService.initializeOBD();
      
      // Successfully connected, proceed to VIN detection
      await detectVIN();
    } catch (err) {
      console.error('Connection error:', err);
      setFlowState('error');
      setErrorMessage(`Failed to connect to ${device.name}`);
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
      // Restart from OBD check
      checkOBD();
    }
  };

  /**
   * Get icon and color for current state
   */
  const getStateIcon = () => {
    switch (flowState) {
      case 'checking_obd':
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
  const isLoading = ['checking_obd', 'detecting_vin', 'registering'].includes(flowState);

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
                    <ActivityIndicator size="small" color="#94a3b8" />
                    <Text style={styles.emptyText}>Looking for devices...</Text>
                  </View>
                ) : (
                  devices.map((device) => (
                    <TouchableOpacity
                      key={device.id}
                      style={styles.deviceItem}
                      onPress={() => connectToDevice(device)}
                    >
                      <View style={styles.deviceInfo}>
                        <Ionicons name="bluetooth" size={20} color="#6366f1" />
                        <Text style={styles.deviceName}>{device.name}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#475569" />
                    </TouchableOpacity>
                  ))
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
                  onPress={() => checkOBD()}
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
            {flowState === 'checking_obd' && (
              <Text style={styles.infoText}>
                Make sure your OBD device is properly connected to the vehicle
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
