import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BondedDevice } from '../../modules/earbud-native';
import { sendLowBatteryNotification } from '../services/notifications';

export type DeviceIconType = 'earbuds' | 'headphones';

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
  addedAt: number; // Timestamp when added
  lastConnectedAt: number | null; // Timestamp of last connect
  lastDisconnectedAt: number | null; // Timestamp of last disconnect
}

interface DeviceState {
  trackedDevices: Record<string, TrackedDevice>; // Keyed by MAC address
  activeDeviceAddress: string | null;

  // Actions
  addTrackedDevice: (device: {
    address: string;
    name: string;
    nickname?: string;
    icon?: DeviceIconType;
    isConnected?: boolean;
    batteryLevel?: number | null;
    lowBatteryThreshold?: number;
  }) => void;
  removeTrackedDevice: (address: string) => void;
  updateNickname: (address: string, nickname: string) => void;
  updateIcon: (address: string, icon: DeviceIconType) => void;
  setLowBatteryThreshold: (address: string, threshold: number) => void;
  setActiveDevice: (address: string | null) => void;
  setConnectionState: (address: string, isConnected: boolean) => void;
  setBatteryLevel: (address: string, batteryLevel: number | null) => void;
  triggerTestLowBatteryAlert: (address: string) => Promise<boolean>;
  syncWithBondedDevices: (bonded: BondedDevice[]) => void;
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

          return {
            trackedDevices: next,
            activeDeviceAddress: nextActive,
          };
        });
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

      setConnectionState: (address, isConnected) => {
        const addr = address.toUpperCase();
        const now = Date.now();
        set((state) => {
          const device = state.trackedDevices[addr];
          if (!device) return state;

          return {
            trackedDevices: {
              ...state.trackedDevices,
              [addr]: {
                ...device,
                isConnected,
                lastConnectedAt: isConnected ? now : device.lastConnectedAt,
                lastDisconnectedAt: !isConnected ? now : device.lastDisconnectedAt,
              },
            },
          };
        });
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
            // Recharged, re-arm alert
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

              if (
                current.isConnected !== item.isConnected ||
                current.name !== item.name ||
                current.batteryLevel !== newBattery
              ) {
                hasChanges = true;
                next[addr] = {
                  ...current,
                  name: item.name,
                  isConnected: item.isConnected,
                  batteryLevel: newBattery,
                };
              }
            }
          }

          return hasChanges ? { trackedDevices: next } : state;
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
    }
  )
);
