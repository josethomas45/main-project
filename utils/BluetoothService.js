import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { Platform, PermissionsAndroid } from 'react-native';

class BluetoothService {
  constructor() {
    this.connectedDevice = null;
    this.isScanning = false;
    this.onDataCallback = null;
    this.dataSubscription = null;
  }

  /**
   * Request Bluetooth permissions (Android 12+ requires SCAN/CONNECT)
   */
  async requestPermissions() {
    if (Platform.OS === 'android') {
      try {
        const apiLevel = Platform.Version;

        if (apiLevel >= 31) {
          // Android 12+
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);
          return (
            granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
            granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED
          );
        } else {
          // Android < 12
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.warn('Permission request error:', err);
        return false;
      }
    }
    return true;
  }

  /**
   * Check if Bluetooth is enabled on the device
   */
  async isBluetoothEnabled() {
    try {
      return await RNBluetoothClassic.isBluetoothEnabled();
    } catch (err) {
      console.error('Bluetooth check error:', err);
      return false;
    }
  }

  /**
   * Get list of already-paired Bluetooth devices.
   * ELM327 devices show up here after initial pairing via Android Settings.
   */
  async getPairedDevices() {
    try {
      const paired = await RNBluetoothClassic.getBondedDevices();
      console.log('[BT] Paired devices:', paired?.length, paired?.map(d => `${d.name}(${d.address})`));
      return paired || [];
    } catch (err) {
      console.error('[BT] Error getting paired devices:', err);
      return [];
    }
  }

  /**
   * Start discovery for new (unpaired) Bluetooth Classic devices.
   * IMPORTANT: startDiscovery() is a blocking call that resolves once
   * discovery finishes (~12s). Use it in the background, not awaited.
   * 
   * @param {Function} onDeviceFound - callback(device) for each discovered device
   * @returns {Promise<BluetoothDevice[]>} resolves with all discovered devices when done
   */
  async startDiscovery(onDeviceFound) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Bluetooth permissions not granted');
    }

    const enabled = await this.isBluetoothEnabled();
    if (!enabled) {
      throw new Error('Bluetooth is not enabled. Please turn on Bluetooth.');
    }

    this.isScanning = true;

    try {
      // Set up listener for real-time discovery events (fires as each device is found)
      this._discoverySubscription = RNBluetoothClassic.onDeviceDiscovered((device) => {
        console.log('[BT] Discovered device:', device?.name, device?.address);
        if (device && onDeviceFound) {
          onDeviceFound(device);
        }
      });

      // startDiscovery() returns a promise that resolves with ALL discovered
      // devices when discovery completes (after ~12 seconds).
      console.log('[BT] Starting discovery...');
      const discoveredDevices = await RNBluetoothClassic.startDiscovery();
      console.log('[BT] Discovery complete, found:', discoveredDevices?.length);
      
      this.isScanning = false;
      return discoveredDevices || [];
    } catch (err) {
      this.isScanning = false;
      console.error('[BT] Discovery error:', err);
      // Don't re-throw — discovery failures shouldn't block the flow
      return [];
    } finally {
      if (this._discoverySubscription) {
        this._discoverySubscription.remove();
        this._discoverySubscription = null;
      }
    }
  }

  /**
   * Stop Bluetooth discovery
   */
  async stopDiscovery() {
    this.isScanning = false;
    try {
      await RNBluetoothClassic.cancelDiscovery();
    } catch (err) {
      // Ignore — may not be discovering
    }
    if (this._discoverySubscription) {
      this._discoverySubscription.remove();
      this._discoverySubscription = null;
    }
  }

  /**
   * Connect to a Bluetooth Classic device (ELM327 via SPP).
   * The library's connectToDevice returns a BluetoothDevice wrapper.
   */
  async connect(device) {
    try {
      await this.stopDiscovery();

      const address = device.address || device.id;
      console.log(`[BT] Connecting to ${device.name} (${address})...`);

      const connected = await RNBluetoothClassic.connectToDevice(address, {
        delimiter: '\r',       // ELM327 terminates with carriage return
        charset: 'ascii',
      });

      if (!connected) {
        throw new Error('Connection returned null');
      }

      this.connectedDevice = connected;

      // Set up data listener
      this.setupDataListener();

      console.log(`[BT] Connected to ${device.name}`);
      return true;
    } catch (error) {
      console.error('[BT] Connection error:', error);
      this.connectedDevice = null;
      throw error;
    }
  }

  /**
   * Listen for incoming data from the ELM327
   */
  setupDataListener() {
    if (!this.connectedDevice) return;

    // Remove any existing subscription
    if (this.dataSubscription) {
      this.dataSubscription.remove();
      this.dataSubscription = null;
    }

    this.dataSubscription = this.connectedDevice.onDataReceived((event) => {
      const data = event.data;
      console.log('[BT] Data received:', data);
      if (this.onDataCallback && data) {
        this.onDataCallback(data);
      }
    });
  }

  /**
   * Initialize ELM327 with AT commands
   */
  async initializeOBD() {
    if (!this.connectedDevice) return;

    console.log('[BT] Initializing ELM327...');
    const initCommands = [
      'ATZ',     // Reset
      'ATE0',    // Echo off
      'ATL1',    // Linefeeds on
      'ATS0',    // Spaces off (cleaner parsing)
      'ATSP0',   // Protocol auto-detect
    ];

    for (const cmd of initCommands) {
      try {
        await this.sendCommand(cmd);
        // Wait for ELM327 to process each command
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        console.warn(`[BT] Init command "${cmd}" failed:`, err);
      }
    }
    console.log('[BT] ELM327 initialization complete');
  }

  /**
   * Send an AT or OBD command to the device (fire and forget)
   */
  async sendCommand(command) {
    if (!this.connectedDevice) {
      console.warn('[BT] No connected device, cannot send command');
      return null;
    }

    try {
      const cmdStr = command.endsWith('\r') ? command : command + '\r';
      await this.connectedDevice.write(cmdStr, 'ascii');
    } catch (err) {
      console.error(`[BT] Error sending command "${command}":`, err);
      throw err;
    }
  }

  /**
   * Send command and wait for the complete response.
   * Collects data until ELM327 '>' prompt or timeout.
   * 
   * @param {string} command - AT or OBD command
   * @param {number} timeoutMs - max wait time (default 5000ms)
   * @returns {string} the full response text
   */
  async sendCommandWithResponse(command, timeoutMs = 5000) {
    if (!this.connectedDevice) {
      throw new Error('No connected device');
    }

    return new Promise(async (resolve, reject) => {
      let responseBuffer = '';
      let tempSubscription = null;
      let timer = null;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (tempSubscription) {
          tempSubscription.remove();
          tempSubscription = null;
        }
      };

      // Temporarily listen for data
      tempSubscription = this.connectedDevice.onDataReceived((event) => {
        const chunk = event.data || '';
        responseBuffer += chunk;

        // ELM327 sends '>' when ready for next command
        if (responseBuffer.includes('>')) {
          cleanup();
          const response = responseBuffer.replace(/>/g, '').trim();
          console.log(`[BT] Response for "${command}":`, response);
          resolve(response);
        }
      });

      // Timeout
      timer = setTimeout(() => {
        cleanup();
        console.warn(`[BT] Command "${command}" timed out. Buffer:`, responseBuffer);
        // Return whatever we have even on timeout
        resolve(responseBuffer.trim());
      }, timeoutMs);

      // Send the command
      try {
        const cmdStr = command.endsWith('\r') ? command : command + '\r';
        await this.connectedDevice.write(cmdStr, 'ascii');
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  /**
   * Set callback for incoming data
   */
  setDataCallback(callback) {
    this.onDataCallback = callback;
  }

  /**
   * Check if a device is currently connected
   */
  async isConnected() {
    if (!this.connectedDevice) return false;
    try {
      return await this.connectedDevice.isConnected();
    } catch {
      return false;
    }
  }

  /**
   * Disconnect from the current device
   */
  async disconnect() {
    if (this.dataSubscription) {
      this.dataSubscription.remove();
      this.dataSubscription = null;
    }
    if (this.connectedDevice) {
      try {
        await this.connectedDevice.disconnect();
      } catch (err) {
        console.warn('[BT] Disconnect error:', err);
      }
      this.connectedDevice = null;
    }
  }
}

export default new BluetoothService();
