/**
 * OBD Service Layer
 * 
 * Provides an abstraction for OBD device communication, bridging Bluetooth
 * hardware data to the backend via WebSocket.
 */
import BluetoothService from './BluetoothService';

/**
 * Checks if an OBD device is currently connected via Bluetooth
 */
export const checkOBDConnection = async () => {
  return BluetoothService.connectedDevice !== null;
};

/**
 * Returns null to trigger manual VIN entry in the UI
 */
export const detectVIN = async () => {
  return null;
};

/**
 * Returns null as model detection is handled by backend or manual entry
 */
export const detectModel = async () => {
  return null;
};

/**
 * Detects both VIN and model (currently both null to force manual setup)
 */
export const detectVehicleInfo = async () => {
  return { vin: null, model: null };
};

/**
 * Bridge Bluetooth data to Backend WebSocket
 * This allows the backend to process raw ELM327 data in real-time.
 * 
 * @param {WebSocket} ws The active WebSocket connection to the backend
 */
export const registerBluetoothBridge = (ws) => {
  if (!ws) return;

  BluetoothService.setDataCallback((data) => {
    if (ws && ws.readyState === 1) { // WebSocket.OPEN
      try {
        ws.send(JSON.stringify({
          type: 'obd_raw',
          data: data
        }));
      } catch (err) {
        console.error('Failed to send OBD data over WS:', err);
      }
    }
  });
};
