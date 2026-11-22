import { EventEmitter, type EventSubscription, requireNativeModule } from 'expo-modules-core';

export interface BondedDevice {
  name: string;
  address: string;
  isConnected: boolean;
  batteryLevel?: number | null;
  codec?: string;
  type: string;
  deviceType?: string;
  majorDeviceClass?: number;
  deviceClass?: number;
}

export interface ConnectionChangeEvent {
  address: string;
  name: string;
  connected: boolean;
  isScreenOn?: boolean;
}

export interface BluetoothStateEvent {
  enabled: boolean;
}

export interface BatteryChangeEvent {
  address: string;
  batteryLevel: number | null;
}

export interface BleRssiEvent {
  address: string;
  rssi: number;
}

export interface EqualizerBand {
  band: number;
  centerFreqHz: number;
  currentLevelMB: number;
}

export interface EqualizerParameters {
  isSupported: boolean;
  numberOfBands: number;
  minLevelMB: number;
  maxLevelMB: number;
  bands: EqualizerBand[];
}

export type EarbudNativeEvents = {
  onDeviceConnectionChanged: (event: ConnectionChangeEvent) => void;
  onBluetoothStateChanged: (event: BluetoothStateEvent) => void;
  onBondStateChanged: () => void;
  onBatteryLevelChanged: (event: BatteryChangeEvent) => void;
  onBleRssiScanned: (event: BleRssiEvent) => void;
};

// Safe runtime resolution for React Native utilities
let Platform: any = { OS: 'android', Version: 34 };
let PermissionsAndroid: any = {
  PERMISSIONS: {
    BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT',
    BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
    POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
    ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
  },
  RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
  requestMultiple: async () => ({}),
  request: async () => 'granted',
};

try {
  const dynamicRequire = eval('require');
  const RN = dynamicRequire('react-native');
  if (RN?.Platform) Platform = RN.Platform;
  if (RN?.PermissionsAndroid) PermissionsAndroid = RN.PermissionsAndroid;
} catch (_e) {}

// Safely load the native module
let NativeModule: any = null;
let emitter: EventEmitter<EarbudNativeEvents> | null = null;

try {
  if (Platform.OS === 'android') {
    NativeModule = requireNativeModule('EarbudNative');
    emitter = new EventEmitter<EarbudNativeEvents>(NativeModule);
  }
} catch (e) {
  // In development/test mock
}

const MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/g;
const PACKAGE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

export function isValidMac(address: unknown): boolean {
  if (typeof address !== 'string') return false;
  return MAC_REGEX.test(address.trim());
}

export function maskMac(address: unknown): string {
  if (typeof address !== 'string') return 'XX:XX:XX:XX:XX:XX';
  const trimmed = address.trim();
  if (!MAC_REGEX.test(trimmed)) return 'XX:XX:XX:XX:XX:XX';
  const parts = trimmed.split(':');
  return `XX:XX:XX:XX:${parts[4]}:${parts[5]}`.toUpperCase();
}

export function sanitizeDeviceName(name: unknown): string {
  if (typeof name !== 'string') return 'Unknown Device';
  const cleaned = name.replace(CONTROL_CHARS_REGEX, '').trim();
  if (cleaned.length === 0) return 'Unknown Device';
  return cleaned.length > 64 ? cleaned.slice(0, 64) : cleaned;
}

const devLog = {
  log: (...args: any[]) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.error(...args);
    }
  },
};

/**
 * Check if the app has required Bluetooth permissions.
 * On Android 12+ (API 31+), checks BLUETOOTH_CONNECT.
 */
export function hasBluetoothPermission(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return NativeModule?.hasBluetoothPermission() ?? false;
  } catch (e) {
    devLog.warn('[EarbudNative] Error checking bluetooth permission:', e);
    return false;
  }
}

/**
 * Check if Bluetooth adapter is currently turned on.
 */
export function isBluetoothEnabled(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return NativeModule?.isBluetoothEnabled() ?? false;
  } catch (e) {
    devLog.warn('[EarbudNative] Error checking bluetooth enabled:', e);
    return false;
  }
}

/**
 * Checks if device screen is on / interactive.
 */
export function isScreenInteractive(): boolean {
  if (Platform.OS !== 'android') return true;
  try {
    return NativeModule?.isScreenInteractive() ?? true;
  } catch (e) {
    return true;
  }
}

/**
 * Request runtime Bluetooth permissions on Android.
 * - Android 12+ (API 31+): Requests BLUETOOTH_CONNECT and BLUETOOTH_SCAN.
 * - Android 8–11: Permissions are install-time, returns true.
 */
export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    devLog.log('[EarbudNative] Bluetooth features are not supported on iOS');
    return false;
  }

  try {
    if (Platform.Version >= 31) {
      const permsToRequest = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      ];
      if (Platform.Version >= 33) {
        permsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      const granted = await PermissionsAndroid.requestMultiple(permsToRequest);

      const connectGranted =
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
        PermissionsAndroid.RESULTS.GRANTED;

      return connectGranted;
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    devLog.warn('[EarbudNative] Error requesting bluetooth permissions:', err);
    return false;
  }
}

/**
 * Request notification permission (required on Android 13+ / API 33+ for foreground service and battery alerts).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  } catch (e) {
    devLog.warn('[EarbudNative] Error requesting notification permission:', e);
    return false;
  }
}

/**
 * Check if the background device watcher foreground service is currently running.
 */
export function isDeviceWatcherServiceRunning(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return NativeModule?.isWatcherServiceRunning() ?? false;
  } catch (e) {
    devLog.warn('[EarbudNative] Error checking service running:', e);
    return false;
  }
}

/**
 * Starts the foreground service (type: connectedDevice) with a persistent notification
 * ("EarbudKit is watching your devices") so events arrive in background with screen off.
 */
export async function startDeviceWatcherService(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    devLog.log('[EarbudNative] Foreground service not supported on iOS');
    return false;
  }

  try {
    await requestNotificationPermission();
    return (await NativeModule?.startWatcherService()) ?? false;
  } catch (e) {
    devLog.error('[EarbudNative] Failed to start device watcher service:', e);
    return false;
  }
}

/**
 * Stops the background device watcher foreground service.
 */
export async function stopDeviceWatcherService(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    return (await NativeModule?.stopWatcherService()) ?? false;
  } catch (e) {
    devLog.error('[EarbudNative] Failed to stop device watcher service:', e);
    return false;
  }
}

/**
 * Reads native battery level for a device address, trying in order:
 * (a) BluetoothDevice.getBatteryLevel reflection
 * (b) BATTERY_LEVEL_CHANGED broadcast cache
 * (c) BLE Battery Service GATT (0x180F/0x2A19)
 * Returns null if none work or if address is invalid.
 */
export async function getDeviceBatteryLevel(
  address: string
): Promise<number | null> {
  if (Platform.OS !== 'android') return null;
  if (!isValidMac(address)) return null;

  try {
    const level = await NativeModule?.getDeviceBatteryLevel(address.toUpperCase());
    if (typeof level === 'number' && level >= 0 && level <= 100) {
      return Math.round(level);
    }
    return null;
  } catch (e) {
    devLog.warn(`[EarbudNative] Error fetching battery for ${maskMac(address)}:`, e);
    return null;
  }
}

/**
 * Stage 7: Start BLE RSSI Scanning for "Getting Warmer" proximity meter.
 */
export function startRssiScan(address: string): boolean {
  if (Platform.OS !== 'android') return false;
  if (!isValidMac(address)) return false;
  try {
    return NativeModule?.startRssiScan(address.toUpperCase()) ?? false;
  } catch (e) {
    devLog.warn('[EarbudNative] Error starting RSSI scan:', e);
    return false;
  }
}

/**
 * Stage 7: Stop BLE RSSI Scanning.
 */
export function stopRssiScan(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return NativeModule?.stopRssiScan() ?? false;
  } catch (e) {
    devLog.warn('[EarbudNative] Error stopping RSSI scan:', e);
    return false;
  }
}

/**
 * Stage 7: Check if RSSI scanning is currently active.
 */
export function isRssiScanning(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return NativeModule?.isRssiScanning() ?? false;
  } catch (e) {
    return false;
  }
}

/**
 * Stage 6: Set media volume percentage (0 - 100).
 */
export function setMediaVolume(volumePercent: number): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    const clamped = Math.max(0, Math.min(100, Math.round(volumePercent)));
    return NativeModule?.setMediaVolume(clamped) ?? true;
  } catch (e) {
    devLog.warn('[EarbudNative] Error setting media volume:', e);
    return false;
  }
}

/**
 * Stage 6: Get current media volume percentage (0 - 100).
 */
export function getMediaVolume(): number {
  if (Platform.OS !== 'android') return 50;
  try {
    return NativeModule?.getMediaVolume() ?? 50;
  } catch (e) {
    devLog.warn('[EarbudNative] Error getting media volume:', e);
    return 50;
  }
}

/**
 * Stage 6: Pause media playback via standard media key event and audio focus request.
 */
export function pauseMedia(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return NativeModule?.pauseMedia() ?? true;
  } catch (e) {
    devLog.warn('[EarbudNative] Error pausing media:', e);
    return false;
  }
}

/**
 * Stage 6: Launch an application by package name (e.g. 'com.spotify.music').
 */
export function launchApp(packageName: string): boolean {
  if (Platform.OS !== 'android') {
    devLog.log(`[EarbudNative] App launching for ${packageName} not supported on iOS`);
    return false;
  }
  const trimmed = (packageName || '').trim();
  if (!PACKAGE_NAME_REGEX.test(trimmed)) {
    devLog.warn(`[EarbudNative] Invalid package name format: ${packageName}`);
    return false;
  }
  try {
    return NativeModule?.launchApp(trimmed) ?? true;
  } catch (e) {
    devLog.warn(`[EarbudNative] Error launching app ${trimmed}:`, e);
    return false;
  }
}

/**
 * Stage 6: Check if Do Not Disturb policy access is granted.
 */
export function isDndPermissionGranted(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return NativeModule?.isDndPermissionGranted() ?? false;
  } catch (e) {
    devLog.warn('[EarbudNative] Error checking DND permission:', e);
    return false;
  }
}

/**
 * Stage 6: Open system Do Not Disturb access settings.
 */
export async function openDndSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    return (await NativeModule?.openDndSettings()) ?? false;
  } catch (e) {
    devLog.warn('[EarbudNative] Error opening DND settings:', e);
    return false;
  }
}

/**
 * Stage 6: Set Do Not Disturb mode (Priority only vs Normal).
 */
export function setDndEnabled(enable: boolean): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return NativeModule?.setDndEnabled(enable) ?? false;
  } catch (e) {
    devLog.warn('[EarbudNative] Error setting DND mode:', e);
    return false;
  }
}

/**
 * Opens system Bluetooth settings so user can pair new devices.
 */
export async function openBluetoothSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    return (await NativeModule?.openBluetoothSettings()) ?? false;
  } catch (e) {
    devLog.warn('[EarbudNative] Error opening bluetooth settings:', e);
    return false;
  }
}

/**
 * Opens system App Info settings for this app so user can grant permissions.
 */
export async function openAppSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    return (await NativeModule?.openAppSettings()) ?? false;
  } catch (e) {
    devLog.warn('[EarbudNative] Error opening app settings:', e);
    return false;
  }
}

/**
 * Get all bonded (paired) Bluetooth audio devices with connection state.
 */
export async function getBondedAudioDevices(): Promise<BondedDevice[]> {
  if (Platform.OS !== 'android') {
    devLog.log('[EarbudNative] Bluetooth audio scanning is not supported on iOS');
    return [];
  }

  try {
    if (!hasBluetoothPermission()) {
      devLog.warn('[EarbudNative] BLUETOOTH_CONNECT permission not granted');
      return [];
    }

    const devices = await NativeModule?.getBondedAudioDevices();
    if (!Array.isArray(devices)) return [];
    return devices
      .filter((d: any) => isValidMac(d?.address))
      .map((d: any) => ({
        ...d,
        name: sanitizeDeviceName(d.name),
        address: d.address.toUpperCase(),
        deviceType: typeof d.deviceType === 'string' ? d.deviceType : 'audio',
        batteryLevel: typeof d.batteryLevel === 'number' && d.batteryLevel >= 0 && d.batteryLevel <= 100
          ? Math.round(d.batteryLevel)
          : null,
      }));
  } catch (e) {
    devLog.error('[EarbudNative] Failed to get bonded audio devices:', e);
    return [];
  }
}

/**
 * Stage S9: Get Bluetooth audio devices currently connected over A2DP and HEADSET profiles.
 */
export async function getConnectedAudioDevices(): Promise<BondedDevice[]> {
  if (Platform.OS !== 'android') {
    return [];
  }

  try {
    if (!hasBluetoothPermission()) {
      devLog.warn('[EarbudNative] BLUETOOTH_CONNECT permission not granted');
      return [];
    }

    const devices = await NativeModule?.getConnectedAudioDevices();
    if (!Array.isArray(devices)) return [];
    return devices
      .filter((d: any) => isValidMac(d?.address))
      .map((d: any) => ({
        ...d,
        name: sanitizeDeviceName(d.name),
        address: d.address.toUpperCase(),
        isConnected: true,
        deviceType: typeof d.deviceType === 'string' ? d.deviceType : 'audio',
        batteryLevel:
          typeof d.batteryLevel === 'number' && d.batteryLevel >= 0 && d.batteryLevel <= 100
            ? Math.round(d.batteryLevel)
            : null,
      }));
  } catch (e) {
    devLog.error('[EarbudNative] Failed to get connected audio devices:', e);
    return [];
  }
}

/**
 * Listen for live ACL connect/disconnect events from Bluetooth audio devices.
 */
export function addConnectionListener(
  callback: (event: ConnectionChangeEvent) => void
): { remove: () => void } {
  if (!emitter) {
    return { remove: () => {} };
  }

  const subscription: EventSubscription = emitter.addListener(
    'onDeviceConnectionChanged',
    (event: ConnectionChangeEvent) => {
      if (!isValidMac(event?.address)) return;
      callback({
        ...event,
        name: sanitizeDeviceName(event.name),
        address: event.address.toUpperCase(),
      });
    }
  );

  return {
    remove: () => {
      subscription.remove();
    },
  };
}

/**
 * Listen for system Bluetooth on/off state changes.
 */
export function addBluetoothStateListener(
  callback: (event: BluetoothStateEvent) => void
): { remove: () => void } {
  if (!emitter) {
    return { remove: () => {} };
  }

  const subscription: EventSubscription = emitter.addListener(
    'onBluetoothStateChanged',
    callback
  );

  return {
    remove: () => {
      subscription.remove();
    },
  };
}

/**
 * Listen for device pairing/unpairing events.
 */
export function addBondStateListener(
  callback: () => void
): { remove: () => void } {
  if (!emitter) {
    return { remove: () => {} };
  }

  const subscription: EventSubscription = emitter.addListener(
    'onBondStateChanged',
    callback
  );

  return {
    remove: () => {
      subscription.remove();
    },
  };
}

/**
 * Listen for battery level update broadcasts.
 */
export function addBatteryListener(
  callback: (event: BatteryChangeEvent) => void
): { remove: () => void } {
  if (!emitter) {
    return { remove: () => {} };
  }

  const subscription: EventSubscription = emitter.addListener(
    'onBatteryLevelChanged',
    (event: BatteryChangeEvent) => {
      if (!isValidMac(event?.address)) return;
      const level =
        typeof event.batteryLevel === 'number' &&
        event.batteryLevel >= 0 &&
        event.batteryLevel <= 100
          ? Math.round(event.batteryLevel)
          : null;
      callback({
        ...event,
        address: event.address.toUpperCase(),
        batteryLevel: level,
      });
    }
  );

  return {
    remove: () => {
      subscription.remove();
    },
  };
}

/**
 * Stage 7: Listen for BLE RSSI scan events.
 */
export function addRssiListener(
  callback: (event: BleRssiEvent) => void
): { remove: () => void } {
  if (!emitter) {
    return { remove: () => {} };
  }

  const subscription: EventSubscription = emitter.addListener(
    'onBleRssiScanned',
    (event: BleRssiEvent) => {
      if (!isValidMac(event?.address)) return;
      const clampedRssi =
        typeof event.rssi === 'number'
          ? Math.max(-100, Math.min(-20, Math.round(event.rssi)))
          : -70;
      callback({
        address: event.address.toUpperCase(),
        rssi: clampedRssi,
      });
    }
  );

  return {
    remove: () => {
      subscription.remove();
    },
  };
}

/**
 * Stage 9: Check if device hardware audiofx Equalizer is available.
 */
export function isEqualizerAvailable(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return NativeModule?.isEqualizerAvailable() ?? false;
  } catch (e) {
    return false;
  }
}

/**
 * Stage 9: Get hardware Equalizer parameters (bands, min/max level, center frequencies).
 */
export function getEqualizerParameters(): EqualizerParameters | null {
  if (Platform.OS !== 'android') return null;
  try {
    return NativeModule?.getEqualizerParameters() ?? null;
  } catch (e) {
    return null;
  }
}

/**
 * Stage 9: Set specific band gain level in millibels.
 */
export function setEqualizerBandLevel(band: number, levelMB: number): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return NativeModule?.setEqualizerBandLevel(band, levelMB) ?? false;
  } catch (e) {
    return false;
  }
}

/**
 * Stage 9: Enable or disable equalizer engine.
 */
export function setEqualizerEnabled(enabled: boolean): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return NativeModule?.setEqualizerEnabled(enabled) ?? false;
  } catch (e) {
    return false;
  }
}

/**
 * Stage 10: Query active Bluetooth A2DP audio codec (LDAC, aptX, aptX HD, AAC, SBC, or Unknown).
 */
export async function getActiveAudioCodec(address: string): Promise<string> {
  if (Platform.OS !== 'android') return 'Unknown';
  if (!isValidMac(address)) return 'Unknown';
  try {
    return (await NativeModule?.getActiveAudioCodec(address.toUpperCase())) ?? 'Unknown';
  } catch (e) {
    return 'Unknown';
  }
}

/**
 * Personal Hearing Calibration (HearID): Play acoustic sine tone
 */
export function playCalibrationTone(
  frequencyHz: number,
  durationMs: number = 800,
  volumeDb: number = 20
): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return NativeModule?.playCalibrationTone(frequencyHz, durationMs, volumeDb) ?? false;
  } catch (e) {
    return false;
  }
}

/**
 * Personal Hearing Calibration (HearID): Stop playing acoustic sine tone
 */
export function stopCalibrationTone(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return NativeModule?.stopCalibrationTone() ?? false;
  } catch (e) {
    return false;
  }
}


