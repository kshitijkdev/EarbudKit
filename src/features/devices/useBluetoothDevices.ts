import { useState, useEffect, useCallback } from 'react';
import { Platform, AppState, Alert } from 'react-native';
import {
  BondedDevice,
  ConnectionChangeEvent,
  getBondedAudioDevices,
  getConnectedAudioDevices,
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
  openAppSettings,
} from '../../../modules/earbud-native';
import {
  useDeviceStore,
  useAutoStore,
  useEqualizerStore,
  useStatsStore,
  habitStore,
  useHearingCalibrationStore,
} from '../../store';
import { captureCurrentLocation } from '../../services/location';
import { safeLog, maskMac, sanitizeDeviceName } from '../../utils/security';

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
      safeLog.log('[EarbudKit] Bluetooth permission not granted yet.');
      return;
    }

    setIsLoading(true);
    try {
      const [connected, bonded] = await Promise.all([
        getConnectedAudioDevices(),
        getBondedAudioDevices(),
      ]);
      safeLog.log(`[EarbudKit] Reconciled ${connected.length} connected, ${bonded.length} bonded audio device(s)`);
      setBondedDevices(bonded);

      // Live reconcile in Zustand store
      useDeviceStore.getState().reconcileDevices(connected, bonded);

      // Fetch battery, codec, location, and start listening session for connected devices
      for (const dev of connected) {
        const upperAddr = dev.address.toUpperCase();
        const currentStats = useStatsStore.getState().stats[upperAddr];
        if (!currentStats || currentStats.sessionStartTimestamp === null) {
          useStatsStore.getState().startListeningSession(dev.address);
        }

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
        captureCurrentLocation().then((loc) => {
          if (loc) {
            useDeviceStore.getState().setDeviceLocation(dev.address, loc);
          }
        });
      }
    } catch (err) {
      safeLog.error('[EarbudKit] Error reconciling audio devices:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setBatteryLevel]);

  const requestPermission = useCallback(async () => {
    const granted = await requestBluetoothPermissions();
    const hasPerm = hasBluetoothPermission();
    const isGranted = granted || hasPerm;
    setPermissionGranted(isGranted);

    if (isGranted) {
      await checkAndRefresh();
    } else {
      Alert.alert(
        'Bluetooth Permission Required',
        'Bluetooth permission is required to detect and manage your connected audio devices. Please grant the Bluetooth permission in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'App Settings', onPress: () => openAppSettings() },
          { text: 'Bluetooth Settings', onPress: () => openBluetoothSettings() },
        ]
      );
    }
    return isGranted;
  }, [checkAndRefresh]);

  useEffect(() => {
    // Initial check
    checkAndRefresh();

    // Listen for live ACL connection changes
    const connSub = addConnectionListener((event) => {
      safeLog.log(`[EarbudKit LIVE EVENT] ${sanitizeDeviceName(event.name)} (${maskMac(event.address)}) is now ${event.connected ? 'CONNECTED' : 'DISCONNECTED'}`);
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
        habitStore.getState().recordSessionEvent({ deviceAddress: event.address });
        habitStore.getState().evaluateCurrentRoutine(event.address);
        useHearingCalibrationStore.getState().applyProfile(event.address);

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

      // Reconcile complete device state
      checkAndRefresh();
    });

    // Listen for live battery level updates
    const batterySub = addBatteryListener((event) => {
      safeLog.log(`[EarbudKit LIVE BATTERY] ${maskMac(event.address)} battery is now ${event.batteryLevel}%`);
      setBatteryLevel(event.address, event.batteryLevel);
    });

    // Listen for Bluetooth state changes (on/off)
    const btStateSub = addBluetoothStateListener((event) => {
      safeLog.log(`[EarbudKit BT STATE] Bluetooth is now ${event.enabled ? 'ON' : 'OFF'}`);
      setBluetoothEnabled(event.enabled);
      checkAndRefresh();
    });

    // Listen for bonding state changes (device paired/unpaired)
    const bondSub = addBondStateListener(() => {
      safeLog.log('[EarbudKit] Bonding state changed, refreshing devices...');
      checkAndRefresh();
    });

    // Listen for AppState changes to re-check permissions when returning from Settings
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        safeLog.log('[EarbudKit] App became active, checking Bluetooth permissions...');
        checkAndRefresh();
      }
    });

    return () => {
      connSub.remove();
      batterySub.remove();
      btStateSub.remove();
      bondSub.remove();
      appStateSub.remove();
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
