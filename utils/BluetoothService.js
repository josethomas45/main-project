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
   * Get list of already-paired Bluetooth devices
   * ELM327 devices usually show up as paired after initial pairing via Android settings
   */
  async getPairedDevices() {
    try {
      const paired = await RNBluetoothClassic.getBondedDevices();
      return paired || [];
    } catch (err) {
      console.error('Error getting paired devices:', err);
      return [];
    }
  }

  /**
   * Start discovery for unpaired Bluetooth Classic devices
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
      // Listen for discovered devices
      const subscription = RNBluetoothClassic.onDeviceDiscovered((device) => {
        if (device && device.name) {
          onDeviceFound(device);
        }
      });

      // Start discovery
      await RNBluetoothClassic.startDiscovery();

      // Stop after 12 seconds
      setTimeout(async () => {
        await this.stopDiscovery();
        if (subscription) subscription.remove();
      }, 12000);

      return subscription;
    } catch (err) {
      this.isScanning = false;
      console.error('Discovery error:', err);
      throw err;
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
  }

  /**
   * Connect to a Bluetooth Classic device (ELM327 via SPP)
   */
  async connect(device) {
    try {
      await this.stopDiscovery();

      const address = device.address || device.id;
      console.log(`Connecting to ${device.name} (${address})...`);

      const connected = await RNBluetoothClassic.connectToDevice(address, {
        delimiter: '>',       // ELM327 uses '>' as prompt
        charset: 'ascii',
      });

      if (!connected) {
        throw new Error('Connection returned null');
      }

      this.connectedDevice = connected;

      // Set up data listener
      this.setupDataListener();

      console.log(`Connected to ${device.name}`);
      return true;
    } catch (error) {
      console.error('Connection error:', error);
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

    const initCommands = [
      'ATZ',     // Reset
      'ATE0',    // Echo off
      'ATL1',    // Linefeeds on
      'ATS0',    // Spaces off (cleaner parsing)
      'ATSP0',   // Protocol auto-detect
    ];

    for (const cmd of initCommands) {
      await this.sendCommand(cmd);
      // Wait for ELM327 to process each command
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  /**
   * Send an AT or OBD command to the device
   */
  async sendCommand(command) {
    if (!this.connectedDevice) {
      console.warn('No connected device, cannot send command');
      return null;
    }

    try {
      // ELM327 expects commands terminated with \r
      const cmdStr = command.endsWith('\r') ? command : command + '\r';
      await this.connectedDevice.write(cmdStr, 'ascii');
    } catch (err) {
      console.error(`Error sending command "${command}":`, err);
      throw err;
    }
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
        console.warn('Disconnect error:', err);
      }
      this.connectedDevice = null;
    }
  }
}

export default new BluetoothService();
