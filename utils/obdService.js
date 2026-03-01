/**
 * OBD Service Layer (Mock/Demo Implementation)
 * 
 * This service provides an abstraction layer for OBD device communication.
 * This implementation uses mock functions for demonstration purposes.
 */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Simulates checking if an OBD device is connected
 */
export const checkOBDConnection = async () => {
  await delay(1000);
  return true;
};

/**
 * Simulates detecting VIN from OBD device
 */
export const detectVIN = async () => {
  await delay(2000);
  const mockVINs = [
    '1HGBH41JXMN109186', // Honda
    '1FTFW1ET5EFA12345', // Ford
    '6YJSA1E26HF000001', // Tesla
  ];
  return mockVINs[Math.floor(Math.random() * mockVINs.length)];
};

/**
 * Simulates detecting vehicle model
 */
export const detectModel = async () => {
  await delay(1000);
  return 'Simulation Model';
};

/**
 * Simulates detecting vehicle info
 */
export const detectVehicleInfo = async () => {
  const [vin, model] = await Promise.all([detectVIN(), detectModel()]);
  return { vin, model };
};

/**
 * Simulates reading DTCs
 */
export const readDTCs = async () => {
  await delay(1500);
  return []; // No issues in demo mode by default
};

/**
 * Simulates telemetry polling
 */
export const startTelemetryLoop = (ws) => {
  console.log('[OBD] Starting simulated telemetry loop...');
  let running = true;
  
  const poll = async () => {
    while (running) {
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'obd_telemetry',
          data: {
            rpm: 2000 + Math.random() * 500,
            speed: 60 + Math.random() * 10,
            coolant_temp: 90,
            engine_load: 25,
          },
          timestamp: new Date().toISOString()
        }));
      }
      await delay(2000);
    }
  };
  
  poll();
  return () => { running = false; };
};

export const stopTelemetryLoop = () => {
  console.log('[OBD] Stopping simulated telemetry loop');
};

export const registerBluetoothBridge = (ws) => {
  // No-op in simulation
};
