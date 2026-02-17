import { useAuth } from '@clerk/clerk-expo';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

/**
 * Custom hook for vehicle session management
 * Handles all vehicle-related API calls with authentication
 */
export const useVehicleSession = () => {
  const { getToken } = useAuth();

  /**
   * Check if user has an active vehicle session
   * @returns {Promise<{exists: boolean, vehicle: object|null, error: string|null}>}
   */
  const checkCurrentVehicle = async () => {
    try {
      const token = await getToken();
      
      console.log('📡 Calling GET /vehicle/current...');
      
      const response = await fetch(`${BACKEND_URL}/vehicle/current`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const vehicle = await response.json();
        console.log('✅ Vehicle data received:', vehicle);
        return { exists: true, vehicle, error: null };
      }

      if (response.status === 404) {
        // No active session - this is expected for new users
        console.log('ℹ️ No active vehicle session (404)');
        return { exists: false, vehicle: null, error: null };
      }

      if (response.status === 401) {
        console.warn('⚠️ Unauthorized (401)');
        return { exists: false, vehicle: null, error: 'unauthorized' };
      }

      // Other errors
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ API Error:', response.status, errorData);
      return { 
        exists: false, 
        vehicle: null, 
        error: errorData.detail || 'Failed to check vehicle session' 
      };
    } catch (err) {
      console.error('❌ Network error:', err);
      return { 
        exists: false, 
        vehicle: null, 
        error: 'Network error. Please check your connection.' 
      };
    }
  };

  /**
   * Identify/register a vehicle by VIN
   * @param {string} vin - 17-character VIN
   * @param {string|null} model - Optional vehicle model
   * @returns {Promise<{success: boolean, vehicle: object|null, isNew: boolean, error: string|null}>}
   */
  const identifyVehicle = async (vin, model = null) => {
    try {
      const token = await getToken();
      
      const body = { vin };
      if (model) {
        body.model = model;
      }

      const response = await fetch(`${BACKEND_URL}/vehicle/identify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          vehicle: data,
          isNew: data.is_new,
          error: null,
        };
      }

      if (response.status === 401) {
        return { 
          success: false, 
          vehicle: null, 
          isNew: false, 
          error: 'unauthorized' 
        };
      }

      if (response.status === 403) {
        return { 
          success: false, 
          vehicle: null, 
          isNew: false, 
          error: 'This vehicle is registered to another account' 
        };
      }

      if (response.status === 422) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          vehicle: null, 
          isNew: false, 
          error: errorData.detail || 'Invalid VIN format' 
        };
      }

      // Other errors
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        vehicle: null, 
        isNew: false, 
        error: errorData.detail || 'Failed to identify vehicle' 
      };
    } catch (err) {
      console.error('Identify vehicle error:', err);
      return { 
        success: false, 
        vehicle: null, 
        isNew: false, 
        error: 'Network error. Please check your connection.' 
      };
    }
  };

  /**
   * List all vehicles owned by the user
   * @returns {Promise<{success: boolean, vehicles: array, error: string|null}>}
   */
  const listVehicles = async () => {
    try {
      const token = await getToken();
      
      const response = await fetch(`${BACKEND_URL}/vehicle/list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          vehicles: data.vehicles || [],
          error: null,
        };
      }

      if (response.status === 401) {
        return { success: false, vehicles: [], error: 'unauthorized' };
      }

      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        vehicles: [], 
        error: errorData.detail || 'Failed to fetch vehicles' 
      };
    } catch (err) {
      console.error('List vehicles error:', err);
      return { 
        success: false, 
        vehicles: [], 
        error: 'Network error. Please check your connection.' 
      };
    }
  };

  /**
   * Switch to a different vehicle
   * @param {string} vehicleId - ID of vehicle to switch to
   * @returns {Promise<{success: boolean, vehicleId: string|null, error: string|null}>}
   */
  const switchVehicle = async (vehicleId) => {
    try {
      const token = await getToken();
      
      const response = await fetch(`${BACKEND_URL}/vehicle/switch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vehicle_id: vehicleId }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          vehicleId: data.vehicle_id,
          error: null,
        };
      }

      if (response.status === 401) {
        return { success: false, vehicleId: null, error: 'unauthorized' };
      }

      if (response.status === 404) {
        return { 
          success: false, 
          vehicleId: null, 
          error: 'Vehicle not found or does not belong to you' 
        };
      }

      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        vehicleId: null, 
        error: errorData.detail || 'Failed to switch vehicle' 
      };
    } catch (err) {
      console.error('Switch vehicle error:', err);
      return { 
        success: false, 
        vehicleId: null, 
        error: 'Network error. Please check your connection.' 
      };
    }
  };

  return {
    checkCurrentVehicle,
    identifyVehicle,
    listVehicles,
    switchVehicle,
  };
};
