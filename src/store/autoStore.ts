import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ConnectAction {
  enabled: boolean;
  launchAppPackage: string | null;
  launchAppLabel: string | null;
  setVolume: number | null; // 0-100 or null
  enableDnd: boolean;
}

export interface DisconnectAction {
  enabled: boolean;
  pauseMedia: boolean;
  setVolume: number | null; // 0-100 or null
  disableDnd: boolean;
}

export interface DeviceProfile {
  deviceAddress: string; // MAC address
  onConnect: ConnectAction;
  onDisconnect: DisconnectAction;
}

export interface AppOption {
  label: string;
  packageName: string;
  category: 'music' | 'podcast' | 'other';
  icon: string;
}

// Popular Android media and podcast apps
export const MEDIA_APP_OPTIONS: AppOption[] = [
  { label: 'Spotify', packageName: 'com.spotify.music', category: 'music', icon: '🎵' },
  { label: 'YouTube Music', packageName: 'com.google.android.apps.youtube.music', category: 'music', icon: '▶️' },
  { label: 'Apple Music', packageName: 'com.apple.android.music', category: 'music', icon: '🍎' },
  { label: 'Amazon Music', packageName: 'com.amazon.mp3', category: 'music', icon: '📦' },
  { label: 'Pocket Casts', packageName: 'au.com.shiftyjelly.pocketcasts', category: 'podcast', icon: '🎙️' },
  { label: 'Google Podcasts', packageName: 'com.google.android.apps.podcasts', category: 'podcast', icon: '🎧' },
  { label: 'Audible', packageName: 'com.audible.application', category: 'podcast', icon: '📖' },
  { label: 'VLC Player', packageName: 'org.videolan.vlc', category: 'other', icon: '🎞️' },
];

export function getDefaultProfileForDevice(
  address: string,
  deviceName: string = ''
): DeviceProfile {
  const lower = deviceName.toLowerCase();
  const isHeadphones =
    lower.includes('headphone') ||
    lower.includes('studio') ||
    lower.includes('h1') ||
    lower.includes('wh-') ||
    lower.includes('over-ear');

  if (isHeadphones) {
    // Headphones Preset: opens music app and sets volume to 70%
    return {
      deviceAddress: address.toUpperCase(),
      onConnect: {
        enabled: true,
        launchAppPackage: 'com.spotify.music',
        launchAppLabel: 'Spotify',
        setVolume: 70,
        enableDnd: false,
      },
      onDisconnect: {
        enabled: true,
        pauseMedia: true,
        setVolume: null,
        disableDnd: false,
      },
    };
  } else {
    // Earbuds Preset: opens podcast/music app and sets volume to 55%
    return {
      deviceAddress: address.toUpperCase(),
      onConnect: {
        enabled: true,
        launchAppPackage: 'au.com.shiftyjelly.pocketcasts',
        launchAppLabel: 'Pocket Casts',
        setVolume: 55,
        enableDnd: false,
      },
      onDisconnect: {
        enabled: true,
        pauseMedia: true,
        setVolume: null,
        disableDnd: false,
      },
    };
  }
}

// Safely resolve native functions to support both native runtime and test runners
function getNativeBridge() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../../modules/earbud-native');
  } catch (_e) {
    return {
      setMediaVolume: () => true,
      pauseMedia: () => true,
      launchApp: () => true,
      isDndPermissionGranted: () => true,
      setDndEnabled: () => true,
    };
  }
}

interface AutoState {
  profiles: Record<string, DeviceProfile>; // Keyed by MAC address

  // Actions
  getProfile: (address: string, deviceName?: string) => DeviceProfile;
  updateConnectAction: (
    address: string,
    action: Partial<ConnectAction>
  ) => void;
  updateDisconnectAction: (
    address: string,
    action: Partial<DisconnectAction>
  ) => void;
  executeConnectProfile: (
    address: string
  ) => Promise<{
    appLaunched: boolean;
    volumeSet: boolean;
    dndSet: boolean;
  }>;
  executeDisconnectProfile: (
    address: string
  ) => Promise<{
    mediaPaused: boolean;
    volumeReset: boolean;
    dndReset: boolean;
  }>;
}

export const useAutoStore = create<AutoState>()(
  persist(
    (set, get) => ({
      profiles: {},

      getProfile: (address, deviceName) => {
        const addr = address.toUpperCase();
        const existing = get().profiles[addr];
        if (existing) return existing;

        const defaultProfile = getDefaultProfileForDevice(addr, deviceName);
        set((state) => ({
          profiles: {
            ...state.profiles,
            [addr]: defaultProfile,
          },
        }));
        return defaultProfile;
      },

      updateConnectAction: (address, action) => {
        const addr = address.toUpperCase();
        set((state) => {
          const profile = state.profiles[addr] ?? getDefaultProfileForDevice(addr);
          return {
            profiles: {
              ...state.profiles,
              [addr]: {
                ...profile,
                onConnect: {
                  ...profile.onConnect,
                  ...action,
                },
              },
            },
          };
        });
      },

      updateDisconnectAction: (address, action) => {
        const addr = address.toUpperCase();
        set((state) => {
          const profile = state.profiles[addr] ?? getDefaultProfileForDevice(addr);
          return {
            profiles: {
              ...state.profiles,
              [addr]: {
                ...profile,
                onDisconnect: {
                  ...profile.onDisconnect,
                  ...action,
                },
              },
            },
          };
        });
      },

      executeConnectProfile: async (address) => {
        const addr = address.toUpperCase();
        const profile = get().profiles[addr];
        const result = { appLaunched: false, volumeSet: false, dndSet: false };

        if (!profile || !profile.onConnect.enabled) {
          console.log(`[AutoStore] Connect profile disabled or not found for ${addr}`);
          return result;
        }

        console.log(`[AutoStore] Executing Connect Profile for ${addr}:`, profile.onConnect);
        const bridge = getNativeBridge();

        // 1. Set media volume
        if (profile.onConnect.setVolume !== null && profile.onConnect.setVolume !== undefined) {
          result.volumeSet = bridge.setMediaVolume(profile.onConnect.setVolume);
          console.log(`[AutoStore] Set volume to ${profile.onConnect.setVolume}%: ${result.volumeSet}`);
        }

        // 2. Launch chosen app
        if (profile.onConnect.launchAppPackage) {
          result.appLaunched = bridge.launchApp(profile.onConnect.launchAppPackage);
          console.log(`[AutoStore] Launched ${profile.onConnect.launchAppPackage}: ${result.appLaunched}`);
        }

        // 3. Set Do Not Disturb if requested
        if (profile.onConnect.enableDnd) {
          if (bridge.isDndPermissionGranted()) {
            result.dndSet = bridge.setDndEnabled(true);
            console.log(`[AutoStore] Enabled DND: ${result.dndSet}`);
          } else {
            console.warn('[AutoStore] DND requested on connect but permission is not granted');
          }
        }

        return result;
      },

      executeDisconnectProfile: async (address) => {
        const addr = address.toUpperCase();
        const profile = get().profiles[addr];
        const result = { mediaPaused: false, volumeReset: false, dndReset: false };

        if (!profile || !profile.onDisconnect.enabled) {
          console.log(`[AutoStore] Disconnect profile disabled or not found for ${addr}`);
          return result;
        }

        console.log(`[AutoStore] Executing Disconnect Profile for ${addr}:`, profile.onDisconnect);
        const bridge = getNativeBridge();

        // 1. Pause media on disconnect
        if (profile.onDisconnect.pauseMedia) {
          result.mediaPaused = bridge.pauseMedia();
          console.log(`[AutoStore] Paused media on disconnect: ${result.mediaPaused}`);
        }

        // 2. Reset volume if configured
        if (profile.onDisconnect.setVolume !== null && profile.onDisconnect.setVolume !== undefined) {
          result.volumeReset = bridge.setMediaVolume(profile.onDisconnect.setVolume);
          console.log(`[AutoStore] Reset volume to ${profile.onDisconnect.setVolume}%: ${result.volumeReset}`);
        }

        // 3. Disable Do Not Disturb if configured
        if (profile.onDisconnect.disableDnd) {
          if (bridge.isDndPermissionGranted()) {
            result.dndReset = bridge.setDndEnabled(false);
            console.log(`[AutoStore] Disabled DND on disconnect: ${result.dndReset}`);
          }
        }

        return result;
      },
    }),
    {
      name: '@earbudkit/auto-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
