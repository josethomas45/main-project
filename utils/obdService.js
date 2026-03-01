/**
 * OBD Service Layer
 * 
 * Provides VIN detection, DTC reading, live telemetry polling,
 * and WebSocket bridging for real-time vehicle diagnostics.
 */
import BluetoothService from './BluetoothService';

// ─── Connection Check ───────────────────────────────────────

export const checkOBDConnection = async () => {
  return await BluetoothService.isConnected();
};

// ─── VIN Detection (OBD Mode 09, PID 02) ────────────────────

/**
 * Read VIN from the ELM327 using OBD PID 09 02.
 * Response format: "49 02 01 XX XX XX XX XX ..." (hex ASCII)
 * 
 * @returns {string|null} 17-character VIN or null
 */
export const detectVIN = async () => {
  try {
    const connected = await BluetoothService.isConnected();
    if (!connected) {
      console.warn('[OBD] Cannot detect VIN — not connected');
      return null;
    }

    // Retry VIN up to 3 times — first attempt often fails on ELM327 clones
    const MAX_VIN_RETRIES = 3;
    let response = null;

    for (let attempt = 1; attempt <= MAX_VIN_RETRIES; attempt++) {
      console.log(`[OBD] Requesting VIN (09 02) attempt ${attempt}/${MAX_VIN_RETRIES}...`);

      // Verify still connected before each attempt
      const stillConn = await BluetoothService.isConnected();
      if (!stillConn) {
        console.warn('[OBD] Connection lost before VIN attempt', attempt);
        return null;
      }

      response = await BluetoothService.sendCommandWithResponse('09 02', 10000);

      if (response && !response.includes('NO DATA') && !response.includes('ERROR') && !response.includes('UNABLE')) {
        break; // Got a valid response
      }

      console.warn(`[OBD] VIN attempt ${attempt} returned:`, response);
      if (attempt < MAX_VIN_RETRIES) {
        await new Promise(r => setTimeout(r, 2000)); // Wait before retry
      }
    }

    if (!response || response.includes('NO DATA') || response.includes('ERROR') || response.includes('UNABLE')) {
      console.warn('[OBD] VIN failed after all retries:', response);
      return null;
    }

    const vin = parseVINResponse(response);
    console.log('[OBD] Detected VIN:', vin);
    return vin;
  } catch (err) {
    console.error('[OBD] VIN detection error:', err);
    return null;
  }
};

/**
 * Parse the ELM327 response for VIN (Mode 09 PID 02).
 * 
 * Handles both formats:
 *   With spaces: "49 02 01 57 46 30 58 58"
 *   Without spaces (ATS0): "490201574630585858"
 */
function parseVINResponse(response) {
  try {
    console.log('[OBD] Raw VIN response:', JSON.stringify(response));

    // Split into lines, filter out empty and non-data lines
    const lines = response
      .split(/[\r\n]+/)
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('SEARCHING') && !l.startsWith('0902'));

    let vinHex = [];

    for (const line of lines) {
      // Normalize: split into 2-char hex pairs
      let hexPairs;
      if (line.includes(' ')) {
        // Spaced format: "49 02 01 57 46 30"
        hexPairs = line.split(/\s+/).filter(p => /^[0-9A-Fa-f]{2}$/i.test(p));
      } else {
        // No-spaces format: "490201574630"
        hexPairs = [];
        const clean = line.replace(/[^0-9A-Fa-f]/g, '');
        for (let j = 0; j < clean.length; j += 2) {
          if (j + 2 <= clean.length) {
            hexPairs.push(clean.substring(j, j + 2));
          }
        }
      }

      if (hexPairs.length < 3) continue;

      // Check if line starts with "49 02" header
      if (hexPairs[0].toUpperCase() === '49' && hexPairs[1].toUpperCase() === '02') {
        // Skip header: 49, 02, and the sequence byte
        vinHex.push(...hexPairs.slice(3));
      } else {
        // No header, treat all as data
        vinHex.push(...hexPairs);
      }
    }

    // Convert hex to ASCII
    const vin = vinHex
      .map(h => {
        const code = parseInt(h, 16);
        return (code >= 32 && code <= 126) ? String.fromCharCode(code) : '';
      })
      .join('')
      .replace(/[^A-Z0-9]/gi, ''); // Keep only valid VIN chars

    console.log('[OBD] Parsed VIN hex:', vinHex.join(' '), '→', vin);

    if (vin.length >= 17) {
      return vin.substring(0, 17);
    }

    if (vin.length > 0) {
      console.warn('[OBD] VIN too short:', vin, `(${vin.length} chars, need 17)`);
      return vin; // Return partial VIN — let caller decide
    }

    return null;
  } catch (err) {
    console.error('[OBD] VIN parse error:', err);
    return null;
  }
}

/**
 * Returns null as model detection is handled by backend
 */
export const detectModel = async () => {
  return null;
};

/**
 * Detect VIN (and model if possible)
 */
export const detectVehicleInfo = async () => {
  const vin = await detectVIN();
  return { vin, model: null };
};

// ─── DTC Reading (OBD Mode 03) ──────────────────────────────

/**
 * DTC first-byte category mapping:
 *   0x = P0xxx, 1x = P1xxx, 2x = P2xxx, 3x = P3xxx
 *   4x = C0xxx, 5x = C1xxx, 6x = C2xxx, 7x = C3xxx
 *   8x = B0xxx, 9x = B1xxx, Ax = B2xxx, Bx = B3xxx
 *   Cx = U0xxx, Dx = U1xxx, Ex = U2xxx, Fx = U3xxx
 */
const DTC_CATEGORIES = {
  '0': 'P0', '1': 'P1', '2': 'P2', '3': 'P3',
  '4': 'C0', '5': 'C1', '6': 'C2', '7': 'C3',
  '8': 'B0', '9': 'B1', 'A': 'B2', 'B': 'B3',
  'C': 'U0', 'D': 'U1', 'E': 'U2', 'F': 'U3',
};

/**
 * Read stored DTCs from the vehicle.
 * Sends Mode 03 and parses the response into standard codes.
 * 
 * @returns {string[]} e.g. ['P0301', 'P0420', 'C0123']
 */
export const readDTCs = async () => {
  try {
    const connected = await BluetoothService.isConnected();
    if (!connected) return [];

    console.log('[OBD] Requesting DTCs (03)...');
    const response = await BluetoothService.sendCommandWithResponse('03', 6000);

    if (!response || response.includes('NO DATA') || response.includes('ERROR')) {
      console.log('[OBD] No DTCs stored');
      return [];
    }

    return parseDTCResponse(response);
  } catch (err) {
    console.error('[OBD] DTC read error:', err);
    return [];
  }
};

/**
 * Parse Mode 03 response into DTC codes.
 * Handles both spaced ("43 01 03 00 00") and no-spaces ("4301030000") formats.
 */
function parseDTCResponse(response) {
  try {
    const codes = [];
    
    // Normalize response into hex pairs
    const cleaned = response.replace(/[\r\n]/g, ' ').trim();
    let allHex;
    
    if (cleaned.includes(' ')) {
      allHex = cleaned.split(/\s+/).filter(p => /^[0-9A-Fa-f]{2}$/i.test(p));
    } else {
      allHex = [];
      const hex = cleaned.replace(/[^0-9A-Fa-f]/g, '');
      for (let j = 0; j < hex.length; j += 2) {
        if (j + 2 <= hex.length) allHex.push(hex.substring(j, j + 2));
      }
    }

    let i = 0;
    while (i < allHex.length) {
      // Skip the "43" header byte (Mode 03 response prefix)
      if (allHex[i].toUpperCase() === '43') {
        i++;
        continue;
      }

      // Each DTC is 2 bytes
      if (i + 1 < allHex.length) {
        const byte1 = allHex[i].toUpperCase();
        const byte2 = allHex[i + 1].toUpperCase();

        // Skip 00 00 (no code)
        if (byte1 === '00' && byte2 === '00') {
          i += 2;
          continue;
        }

        const firstNibble = byte1[0]; // Category
        const rest = byte1[1] + byte2; // 3 remaining digits
        const prefix = DTC_CATEGORIES[firstNibble] || 'P0';
        const code = prefix + rest;

        codes.push(code);
        i += 2;
      } else {
        break;
      }
    }

    console.log('[OBD] Parsed DTCs:', codes);
    return codes;
  } catch (err) {
    console.error('[OBD] DTC parse error:', err);
    return [];
  }
}

// ─── Telemetry Polling ──────────────────────────────────────

/**
 * Common OBD PIDs for live telemetry
 */
const TELEMETRY_PIDS = [
  { pid: '01 0C', name: 'rpm',          parse: (a, b) => ((a * 256) + b) / 4 },
  { pid: '01 0D', name: 'speed',        parse: (a) => a },        // km/h
  { pid: '01 05', name: 'coolant_temp', parse: (a) => a - 40 },  // °C
  { pid: '01 04', name: 'engine_load',  parse: (a) => (a / 255) * 100 }, // %
  { pid: '01 0B', name: 'intake_pressure', parse: (a) => a },    // kPa
  { pid: '01 0F', name: 'intake_temp',  parse: (a) => a - 40 },  // °C
];

let _telemetryTimer = null;
let _dtcCheckCounter = 0;
let _polling = false;
let _telemetryRunning = false;

/**
 * Parse a standard OBD Mode 01 response.
 * Response format: "41 XX AA BB" where AA BB are data bytes.
 */
function parseOBDResponse(response) {
  if (!response) return null;
  const hex = response
    .replace(/[\r\n]/g, ' ')
    .split(/\s+/)
    .filter(p => /^[0-9A-Fa-f]{2}$/.test(p));

  // Skip the "41 XX" header (2 bytes) — the rest are data bytes
  if (hex.length >= 3 && hex[0] === '41') {
    return hex.slice(2).map(h => parseInt(h, 16));
  }
  return null;
}

/**
 * Start polling OBD telemetry and forwarding to WebSocket.
 * Uses surgical setTimeout chaining with 500ms yields between each PID command
 * and a 5s cycle delay to ensure high UI responsiveness.
 * 
 * @param {WebSocket} ws - The WebSocket connection to the backend
 */
export const startTelemetryLoop = (ws) => {
  stopTelemetryLoop(); 
  _dtcCheckCounter = 0;
  _telemetryRunning = true;

  // Use a local object to accumulate results per cycle
  const _cycleData = {};

  console.log('[OBD] Starting telemetry loop (UI-safe mode)...');

  let pidIndex = 0;

  const pollStep = async () => {
    // Safety guards
    if (!_telemetryRunning) return;
    if (_polling) return;

    _polling = true;

    try {
      // 1. Start of a new cycle: check connection once
      if (pidIndex === 0) {
        const connected = await BluetoothService.isConnected();
        if (!connected) {
          console.warn('[OBD] Device disconnected, stopping loop');
          stopTelemetryLoop();
          return;
        }
        // Clear previous cycle data
        Object.keys(_cycleData).forEach(key => delete _cycleData[key]);
      }

      // 2. Poll the current PID
      const { pid, name, parse } = TELEMETRY_PIDS[pidIndex];
      try {
        const response = await BluetoothService.sendCommandWithResponse(pid, 3000);
        if (response && !response.includes('NO DATA') && !response.includes('ERROR')) {
          const bytes = parseOBDResponse(response);
          if (bytes && bytes.length > 0) {
            _cycleData[name] = parse(...bytes);
          }
        }
      } catch (err) {
        // Silently skip failed PIDs to keep loop moving
      }

      pidIndex++;

      // 3. Check if cycle is complete
      if (pidIndex >= TELEMETRY_PIDS.length) {
        pidIndex = 0;

        // Send batched telemetry data
        if (ws && ws.readyState === 1 && Object.keys(_cycleData).length > 0) {
          ws.send(JSON.stringify({
            type: 'obd_telemetry',
            data: { ..._cycleData },
            timestamp: new Date().toISOString(),
          }));
        }

        // Periodic DTC check (every 5 cycles ~ 1 minute)
        _dtcCheckCounter++;
        if (_dtcCheckCounter >= 5) {
          _dtcCheckCounter = 0;
          try {
            const dtcs = await readDTCs();
            if (dtcs.length > 0 && ws && ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'obd_dtc',
                codes: dtcs,
                timestamp: new Date().toISOString(),
              }));
            }
          } catch (e) {}
        }

        // Cycle finished: 5s pause to let JS thread/UI breathe
        _polling = false;
        if (_telemetryRunning) {
          _telemetryTimer = setTimeout(pollStep, 5000);
        }
        return;
      }

      // 4. Middle of cycle: 500ms yield between PIDs
      _polling = false;
      if (_telemetryRunning) {
        _telemetryTimer = setTimeout(pollStep, 500);
      }

    } catch (err) {
      console.error('[OBD] Telemetry fatal error:', err);
      _polling = false;
      pidIndex = 0;
      if (_telemetryRunning) {
        _telemetryTimer = setTimeout(pollStep, 5000);
      }
    }
  };

  // Initial start delay
  _telemetryTimer = setTimeout(pollStep, 1000);
};

/**
 * Stop the telemetry polling loop
 */
export const stopTelemetryLoop = () => {
  _telemetryRunning = false;
  if (_telemetryTimer) {
    clearTimeout(_telemetryTimer);
    _telemetryTimer = null;
    console.log('[OBD] Telemetry loop stopped');
  }
};

// ─── WebSocket Bridge (raw data passthrough) ─────────────────

/**
 * Bridge raw Bluetooth data to Backend WebSocket.
 * This forwards all incoming ELM327 data to the backend.
 * 
 * @param {WebSocket} ws The active WebSocket connection
 */
export const registerBluetoothBridge = (ws) => {
  if (!ws) return;

  BluetoothService.setDataCallback((data) => {
    if (ws && ws.readyState === 1) {
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
