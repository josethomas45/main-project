import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
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

/**
 * VehicleCheckModal Component
 * 
 * Blocking modal that guides users through vehicle registration flow:
 * 1. Check for existing vehicle session
 * 2. Check OBD connection
 * 3. Detect VIN
 * 4. Register vehicle with backend
 */
export default function VehicleCheckModal({ visible, onComplete }) {
  const { checkCurrentVehicle, identifyVehicle } = useVehicle();

  // Flow states
  const [flowState, setFlowState] = useState('checking_session'); // checking_session, checking_obd, detecting_vin, registering, error, success
  const [statusMessage, setStatusMessage] = useState('Checking vehicle session...');
  const [errorMessage, setErrorMessage] = useState(null);
  const [detectedVIN, setDetectedVIN] = useState(null);
  const [detectedModel, setDetectedModel] = useState(null);

  useEffect(() => {
    if (visible) {
      startVehicleCheckFlow();
    }
  }, [visible]);

  /**
   * Start the complete vehicle check flow
   */
  const startVehicleCheckFlow = async () => {
    setFlowState('checking_session');
    setStatusMessage('Checking vehicle session...');
    setErrorMessage(null);

    // Step 1: Check if user already has an active vehicle session
    const result = await checkCurrentVehicle();
    
    // If vehicle exists, we're done
    if (result && result.currentVehicle) {
      setFlowState('success');
      setStatusMessage('Vehicle session found!');
      setTimeout(() => {
        onComplete?.();
      }, 1000);
      return;
    }

    // No session found, proceed to OBD detection
    await checkOBD();
  };

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

      // OBD connected, proceed to VIN detection
      await detectVIN();
    } catch (err) {
      console.error('OBD check error:', err);
      setFlowState('error');
      setErrorMessage('Failed to check OBD connection');
      setStatusMessage('Please try again');
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
        setFlowState('error');
        setErrorMessage('Failed to detect VIN');
        setStatusMessage('Please try again');
        return;
      }

      setDetectedVIN(vin);
      setDetectedModel(model);

      // Automatically proceed to registration
      await registerVehicle(vin, model);
    } catch (err) {
      console.error('VIN detection error:', err);
      setFlowState('error');
      setErrorMessage('Failed to detect vehicle');
      setStatusMessage('Please try again');
    }
  };

  /**
   * Register vehicle with backend
   */
  const registerVehicle = async (vin, model) => {
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
      case 'checking_session':
      case 'checking_obd':
      case 'detecting_vin':
      case 'registering':
        return { name: 'sync', color: '#6366f1' };
      case 'error':
        return { name: 'warning', color: '#ef4444' };
      case 'success':
        return { name: 'checkmark-circle', color: '#10b981' };
      default:
        return { name: 'information-circle', color: '#64748b' };
    }
  };

  const stateIcon = getStateIcon();
  const isLoading = ['checking_session', 'checking_obd', 'detecting_vin', 'registering'].includes(flowState);

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

            {/* VIN display (when detected) */}
            {detectedVIN && (
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
});
