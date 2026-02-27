/**
 * OBDConnectionManager — global singleton
 *
 * Owns the WebSocket connection to the backend and the OBD telemetry
 * streaming lifecycle.  Call `start()` once after VIN detection succeeds
 * and it will keep streaming until `stop()` is called (or the app closes).
 *
 * Usage:
 *   import OBDConnectionManager from '../utils/OBDConnectionManager';
 *   OBDConnectionManager.start(token, backendUrl);
 */
import { registerBluetoothBridge, startTelemetryLoop, stopTelemetryLoop } from './obdService';

// ─── Singleton state ────────────────────────────────────────

let _ws = null;
let _reconnectTimer = null;
let _token = null;
let _backendUrl = null;
let _running = false;

// Listeners
const _statusListeners = new Set();
const _dataListeners = new Set();

// ─── Helpers ────────────────────────────────────────────────

function _notifyStatus(connected) {
  for (const cb of _statusListeners) {
    try { cb(connected); } catch { /* ignore */ }
  }
}

function _notifyData(data) {
  for (const cb of _dataListeners) {
    try { cb(data); } catch { /* ignore */ }
  }
}

function _buildWsUrl(backendUrl) {
  const wsProtocol = backendUrl.startsWith('https') ? 'wss://' : 'ws://';
  const cleanUrl = backendUrl.replace('http://', '').replace('https://', '');
  return `${wsProtocol}${cleanUrl}/ws/obd`;
}

// ─── Core connect / disconnect ──────────────────────────────

function _connect() {
  if (!_running || !_token || !_backendUrl) return;

  // Prevent duplicate connections
  if (_ws && (_ws.readyState === WebSocket.OPEN || _ws.readyState === WebSocket.CONNECTING)) {
    console.log('[OBDManager] WebSocket already open/connecting, skipping');
    return;
  }

  const wsUrl = _buildWsUrl(_backendUrl);
  console.log('[OBDManager] Connecting to WebSocket:', wsUrl);

  _ws = new WebSocket(wsUrl);

  _ws.onopen = () => {
    console.log('[OBDManager] ✅ WebSocket connected');
    _notifyStatus(true);

    // Authenticate
    try {
      _ws.send(JSON.stringify({ type: 'auth', token: _token }));
      console.log('[OBDManager] Auth sent');
    } catch (err) {
      console.error('[OBDManager] Failed to send auth:', err);
    }

    // Start OBD data streaming
    registerBluetoothBridge(_ws);
    startTelemetryLoop(_ws);
  };

  _ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      _notifyData(data);
    } catch (err) {
      console.error('[OBDManager] WS message parse error:', err);
    }
  };

  _ws.onerror = (error) => {
    console.error('[OBDManager] WebSocket error:', error);
    _notifyStatus(false);
  };

  _ws.onclose = () => {
    console.log('[OBDManager] WebSocket disconnected');
    _notifyStatus(false);
    stopTelemetryLoop();

    // Auto-reconnect if still running
    if (_running) {
      _reconnectTimer = setTimeout(() => {
        console.log('[OBDManager] Attempting reconnect...');
        _connect();
      }, 5000);
    }
  };
}

function _disconnect() {
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
  stopTelemetryLoop();
  if (_ws) {
    try { _ws.close(); } catch { /* ignore */ }
    _ws = null;
  }
  _notifyStatus(false);
}

// ─── Public API ─────────────────────────────────────────────

const OBDConnectionManager = {
  /**
   * Start the WebSocket connection and begin streaming OBD data.
   * Safe to call multiple times — will no-op if already running.
   *
   * @param {string} token  Clerk auth token
   * @param {string} backendUrl  e.g. "https://example.com" or "http://10.0.2.2:8000"
   */
  start(token, backendUrl) {
    if (_running) {
      console.log('[OBDManager] Already running, updating token');
      _token = token;
      return;
    }

    _token = token;
    _backendUrl = backendUrl;
    _running = true;

    console.log('[OBDManager] Starting...');
    _connect();
  },

  /**
   * Stop the WebSocket connection and telemetry streaming.
   */
  stop() {
    console.log('[OBDManager] Stopping...');
    _running = false;
    _disconnect();
  },

  /**
   * Update the auth token (e.g. after token refresh).
   * @param {string} token
   */
  updateToken(token) {
    _token = token;
  },

  /**
   * @returns {boolean} Whether the WebSocket is currently connected
   */
  isConnected() {
    return _ws !== null && _ws.readyState === WebSocket.OPEN;
  },

  /**
   * Register a listener for connection status changes.
   * @param {(connected: boolean) => void} callback
   * @returns {() => void} unsubscribe function
   */
  onStatusChange(callback) {
    _statusListeners.add(callback);
    return () => _statusListeners.delete(callback);
  },

  /**
   * Register a listener for incoming WebSocket data (alerts, etc.).
   * @param {(data: object) => void} callback
   * @returns {() => void} unsubscribe function
   */
  onData(callback) {
    _dataListeners.add(callback);
    return () => _dataListeners.delete(callback);
  },

  /**
   * Send a message through the WebSocket (if connected).
   * @param {object} data
   */
  send(data) {
    if (_ws && _ws.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify(data));
    }
  },
};

export default OBDConnectionManager;
