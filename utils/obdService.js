import { getNextVIN } from './demoVins';

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
  return getNextVIN();
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
 * Simulates reading DTCs with data snapshots for demo mode
 */
export const readDTCs = async () => {
  await delay(1500);
  return [
    {
      id: 'dtc-123',
      code: 'P0301',
      metric: 'engine_misfire',
      message: 'Cylinder 1 Misfire Detected',
      severity: 'high',
      status: 'open',
      trigger_value: '15%',
      trigger_limit: '2%',
      created_at: new Date().toISOString(),
      snapshot: {
        rpm: 3200,
        speed: 45,
        coolant_temp: 98,
        engine_load: 85,
        fuel_trim: '+12%'
      }
    },
    {
      id: 'dtc-456',
      code: 'P0118',
      metric: 'coolant_temp',
      message: 'Engine Coolant Temperature Circuit High',
      severity: 'medium',
      status: 'open',
      trigger_value: '115°C',
      trigger_limit: '105°C',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      snapshot: {
        rpm: 2100,
        speed: 65,
        coolant_temp: 115,
        engine_load: 40,
        voltage: '13.2V'
      }
    }
  ];
};

/**
 * Simulates telemetry polling
 * Returns a cleanup function to stop the loop.
 */
export const startTelemetryLoop = (ws) => {
  console.log('[OBD] Starting simulated telemetry loop (5s interval)...');
  let running = true;
  
  const poll = async () => {
    while (running) {
      if (ws && ws.readyState === 1) {
        try {
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
        } catch (err) {
          console.warn('[OBD] Failed to send telemetry:', err.message);
        }
      }
      await delay(5000); // Increased to 5s to reduce JS thread load
    }
  };
  
  poll();
  return () => { 
    console.log('[OBD] Telemetry loop stopped via cleanup');
    running = false; 
  };
};

export const stopTelemetryLoop = () => {
  console.log('[OBD] stopTelemetryLoop called (manager should handle cleanup)');
};

export const registerBluetoothBridge = (ws) => {
  // No-op in simulation
};
