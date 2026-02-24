import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';

class BluetoothService {
  constructor() {
    this.manager = new BleManager();
    this.connectedDevice = null;
    this.writeCharacteristic = null;
    this.readCharacteristic = null;
    this.isScanning = false;
    this.onDataCallback = null;
  }

  /**
   * Helper to convert string to base64
   */
  toBase64(str) {
    if (Platform.OS === 'web') return btoa(str);
    // For Native, we can use a simple helper or Buffer if available
    // Since we don't have Buffer, we use a manual conversion or small hex helper
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let output = '';
    for (let i = 0; i < str.length; i += 3) {
      const chunk = (str.charCodeAt(i) << 16) | (str.charCodeAt(i + 1) << 8) | str.charCodeAt(i + 2);
      output += chars[(chunk >> 18) & 63] + chars[(chunk >> 12) & 63] + chars[(chunk >> 6) & 63] + chars[chunk & 63];
    }
    return output;
  }

  /**
   * Helper to convert base64 to string
   */
  fromBase64(b64) {
    // Basic decode for demonstration
    // In a real app, use a robust library like 'buffer' or 'base-64'
    return b64; // Placeholder
  }

  /**
   * Request permissions (Android only)
   */
  async requestPermissions() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn('Permission request error:', err);
        return false;
      }
    }
    return true;
  }

  /**
   * Scan for devices
   */
  async startScan(onDeviceFound) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Bluetooth permissions not granted');
    }

    this.isScanning = true;
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Scan error:', error);
        this.isScanning = false;
        return;
      }

      if (device && device.name) {
        onDeviceFound(device);
      }
    });

    // Stop scan after 10 seconds
    setTimeout(() => {
      this.stopScan();
    }, 10000);
  }

  stopScan() {
    this.isScanning = false;
    this.manager.stopDeviceScan();
  }

  /**
   * Connect to a specific device
   */
  async connect(device) {
    try {
      this.stopScan();
      const connectedDevice = await this.manager.connectToDevice(device.id);
      await connectedDevice.discoverAllServicesAndCharacteristics();
      
      this.connectedDevice = connectedDevice;
      
      // Look for common ELM327 services (FFF0, 18F0, etc)
      const services = await connectedDevice.services();
      
      for (const service of services) {
        const characteristics = await service.characteristics();
        for (const char of characteristics) {
          if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
            this.writeCharacteristic = char;
          }
          if (char.isNotifiable || char.isIndicatable) {
            this.readCharacteristic = char;
            this.setupNotifications(char);
          }
        }
      }
      
      if (!this.writeCharacteristic) {
        throw new Error('No writable characteristic found on device');
      }

      return true;
    } catch (error) {
      console.error('Connection error:', error);
      throw error;
    }
  }

  setupNotifications(characteristic) {
    characteristic.monitor((error, char) => {
      if (error) {
        console.error('Notification error:', error);
        return;
      }
      const data = this.fromBase64(char.value);
      if (this.onDataCallback) {
        this.onDataCallback(data);
      }
    });
  }

  /**
   * Initialize OBD (AT commands)
   */
  async initializeOBD() {
    if (!this.connectedDevice) return;
    
    // Commands to wake up/init ELM327
    const initCommands = [
      'ATZ',    // Reset
      'ATE0',   // Echo off
      'ATL1',   // Linefeeds on
      'ATSP0',  // Protocol auto
    ];
    
    for (const cmd of initCommands) {
      await this.sendCommand(cmd + '\r');
      await new Promise(r => setTimeout(r, 500));
    }
  }

  async sendCommand(command) {
    if (!this.writeCharacteristic) return;
    
    const b64 = this.toBase64(command);
    await this.writeCharacteristic.writeWithResponse(b64);
  }

  setDataCallback(callback) {
    this.onDataCallback = callback;
  }

  disconnect() {
    if (this.connectedDevice) {
      this.manager.cancelDeviceConnection(this.connectedDevice.id);
      this.connectedDevice = null;
      this.writeCharacteristic = null;
      this.readCharacteristic = null;
    }
  }
}

export default new BluetoothService();
