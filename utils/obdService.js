/**
 * OBD Service Layer
 * 
 * This service provides an abstraction layer for OBD device communication.
 * Current implementation uses mock functions for development/testing.
 * 
 * TODO: Replace mock functions with real OBD SDK integration when hardware is available.
 */

/**
 * Simulates checking if an OBD device is connected
 * @returns {Promise<boolean>} True if OBD device is connected
 */
export const checkOBDConnection = async () => {
  // SIMULATION REMOVED: Hardware communication delay
  // await delay(1500);
  
  // TODO: Replace with real OBD SDK call
  // Example: return await OBD.isConnected();
  
  // For now, return true immediately to allow flow to proceed
  return true;
};

/**
 * Simulates detecting VIN from OBD device
 * @returns {Promise<string>} The detected VIN number
 */
export const detectVIN = async () => {
  // SIMULATION REMOVED: VIN detection delay
  // await delay(2000);
  
  // TODO: Replace with real OBD SDK call
  // Example: return await OBD.readVIN();
  
  // For now, return a placeholder or wait for real input
  // The backend will now handle the real data stream via WebSocket
  return 'PENDING_REAL_VIN';
  
  /* 
  const mockVINs = [
    '1rGBH41JXMN109186', // Honda
    '1FTFW1ET5EFA12345', // Ford
    '6YJSA1E26HF000001', // Tesla
  ];
  
  const randomVIN = mockVINs[Math.floor(Math.random() * mockVINs.length)];
  return randomVIN;
  */
};

/**
 * Simulates detecting vehicle model from OBD device
 * @returns {Promise<string|null>} The detected model name, or null if not available
 */
export const detectModel = async () => {
  // SIMULATION REMOVED: Model detection delay
  // await delay(1500);
  
  // TODO: Replace with real OBD SDK call
  // Example: return await OBD.readModel();
  
  // For now, return null (model is optional)
  return null;
};

/**
 * Attempts to detect both VIN and model simultaneously
 * @returns {Promise<{vin: string, model: string|null}>}
 */
export const detectVehicleInfo = async () => {
  // Run VIN and model detection in parallel
  const [vin, model] = await Promise.all([
    detectVIN(),
    detectModel(),
  ]);
  
  return { vin, model };
};

/**
 * Helper function to simulate delays
 * @param {number} ms Milliseconds to delay
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
