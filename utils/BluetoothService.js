import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { Platform, PermissionsAndroid } from 'react-native';

class BluetoothService {
  constructor() {
    this.connectedDevice = null;
    this.isScanning = false;
    this.onDataCallback = null;
    this.dataSubscription = null;
    this._commandInProgress = false;
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
          const allGranted = 
            granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
            granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED;
          console.log('[BT] Permissions granted:', allGranted);
          return allGranted;
        } else {
          // Android < 12
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.warn('[BT] Permission request error:', err);
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
      console.error('[BT] Bluetooth check error:', err);
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
   * startDiscovery() blocks until discovery finishes (~12s).
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
      this._discoverySubscription = RNBluetoothClassic.onDeviceDiscovered((device) => {
        console.log('[BT] Discovered device:', device?.name, device?.address);
        if (device && onDeviceFound) {
          onDeviceFound(device);
        }
      });

      console.log('[BT] Starting discovery...');
      const discoveredDevices = await RNBluetoothClassic.startDiscovery();
      console.log('[BT] Discovery complete, found:', discoveredDevices?.length);
      
      this.isScanning = false;
      return discoveredDevices || [];
    } catch (err) {
      this.isScanning = false;
      console.error('[BT] Discovery error:', err);
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
   * NOTE: Does NOT set up a permanent data listener — that's done
   * lazily via setDataCallback() to avoid conflicts with
   * sendCommandWithResponse().
   */
  async connect(device) {
    try {
      await this.stopDiscovery();

      const address = device.address || device.id;
      console.log(`[BT] Connecting to ${device.name || 'Unknown'} (${address})...`);

      const connected = await RNBluetoothClassic.connectToDevice(address, {
        delimiter: '\r',
        charset: 'ascii',
      });

      if (!connected) {
        throw new Error('Connection returned null');
      }

      this.connectedDevice = connected;
      console.log(`[BT] ✅ Connected to ${device.name || address}`);

      // Verify the connection is actually open
      const isConn = await connected.isConnected();
      console.log(`[BT] Connection verified: ${isConn}`);
      if (!isConn) {
        this.connectedDevice = null;
        throw new Error('Device connected but isConnected() returned false');
      }

      return true;
    } catch (error) {
      console.error('[BT] ❌ Connection error:', error);
      this.connectedDevice = null;
      throw error;
    }
  }

  /**
   * Initialize ELM327 with AT commands.
   * Uses sendCommandWithResponse() to properly wait for each response.
   */
  async initializeOBD() {
    if (!this.connectedDevice) {
      console.warn('[BT] No device to initialize');
      return;
    }

    console.log('[BT] Initializing ELM327...');

    // DO NOT send ATZ — it performs a full hardware reset on many
    // ELM327 clones, which kills the Bluetooth connection.
    // Instead use AT D (defaults) + config commands.
    const initCommands = [
      { cmd: 'ATD',  desc: 'Set defaults' },
      { cmd: 'ATE0', desc: 'Echo off' },
      { cmd: 'ATL0', desc: 'Linefeeds off' },
      { cmd: 'ATS1', desc: 'Spaces on' },
      { cmd: 'ATH0', desc: 'Headers off' },
      { cmd: 'ATSP0', desc: 'Protocol auto' },
    ];

    for (const { cmd, desc } of initCommands) {
      try {
        const resp = await this.sendCommandWithResponse(cmd, 3000);
        console.log(`[BT] ${cmd} (${desc}):`, resp);
      } catch (err) {
        console.warn(`[BT] ${cmd} failed:`, err);
      }
      await new Promise(r => setTimeout(r, 300));
    }

    // Verify we're still connected after init
    const stillConnected = await this.isConnected();
    if (!stillConnected) {
      throw new Error('Connection lost during initialization');
    }

    console.log('[BT] ✅ ELM327 initialization complete');
  }

  /**
   * Send command and wait for the complete response.
   * Collects data until ELM327 '>' prompt or timeout.
   * 
   * During command execution, the permanent data listener is paused
   * to prevent it from consuming response data.
   */
  async sendCommandWithResponse(command, timeoutMs = 5000) {
    if (!this.connectedDevice) {
      throw new Error('No connected device');
    }

    // Wait if another command is in progress (serial queue)
    while (this._commandInProgress) {
      await new Promise(r => setTimeout(r, 100));
    }
    this._commandInProgress = true;

    // Pause permanent data listener during command
    const hadPermanentListener = !!this.dataSubscription;
    if (this.dataSubscription) {
      this.dataSubscription.remove();
      this.dataSubscription = null;
    }

    try {
      return await new Promise(async (resolve, reject) => {
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

        // Listen for response data
        tempSubscription = this.connectedDevice.onDataReceived((event) => {
          const chunk = event.data || '';
          responseBuffer += chunk;

          // ELM327 sends '>' when ready for next command
          if (responseBuffer.includes('>')) {
            cleanup();
            const response = responseBuffer.replace(/>/g, '').trim();
            console.log(`[BT] << "${command}" =>`, response);
            resolve(response);
          }
        });

        // Timeout
        timer = setTimeout(() => {
          cleanup();
          const response = responseBuffer.trim();
          console.warn(`[BT] ⏱ "${command}" timed out (${timeoutMs}ms). Got:`, response);
          resolve(response); // Return what we have
        }, timeoutMs);

        // Send the command
        try {
          const cmdStr = command.endsWith('\r') ? command : command + '\r';
          await this.connectedDevice.write(cmdStr, 'ascii');
          console.log(`[BT] >> Sent: "${command}"`);
        } catch (err) {
          cleanup();
          reject(err);
        }
      });
    } finally {
      this._commandInProgress = false;

      // Restore permanent data listener if it was active
      if (hadPermanentListener && this.onDataCallback) {
        this._setupPermanentListener();
      }
    }
  }

  /**
   * Send fire-and-forget command (no response expected)
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
   * Set callback for incoming data (for raw bridge / telemetry).
   * Sets up a permanent listener that forwards data to the callback.
   * The listener is automatically paused during sendCommandWithResponse().
   */
  setDataCallback(callback) {
    this.onDataCallback = callback;

    if (callback && this.connectedDevice) {
      this._setupPermanentListener();
    }
  }

  /**
   * Internal: set up the permanent data listener
   */
  _setupPermanentListener() {
    if (this.dataSubscription) {
      this.dataSubscription.remove();
    }
    this.dataSubscription = this.connectedDevice.onDataReceived((event) => {
      const data = event.data;
      if (this.onDataCallback && data) {
        this.onDataCallback(data);
      }
    });
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
