/**
 * obdService.js — Production OBD Service
 *
 * Communicates with a real ELM327 OBD-II adapter over Bluetooth Classic
 * using BluetoothService for all command I/O.
 *
 * All functions send standard OBD-II AT/Mode commands and parse real
 * ELM327 responses. No simulated or demo data.
 */
import BluetoothService from './BluetoothService';

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Strip whitespace, echoed command, and ELM327 noise from a raw response.
 */
function cleanResponse(raw) {
  if (!raw) return '';
  return raw
    .replace(/\r/g, '')
    .replace(/\n/g, ' ')
    .replace(/SEARCHING\.\.\./g, '')
    .replace(/>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse hex bytes from an ELM327 response string.
 * Strips header bytes (first 2-3 bytes per line for multi-line responses).
 */
function hexToBytes(hexStr) {
  const parts = hexStr.split(' ').filter(p => /^[0-9A-Fa-f]{2}$/.test(p));
  return parts.map(p => parseInt(p, 16));
}

// ──────────────────────────────────────────────────────────────────────
// Connection Check
// ──────────────────────────────────────────────────────────────────────

/**
 * Check if an OBD ELM327 device is currently connected via Bluetooth.
 * @returns {Promise<boolean>}
 */
export const checkOBDConnection = async () => {
  try {
    return await BluetoothService.isConnected();
  } catch (err) {
    console.warn('[OBD] Connection check failed:', err.message);
    return false;
  }
};

// ──────────────────────────────────────────────────────────────────────
// VIN Detection  (Mode 09 PID 02)
// ──────────────────────────────────────────────────────────────────────

/**
 * Read the Vehicle Identification Number from the ECU.
 * Sends OBD-II Mode 09 PID 02 (`0902`).
 *
 * The response is multi-line hex. We strip the header bytes from each
 * line and convert the remaining data bytes to ASCII.
 *
 * @returns {Promise<string|null>} 17-character VIN, or null if it could not be read
 */
export const detectVIN = async () => {
  try {
    console.log('[OBD] Reading VIN (0902)...');
    const raw = await BluetoothService.sendCommandWithResponse('0902', 8000);
    const cleaned = cleanResponse(raw);
    console.log('[OBD] VIN raw response:', cleaned);

    if (!cleaned || cleaned.includes('NO DATA') || cleaned.includes('ERROR') || cleaned.includes('UNABLE TO CONNECT')) {
      console.warn('[OBD] VIN not available from ECU');
      return null;
    }

    // Parse the multi-line response
    // Typical format: "49 02 01 XX XX XX XX\r49 02 02 XX XX XX XX\r..."
    // Strip the first 3 header bytes from each frame (49 02 NN)
    const lines = cleaned.split(/49\s*02\s*\d{2}/i).filter(Boolean);
    let dataHex = lines.join(' ');

    // Or fallback: just grab all hex pairs after stripping known headers
    if (!dataHex.trim()) {
      dataHex = cleaned.replace(/49\s*02\s*\d{2}/gi, '');
    }

    const bytes = hexToBytes(dataHex);

    // First byte is often 0x01 (number of data items) — skip it if present
    const startIdx = bytes[0] <= 0x05 ? 1 : 0;
    const vinBytes = bytes.slice(startIdx);

    // Convert to ASCII
    const vin = vinBytes
      .filter(b => b >= 0x20 && b <= 0x7E) // printable ASCII only
      .map(b => String.fromCharCode(b))
      .join('');

    if (vin.length >= 17) {
      const finalVin = vin.substring(0, 17);
      console.log('[OBD] ✅ VIN detected:', finalVin);
      return finalVin;
    }

    console.warn('[OBD] VIN too short:', vin, `(${vin.length} chars)`);
    return vin.length > 0 ? vin : null;
  } catch (err) {
    console.error('[OBD] VIN detection error:', err);
    return null;
  }
};

/**
 * Detect vehicle info (VIN). Model is decoded by the backend, not the adapter.
 * @returns {Promise<{vin: string|null, model: string|null}>}
 */
export const detectVehicleInfo = async () => {
  const vin = await detectVIN();
  return { vin, model: null };
};

// ──────────────────────────────────────────────────────────────────────
// DTC Reading  (Mode 03)
// ──────────────────────────────────────────────────────────────────────

/**
 * DTC first-nibble-to-letter mapping.
 */
const DTC_PREFIXES = {
  0: 'P0', 1: 'P1', 2: 'P2', 3: 'P3',
  4: 'C0', 5: 'C1', 6: 'C2', 7: 'C3',
  8: 'B0', 9: 'B1', 10: 'B2', 11: 'B3',
  12: 'U0', 13: 'U1', 14: 'U2', 15: 'U3',
};

/**
 * Parse a 2-byte DTC pair into a standard 5-character code.
 * E.g. bytes [0x03, 0x01] → "P0301"
 */
function parseDTCCode(byte1, byte2) {
  const firstNibble = (byte1 >> 4) & 0x0F;
  const prefix = DTC_PREFIXES[firstNibble] || 'P0';
  const secondNibble = byte1 & 0x0F;
  const hex2 = byte2.toString(16).padStart(2, '0').toUpperCase();
  return `${prefix}${secondNibble.toString(16).toUpperCase()}${hex2}`;
}

/**
 * Read Diagnostic Trouble Codes from the ECU.
 * Sends OBD-II Mode 03.
 *
 * @returns {Promise<Array<{code: string}>>} Array of DTC objects
 */
export const readDTCs = async () => {
  try {
    console.log('[OBD] Reading DTCs (Mode 03)...');
    const raw = await BluetoothService.sendCommandWithResponse('03', 8000);
    const cleaned = cleanResponse(raw);
    console.log('[OBD] DTC raw response:', cleaned);

    if (!cleaned || cleaned.includes('NO DATA') || cleaned.includes('ERROR')) {
      console.log('[OBD] No DTCs found');
      return [];
    }

    // Strip the Mode 03 response header (43 = response to Mode 03)
    // Format: "43 XX XX YY YY ZZ ZZ ..." where each XX XX is a DTC
    const stripped = cleaned.replace(/43/g, ' ').trim();
    const bytes = hexToBytes(stripped);

    const dtcs = [];
    for (let i = 0; i < bytes.length - 1; i += 2) {
      const b1 = bytes[i];
      const b2 = bytes[i + 1];

      // 00 00 means no DTC in this slot
      if (b1 === 0 && b2 === 0) continue;

      const code = parseDTCCode(b1, b2);
      dtcs.push({ code });
    }

    console.log(`[OBD] ✅ Found ${dtcs.length} DTC(s):`, dtcs.map(d => d.code));
    return dtcs;
  } catch (err) {
    console.error('[OBD] DTC read error:', err);
    return [];
  }
};

/**
 * Clear all DTCs and reset the MIL (check engine light).
 * Sends OBD-II Mode 04.
 */
export const clearDTCs = async () => {
  try {
    console.log('[OBD] Clearing DTCs (Mode 04)...');
    const raw = await BluetoothService.sendCommandWithResponse('04', 5000);
    const cleaned = cleanResponse(raw);
    console.log('[OBD] Clear DTCs response:', cleaned);
    return !cleaned.includes('ERROR');
  } catch (err) {
    console.error('[OBD] Clear DTCs error:', err);
    return false;
  }
};

// ──────────────────────────────────────────────────────────────────────
// Telemetry Polling  (Mode 01 PIDs)
// ──────────────────────────────────────────────────────────────────────

/**
 * Standard OBD-II PID definitions for telemetry.
 * Each entry: { pid, key, parse(bytes) }
 */
const TELEMETRY_PIDS = [
  {
    pid: '010C', key: 'rpm',
    parse: (bytes) => bytes.length >= 2 ? ((bytes[0] * 256) + bytes[1]) / 4 : 0,
  },
  {
    pid: '010D', key: 'speed',
    parse: (bytes) => bytes.length >= 1 ? bytes[0] : 0,
  },
  {
    pid: '0105', key: 'coolant_temp',
    parse: (bytes) => bytes.length >= 1 ? bytes[0] - 40 : 0,
  },
  {
    pid: '0104', key: 'engine_load',
    parse: (bytes) => bytes.length >= 1 ? (bytes[0] * 100) / 255 : 0,
  },
  {
    pid: '012F', key: 'fuel_level',
    parse: (bytes) => bytes.length >= 1 ? (bytes[0] * 100) / 255 : 0,
  },
  {
    pid: '0142', key: 'control_module_voltage',
    parse: (bytes) => bytes.length >= 2 ? ((bytes[0] * 256) + bytes[1]) / 1000 : 0,
  },
];

/**
 * Read a single Mode 01 PID and return the parsed value.
 * @param {{pid: string, key: string, parse: Function}} pidDef
 * @returns {Promise<{key: string, value: number}|null>}
 */
async function readPID(pidDef) {
  try {
    const raw = await BluetoothService.sendCommandWithResponse(pidDef.pid, 4000);
    const cleaned = cleanResponse(raw);

    if (!cleaned || cleaned.includes('NO DATA') || cleaned.includes('ERROR')) {
      return null;
    }

    // Response format: "41 XX AA BB ..." — strip the "41 XX" header (2 bytes)
    const responseParts = cleaned.split(' ').filter(p => /^[0-9A-Fa-f]{2}$/.test(p));

    // Skip first 2 bytes (41 + PID echo)
    const dataBytes = responseParts.slice(2).map(p => parseInt(p, 16));
    const value = pidDef.parse(dataBytes);

    return { key: pidDef.key, value };
  } catch (err) {
    console.warn(`[OBD] PID ${pidDef.pid} read failed:`, err.message);
    return null;
  }
}

/**
 * Start the real telemetry polling loop.
 * Reads all configured PIDs every 5 seconds and sends parsed data
 * through the WebSocket connection to the backend.
 *
 * @param {WebSocket} ws - The active WebSocket connection
 * @returns {() => void} Cleanup function to stop the loop
 */
export const startTelemetryLoop = (ws) => {
  console.log('[OBD] Starting real telemetry loop (5s interval)...');
  let running = true;

  const poll = async () => {
    while (running) {
      // Only poll if BT is connected and WS is open
      const btConnected = await BluetoothService.isConnected().catch(() => false);
      if (!btConnected) {
        console.warn('[OBD] Bluetooth disconnected, pausing telemetry...');
        await delay(5000);
        continue;
      }

      if (ws && ws.readyState === 1) {
        const telemetryData = {};

        for (const pidDef of TELEMETRY_PIDS) {
          if (!running) break;

          const result = await readPID(pidDef);
          if (result) {
            telemetryData[result.key] = result.value;
          }

          // Small delay between PID reads to avoid overwhelming the adapter
          await delay(200);
        }

        // Send to backend if we got any data
        if (Object.keys(telemetryData).length > 0) {
          try {
            ws.send(JSON.stringify({
              type: 'obd_telemetry',
              data: telemetryData,
              timestamp: new Date().toISOString(),
            }));
            console.log('[OBD] Telemetry sent:', Object.keys(telemetryData).join(', '));
          } catch (err) {
            console.warn('[OBD] Failed to send telemetry:', err.message);
          }
        }
      }

      // Wait before next polling cycle
      await delay(5000);
    }
  };

  poll();

  return () => {
    console.log('[OBD] Telemetry loop stopped via cleanup');
    running = false;
  };
};

/**
 * Legacy — no longer needed (manager handles cleanup).
 */
export const stopTelemetryLoop = () => {
  console.log('[OBD] stopTelemetryLoop called (manager should handle cleanup)');
};

/**
 * Register the Bluetooth bridge — sets up a permanent data callback
 * on BluetoothService that forwards raw OBD data to the WebSocket.
 *
 * @param {WebSocket} ws - The active WebSocket connection
 */
export const registerBluetoothBridge = (ws) => {
  if (!ws) {
    console.warn('[OBD] Cannot register bridge — no WebSocket');
    return;
  }

  console.log('[OBD] Registering Bluetooth → WebSocket bridge');

  BluetoothService.setDataCallback((rawData) => {
    if (ws.readyState === 1) {
      try {
        ws.send(JSON.stringify({
          type: 'obd_raw',
          data: rawData,
          timestamp: new Date().toISOString(),
        }));
      } catch (err) {
        console.warn('[OBD] Bridge send failed:', err.message);
      }
    }
  });
};
