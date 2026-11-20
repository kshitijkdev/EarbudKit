import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  BondedDevice,
  ConnectionChangeEvent,
  getBondedAudioDevices,
  hasBluetoothPermission,
  isBluetoothEnabled,
  requestBluetoothPermissions,
  addConnectionListener,
  addBluetoothStateListener,
  addBondStateListener,
  openBluetoothSettings,
} from '../../../modules/earbud-native';

export function useBluetoothDevices() {
  const [bondedDevices, setBondedDevices] = useState<BondedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [lastEvent, setLastEvent] = useState<ConnectionChangeEvent | null>(null);

  const checkAndRefresh = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    const hasPerm = hasBluetoothPermission();
    setPermissionGranted(hasPerm);

    const isBtOn = isBluetoothEnabled();
    setBluetoothEnabled(isBtOn);

    if (!hasPerm) {
      console.log('[EarbudKit] Bluetooth permission not granted yet.');
      return;
    }

    setIsLoading(true);
    try {
      const devices = await getBondedAudioDevices();
      console.log(`[EarbudKit] Fetched ${devices.length} bonded audio device(s):`, devices);
      setBondedDevices(devices);
    } catch (err) {
      console.error('[EarbudKit] Error fetching bonded audio devices:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await requestBluetoothPermissions();
    setPermissionGranted(granted);
    if (granted) {
      await checkAndRefresh();
    }
    return granted;
  }, [checkAndRefresh]);

  useEffect(() => {
    // Initial check
    checkAndRefresh();

    // Listen for live ACL connection changes
    const connSub = addConnectionListener((event) => {
      console.log(`[EarbudKit LIVE EVENT] ${event.name} (${event.address}) is now ${event.connected ? 'CONNECTED' : 'DISCONNECTED'}`);
      setLastEvent(event);

      // Update connection state in list
      setBondedDevices((prev) =>
        prev.map((dev) =>
          dev.address.toLowerCase() === event.address.toLowerCase()
            ? { ...dev, isConnected: event.connected }
            : dev
        )
      );
    });

    // Listen for Bluetooth state changes (on/off)
    const btStateSub = addBluetoothStateListener((event) => {
      console.log(`[EarbudKit BT STATE] Bluetooth is now ${event.enabled ? 'ON' : 'OFF'}`);
      setBluetoothEnabled(event.enabled);
      if (event.enabled) {
        checkAndRefresh();
      }
    });

    // Listen for bonding state changes (device paired/unpaired)
    const bondSub = addBondStateListener(() => {
      console.log('[EarbudKit] Bonding state changed, refreshing devices...');
      checkAndRefresh();
    });

    return () => {
      connSub.remove();
      btStateSub.remove();
      bondSub.remove();
    };
  }, [checkAndRefresh]);

  return {
    bondedDevices,
    isLoading,
    permissionGranted,
    bluetoothEnabled,
    lastEvent,
    refresh: checkAndRefresh,
    requestPermission,
    openSettings: openBluetoothSettings,
  };
}
