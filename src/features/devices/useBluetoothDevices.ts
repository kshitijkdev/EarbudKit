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
  addBatteryListener,
  getDeviceBatteryLevel,
  getActiveAudioCodec,
  openBluetoothSettings,
} from '../../../modules/earbud-native';
import {
  useDeviceStore,
  useAutoStore,
  useEqualizerStore,
  useStatsStore,
} from '../../store';
import { captureCurrentLocation } from '../../services/location';

export function useBluetoothDevices() {
  const [bondedDevices, setBondedDevices] = useState<BondedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [lastEvent, setLastEvent] = useState<ConnectionChangeEvent | null>(null);

  const syncWithBondedDevices = useDeviceStore((s) => s.syncWithBondedDevices);
  const setConnectionState = useDeviceStore((s) => s.setConnectionState);
  const setBatteryLevel = useDeviceStore((s) => s.setBatteryLevel);

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
      syncWithBondedDevices(devices);

      // Fetch battery and codec for connected devices
      for (const dev of devices) {
        if (dev.isConnected) {
          getDeviceBatteryLevel(dev.address).then((lvl) => {
            if (lvl !== null) {
              setBatteryLevel(dev.address, lvl);
            }
          });
          getActiveAudioCodec(dev.address).then((codec) => {
            if (codec) {
              useDeviceStore.getState().setAudioCodec(dev.address, codec);
            }
          });
        }
      }
    } catch (err) {
      console.error('[EarbudKit] Error fetching bonded audio devices:', err);
    } finally {
      setIsLoading(false);
    }
  }, [syncWithBondedDevices, setBatteryLevel]);

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

      // Update native bonded list
      setBondedDevices((prev) =>
        prev.map((dev) =>
          dev.address.toLowerCase() === event.address.toLowerCase()
            ? { ...dev, isConnected: event.connected }
            : dev
        )
      );

      // Update Zustand persisted store
      setConnectionState(event.address, event.connected, event.isScreenOn);

      // Trigger per-device auto-action profile, EQ, session stats, and codec
      if (event.connected) {
        useAutoStore.getState().executeConnectProfile(event.address);
        useEqualizerStore.getState().applyToHardware(event.address);
        useStatsStore.getState().startListeningSession(event.address);

        // Query active codec immediately
        getActiveAudioCodec(event.address).then((codec) => {
          if (codec) {
            useDeviceStore.getState().setAudioCodec(event.address, codec);
          }
        });

        // If connected, query battery immediately
        getDeviceBatteryLevel(event.address).then((lvl) => {
          if (lvl !== null) {
            setBatteryLevel(event.address, lvl);
          }
        });
      } else {
        useAutoStore.getState().executeDisconnectProfile(event.address);
        useStatsStore.getState().stopListeningSession(event.address);

        // Stage 7: Capture last known location on disconnect
        captureCurrentLocation().then((loc) => {
          if (loc) {
            useDeviceStore.getState().setDeviceLocation(event.address, loc);
          }
        });
      }
    });

    // Listen for live battery level updates
    const batterySub = addBatteryListener((event) => {
      console.log(`[EarbudKit LIVE BATTERY] ${event.address} battery is now ${event.batteryLevel}%`);
      setBatteryLevel(event.address, event.batteryLevel);
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
      batterySub.remove();
      btStateSub.remove();
      bondSub.remove();
    };
  }, [checkAndRefresh, setConnectionState, setBatteryLevel]);

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
