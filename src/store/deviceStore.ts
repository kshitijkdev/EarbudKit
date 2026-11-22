import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BondedDevice } from '../../modules/earbud-native';
import {
  sendLowBatteryNotification,
  sendDisconnectAlert,
} from '../services/notifications';

export type DeviceIconType = 'earbuds' | 'headphones';

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp: number;
  addressText?: string | null;
}

export interface TrackedDevice {
  address: string; // MAC address as unique key
  name: string; // Original Bluetooth device name
  nickname: string; // User-customized name
  icon: DeviceIconType; // User-selected icon
  isActive: boolean; // Marked as currently active target device
  isConnected: boolean; // Current connection status
  batteryLevel: number | null; // Battery percentage (0-100) or null
  lowBatteryThreshold: number; // Alert threshold % (default 20)
  batteryAlertSent: boolean; // Prevent repeating alert until recharged
  disconnectAlertEnabled: boolean; // Alert when disconnected while in use
  lastLocation: DeviceLocation | null; // Stage 7: Last known location
  audioCodec?: string | null; // Stage 10: Active audio codec (LDAC, aptX, aptX HD, AAC, SBC, or Unknown)
  addedAt: number; // Timestamp when added
  lastConnectedAt: number | null; // Timestamp of last connect
  lastDisconnectedAt: number | null; // Timestamp of last disconnect
}

interface DeviceState {
  trackedDevices: Record<string, TrackedDevice>; // Keyed by MAC address
  ignoredDevices: string[]; // MAC addresses explicitly removed by the user
  activeDeviceAddress: string | null;

  // Actions
  addTrackedDevice: (device: {
    address: string;
    name: string;
    nickname?: string;
    icon?: DeviceIconType;
    isConnected?: boolean;
    batteryLevel?: number | null;
    audioCodec?: string | null;
    lowBatteryThreshold?: number;
    disconnectAlertEnabled?: boolean;
    lastLocation?: DeviceLocation | null;
  }) => void;
  removeTrackedDevice: (address: string) => void;
  unignoreDevice: (address: string) => void;
  updateNickname: (address: string, nickname: string) => void;
  updateIcon: (address: string, icon: DeviceIconType) => void;
  setAudioCodec: (address: string, codec: string | null) => void;
  setLowBatteryThreshold: (address: string, threshold: number) => void;
  setDisconnectAlert: (address: string, enabled: boolean) => void;
  setDeviceLocation: (address: string, location: DeviceLocation) => void;
  setActiveDevice: (address: string | null) => void;
  setConnectionState: (
    address: string,
    isConnected: boolean,
    isScreenOn?: boolean
  ) => void;
  setBatteryLevel: (address: string, batteryLevel: number | null) => void;
  triggerTestLowBatteryAlert: (address: string) => Promise<boolean>;
  triggerTestDisconnectAlert: (address: string) => Promise<boolean>;
  syncWithBondedDevices: (bonded: BondedDevice[]) => void;
  reconcileDevices: (connected: BondedDevice[], bonded: BondedDevice[]) => void;
  getTrackedDeviceList: () => TrackedDevice[];
  getTrackedDevice: (address: string) => TrackedDevice | undefined;
  getActiveDevice: () => TrackedDevice | undefined;
}

// Helper to deduce initial icon from name
export function deduceDeviceIcon(name: string): DeviceIconType {
  const lower = name.toLowerCase();
  if (
    lower.includes('headphone') ||
    lower.includes('studio') ||
    lower.includes('h1') ||
    lower.includes('wh-') ||
    lower.includes('over-ear') ||
    lower.includes('around-ear')
  ) {
    return 'headphones';
  }
  return 'earbuds';
}

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set, get) => ({
      trackedDevices: {},
      ignoredDevices: [],
      activeDeviceAddress: null,

      addTrackedDevice: (device) => {
        const address = device.address.toUpperCase();
        const existing = get().trackedDevices[address];
        const icon = device.icon ?? deduceDeviceIcon(device.name);
        const nickname = device.nickname?.trim() || existing?.nickname || device.name;

        const newDevice: TrackedDevice = {
          address,
          name: device.name,
          nickname,
          icon,
          isActive: existing?.isActive ?? (get().activeDeviceAddress === null),
          isConnected: device.isConnected ?? existing?.isConnected ?? false,
          batteryLevel: device.batteryLevel ?? existing?.batteryLevel ?? null,
          lowBatteryThreshold:
            device.lowBatteryThreshold ?? existing?.lowBatteryThreshold ?? 20,
          batteryAlertSent: existing?.batteryAlertSent ?? false,
          disconnectAlertEnabled:
            device.disconnectAlertEnabled ??
            existing?.disconnectAlertEnabled ??
            true,
          lastLocation: device.lastLocation ?? existing?.lastLocation ?? null,
          audioCodec: device.audioCodec ?? existing?.audioCodec ?? null,
          addedAt: existing?.addedAt ?? Date.now(),
          lastConnectedAt: existing?.lastConnectedAt ?? null,
          lastDisconnectedAt: existing?.lastDisconnectedAt ?? null,
        };

        set((state) => {
          const isFirstDevice = Object.keys(state.trackedDevices).length === 0;
          return {
            trackedDevices: {
              ...state.trackedDevices,
              [address]: newDevice,
            },
            ignoredDevices: state.ignoredDevices.filter((a) => a !== address),
            activeDeviceAddress:
              state.activeDeviceAddress === null || isFirstDevice
                ? address
                : state.activeDeviceAddress,
          };
        });
      },

      removeTrackedDevice: (address) => {
        const addr = address.toUpperCase();
        set((state) => {
          const next = { ...state.trackedDevices };
          delete next[addr];

          let nextActive = state.activeDeviceAddress;
          if (nextActive === addr) {
            const remainingKeys = Object.keys(next);
            nextActive = remainingKeys.length > 0 ? remainingKeys[0] : null;
          }

          const nextIgnored = state.ignoredDevices.includes(addr)
            ? state.ignoredDevices
            : [...state.ignoredDevices, addr];

          return {
            trackedDevices: next,
            activeDeviceAddress: nextActive,
            ignoredDevices: nextIgnored,
          };
        });
      },

      unignoreDevice: (address) => {
        const addr = address.toUpperCase();
        set((state) => ({
          ignoredDevices: state.ignoredDevices.filter((a) => a !== addr),
        }));
      },

      updateNickname: (address, nickname) => {
        const addr = address.toUpperCase();
        set((state) => {
          const device = state.trackedDevices[addr];
          if (!device) return state;

          return {
            trackedDevices: {
              ...state.trackedDevices,
              [addr]: {
                ...device,
                nickname: nickname.trim() || device.name,
              },
            },
          };
        });
      },

      updateIcon: (address, icon) => {
        const addr = address.toUpperCase();
        set((state) => {
          const device = state.trackedDevices[addr];
          if (!device) return state;

          return {
            trackedDevices: {
              ...state.trackedDevices,
              [addr]: {
                ...device,
                icon,
              },
            },
          };
        });
      },

      setAudioCodec: (address, codec) => {
        const addr = address.toUpperCase();
        set((state) => {
          const device = state.trackedDevices[addr];
          if (!device) return state;

          return {
            trackedDevices: {
              ...state.trackedDevices,
              [addr]: {
                ...device,
                audioCodec: codec,
              },
            },
          };
        });
      },

      setLowBatteryThreshold: (address, threshold) => {
        const addr = address.toUpperCase();
        set((state) => {
          const device = state.trackedDevices[addr];
          if (!device) return state;

          return {
            trackedDevices: {
              ...state.trackedDevices,
              [addr]: {
                ...device,
                lowBatteryThreshold: threshold,
              },
            },
          };
        });
      },

      setDisconnectAlert: (address, enabled) => {
        const addr = address.toUpperCase();
        set((state) => {
          const device = state.trackedDevices[addr];
          if (!device) return state;

          return {
            trackedDevices: {
              ...state.trackedDevices,
              [addr]: {
                ...device,
                disconnectAlertEnabled: enabled,
              },
            },
          };
        });
      },

      setDeviceLocation: (address, location) => {
        const addr = address.toUpperCase();
        set((state) => {
          const device = state.trackedDevices[addr];
          if (!device) return state;

          return {
            trackedDevices: {
              ...state.trackedDevices,
              [addr]: {
                ...device,
                lastLocation: location,
              },
            },
          };
        });
      },

      setActiveDevice: (address) => {
        const addr = address ? address.toUpperCase() : null;
        set((state) => {
          const updatedDevices = { ...state.trackedDevices };
          for (const key of Object.keys(updatedDevices)) {
            updatedDevices[key] = {
              ...updatedDevices[key],
              isActive: key === addr,
            };
          }

          return {
            activeDeviceAddress: addr,
            trackedDevices: updatedDevices,
          };
        });
      },

      setConnectionState: (address, isConnected, isScreenOn = true) => {
        const addr = address.toUpperCase();
        const now = Date.now();
        const device = get().trackedDevices[addr];
        if (!device) return;

        const wasConnected = device.isConnected;

        set((state) => ({
          trackedDevices: {
            ...state.trackedDevices,
            [addr]: {
              ...state.trackedDevices[addr],
              isConnected,
              lastConnectedAt: isConnected ? now : device.lastConnectedAt,
              lastDisconnectedAt: !isConnected ? now : device.lastDisconnectedAt,
            },
          },
        }));

        // Fire disconnect alert if device dropped while phone was in active use
        if (wasConnected && !isConnected && device.disconnectAlertEnabled && isScreenOn) {
          sendDisconnectAlert(device.nickname, device.lastLocation?.addressText);
        }
      },

      setBatteryLevel: (address, batteryLevel) => {
        const addr = address.toUpperCase();
        const current = get().trackedDevices[addr];
        if (!current) return;

        let shouldAlert = false;
        let nextAlertSent = current.batteryAlertSent;

        if (batteryLevel !== null) {
          if (batteryLevel <= current.lowBatteryThreshold && !current.batteryAlertSent) {
            shouldAlert = true;
            nextAlertSent = true;
          } else if (batteryLevel > current.lowBatteryThreshold + 5) {
            nextAlertSent = false;
          }
        }

        set((state) => ({
          trackedDevices: {
            ...state.trackedDevices,
            [addr]: {
              ...state.trackedDevices[addr],
              batteryLevel,
              batteryAlertSent: nextAlertSent,
            },
          },
        }));

        if (shouldAlert && batteryLevel !== null) {
          sendLowBatteryNotification(
            current.nickname,
            batteryLevel,
            current.lowBatteryThreshold
          );
        }
      },

      triggerTestLowBatteryAlert: async (address) => {
        const addr = address.toUpperCase();
        const device = get().trackedDevices[addr];
        if (!device) return false;

        const testLevel = Math.min(device.lowBatteryThreshold, 15);
        return await sendLowBatteryNotification(
          device.nickname,
          testLevel,
          device.lowBatteryThreshold
        );
      },

      triggerTestDisconnectAlert: async (address) => {
        const addr = address.toUpperCase();
        const device = get().trackedDevices[addr];
        if (!device) return false;

        return await sendDisconnectAlert(
          device.nickname,
          device.lastLocation?.addressText ?? 'Saved Coordinates'
        );
      },

      syncWithBondedDevices: (bonded) => {
        set((state) => {
          let hasChanges = false;
          const next = { ...state.trackedDevices };

          for (const item of bonded) {
            const addr = item.address.toUpperCase();
            if (next[addr]) {
              const current = next[addr];
              const newBattery =
                item.batteryLevel !== undefined
                  ? item.batteryLevel
                  : current.batteryLevel;
              const newCodec =
                item.codec !== undefined ? item.codec : current.audioCodec;

              if (
                current.isConnected !== item.isConnected ||
                current.name !== item.name ||
                current.batteryLevel !== newBattery ||
                current.audioCodec !== newCodec
              ) {
                hasChanges = true;
                next[addr] = {
                  ...current,
                  name: item.name,
                  isConnected: item.isConnected,
                  batteryLevel: newBattery,
                  audioCodec: newCodec,
                };
              }
            }
          }

          return hasChanges ? { trackedDevices: next } : state;
        });
      },

      reconcileDevices: (connected: BondedDevice[], bonded: BondedDevice[]) => {
        const connectedMap = new Map<string, BondedDevice>();
        for (const dev of connected) {
          connectedMap.set(dev.address.toUpperCase(), dev);
        }

        const bondedMap = new Map<string, BondedDevice>();
        for (const dev of bonded) {
          bondedMap.set(dev.address.toUpperCase(), dev);
        }

        set((state) => {
          let hasChanges = false;
          const nextTracked = { ...state.trackedDevices };
          const ignoredSet = new Set(state.ignoredDevices);

          // 1. Auto-track any connected audio device not yet tracked and not ignored
          for (const [addr, cDev] of connectedMap.entries()) {
            if (!nextTracked[addr] && !ignoredSet.has(addr)) {
              hasChanges = true;
              const icon: DeviceIconType =
                cDev.deviceType === 'headphones' ? 'headphones' : deduceDeviceIcon(cDev.name);
              nextTracked[addr] = {
                address: addr,
                name: cDev.name,
                nickname: cDev.name,
                icon,
                isActive: Object.keys(nextTracked).length === 0,
                isConnected: true,
                batteryLevel: cDev.batteryLevel ?? null,
                lowBatteryThreshold: 20,
                batteryAlertSent: false,
                disconnectAlertEnabled: true,
                lastLocation: null,
                audioCodec: cDev.codec ?? null,
                addedAt: Date.now(),
                lastConnectedAt: Date.now(),
                lastDisconnectedAt: null,
              };
            }
          }

          // 2. Reconcile live connection status for all tracked devices
          for (const [addr, tracked] of Object.entries(nextTracked)) {
            const isNowConnected = connectedMap.has(addr);
            const cDev = connectedMap.get(addr);
            const bDev = bondedMap.get(addr);
            const latestName = cDev?.name || bDev?.name || tracked.name;
            const latestBattery =
              cDev?.batteryLevel !== undefined && cDev.batteryLevel !== null
                ? cDev.batteryLevel
                : (bDev?.batteryLevel !== undefined ? bDev.batteryLevel : tracked.batteryLevel);
            const latestCodec =
              cDev?.codec !== undefined && cDev.codec !== null
                ? cDev.codec
                : (bDev?.codec !== undefined ? bDev.codec : tracked.audioCodec);

            if (
              tracked.isConnected !== isNowConnected ||
              tracked.name !== latestName ||
              tracked.batteryLevel !== latestBattery ||
              tracked.audioCodec !== latestCodec
            ) {
              hasChanges = true;
              nextTracked[addr] = {
                ...tracked,
                name: latestName,
                isConnected: isNowConnected,
                batteryLevel: latestBattery,
                audioCodec: latestCodec,
                lastConnectedAt: isNowConnected
                  ? (tracked.isConnected ? tracked.lastConnectedAt : Date.now())
                  : tracked.lastConnectedAt,
                lastDisconnectedAt: !isNowConnected
                  ? (tracked.isConnected ? Date.now() : tracked.lastDisconnectedAt)
                  : tracked.lastDisconnectedAt,
              };
            }
          }

          // 3. Ensure activeDeviceAddress prioritizes currently connected device
          let nextActive = state.activeDeviceAddress;
          const trackedKeys = Object.keys(nextTracked);
          if (!nextActive || !nextTracked[nextActive] || !nextTracked[nextActive].isConnected) {
            const firstConnected = trackedKeys.find((k) => nextTracked[k].isConnected);
            if (firstConnected && firstConnected !== nextActive) {
              nextActive = firstConnected;
              hasChanges = true;
            } else if (!nextActive && trackedKeys.length > 0) {
              nextActive = trackedKeys[0];
              hasChanges = true;
            }
          }

          if (hasChanges) {
            for (const key of Object.keys(nextTracked)) {
              nextTracked[key] = {
                ...nextTracked[key],
                isActive: key === nextActive,
              };
            }
            return {
              trackedDevices: nextTracked,
              activeDeviceAddress: nextActive,
            };
          }

          return state;
        });
      },

      getTrackedDeviceList: () => {
        return Object.values(get().trackedDevices);
      },

      getTrackedDevice: (address) => {
        return get().trackedDevices[address.toUpperCase()];
      },

      getActiveDevice: () => {
        const activeAddr = get().activeDeviceAddress;
        if (!activeAddr) return undefined;
        return get().trackedDevices[activeAddr];
      },
    }),
    {
      name: '@earbudkit/devices-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        trackedDevices: state.trackedDevices,
        ignoredDevices: state.ignoredDevices,
        activeDeviceAddress: state.activeDeviceAddress,
      }),
    }
  )
);
