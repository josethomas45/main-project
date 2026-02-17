import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useVehicleSession } from '../hooks/useVehicleSession';

const VehicleContext = createContext(null);

/**
 * Vehicle Provider Component
 * Manages global vehicle state and provides methods to interact with vehicle data
 */
export const VehicleProvider = ({ children }) => {
  const { isSignedIn } = useAuth();
  const vehicleSession = useVehicleSession();

  const [currentVehicle, setCurrentVehicle] = useState(null);
  const [isCheckingVehicle, setIsCheckingVehicle] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Check for existing vehicle session on mount and when auth state changes
   */
  useEffect(() => {
    if (isSignedIn) {
      checkCurrentVehicle();
    } else {
      // Clear vehicle state when signed out
      setCurrentVehicle(null);
      setError(null);
    }
  }, [isSignedIn]);

  /**
   * Check if user has an active vehicle session
   */
  const checkCurrentVehicle = async () => {
    setIsCheckingVehicle(true);
    setError(null);

    try {
      const result = await vehicleSession.checkCurrentVehicle();

      console.log('🚗 Vehicle check result:', result);

      if (result.error === 'unauthorized') {
        // Handle unauthorized - user will be redirected to login by Clerk
        setCurrentVehicle(null);
        setError('Session expired. Please login again.');
        setIsCheckingVehicle(false);
        return result;
      }

      if (result.error) {
        console.warn('Vehicle check error:', result.error);
        setError(result.error);
        setCurrentVehicle(null);
        setIsCheckingVehicle(false);
        return result;
      }

      if (result.exists && result.vehicle) {
        console.log('✅ Vehicle found:', result.vehicle);
        setCurrentVehicle(result.vehicle);
        setError(null);
      } else {
        console.log('❌ No vehicle found');
        setCurrentVehicle(null);
      }
      
      setIsCheckingVehicle(false);
      return result;
    } catch (err) {
      console.error('❌ Error checking vehicle:', err);
      setError('Failed to check vehicle session');
      setCurrentVehicle(null);
      setIsCheckingVehicle(false);
      return { exists: false, vehicle: null, error: err.message };
    }
  };

  /**
   * Identify/register a vehicle
   * @param {string} vin - Vehicle VIN
   * @param {string|null} model - Optional vehicle model
   */
  const identifyVehicle = async (vin, model = null) => {
    setIsCheckingVehicle(true);
    setError(null);

    try {
      const result = await vehicleSession.identifyVehicle(vin, model);

      if (result.error === 'unauthorized') {
        setError('Session expired. Please login again.');
        setCurrentVehicle(null);
        return { success: false, error: result.error };
      }

      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }

      if (result.success && result.vehicle) {
        setCurrentVehicle(result.vehicle);
        setError(null);
        return { 
          success: true, 
          vehicle: result.vehicle,
          isNew: result.isNew 
        };
      }

      return { success: false, error: 'Unknown error occurred' };
    } catch (err) {
      console.error('Error identifying vehicle:', err);
      const errorMsg = 'Failed to identify vehicle';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsCheckingVehicle(false);
    }
  };

  /**
   * Refresh current vehicle data
   */
  const refreshVehicle = async () => {
    await checkCurrentVehicle();
  };

  /**
   * Clear vehicle state (e.g., on logout)
   */
  const clearVehicle = () => {
    setCurrentVehicle(null);
    setError(null);
    setIsCheckingVehicle(false);
  };

  /**
   * Switch to a different vehicle
   * @param {string} vehicleId - ID of vehicle to switch to
   */
  const switchVehicle = async (vehicleId) => {
    setIsCheckingVehicle(true);
    setError(null);

    try {
      const result = await vehicleSession.switchVehicle(vehicleId);

      if (result.error === 'unauthorized') {
        setError('Session expired. Please login again.');
        return { success: false, error: result.error };
      }

      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }

      if (result.success) {
        // Refresh vehicle data after successful switch
        await checkCurrentVehicle();
        return { success: true };
      }

      return { success: false, error: 'Unknown error occurred' };
    } catch (err) {
      console.error('Error switching vehicle:', err);
      const errorMsg = 'Failed to switch vehicle';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsCheckingVehicle(false);
    }
  };

  /**
   * List all vehicles owned by the user
   */
  const listVehicles = async () => {
    try {
      const result = await vehicleSession.listVehicles();
      return result;
    } catch (err) {
      console.error('Error listing vehicles:', err);
      return { success: false, vehicles: [], error: 'Failed to list vehicles' };
    }
  };

  const value = {
    currentVehicle,
    isCheckingVehicle,
    error,
    checkCurrentVehicle,
    identifyVehicle,
    refreshVehicle,
    clearVehicle,
    switchVehicle,
    listVehicles,
  };

  return (
    <VehicleContext.Provider value={value}>
      {children}
    </VehicleContext.Provider>
  );
};

/**
 * Custom hook to access vehicle context
 */
export const useVehicle = () => {
  const context = useContext(VehicleContext);
  
  if (!context) {
    throw new Error('useVehicle must be used within a VehicleProvider');
  }
  
  return context;
};
