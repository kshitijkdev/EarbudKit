import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

function getNativeBridge() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../../modules/earbud-native');
  } catch (_e) {
    return {
      isEqualizerAvailable: () => false,
      getEqualizerParameters: () => null,
      setEqualizerBandLevel: () => false,
      setEqualizerEnabled: () => false,
    };
  }
}

export type EqPresetName = 'Flat' | 'Bass Boost' | 'Vocal' | 'Treble' | 'Custom';

export interface DeviceEqConfig {
  enabled: boolean;
  preset: EqPresetName;
  bandLevels: number[]; // in millibels (mB), e.g. 0 = 0dB, 600 = +6dB, -400 = -4dB
}

export const EQ_PRESETS: Record<Exclude<EqPresetName, 'Custom'>, number[]> = {
  Flat: [0, 0, 0, 0, 0],
  'Bass Boost': [600, 400, 0, 0, 0],
  Vocal: [-200, 200, 500, 300, -100],
  Treble: [-200, 0, 200, 500, 700],
};

export const DEFAULT_BAND_FREQUENCIES = [60, 230, 910, 3600, 14000]; // in Hz

export const DEFAULT_DEVICE_EQ: DeviceEqConfig = {
  enabled: false,
  preset: 'Flat',
  bandLevels: [0, 0, 0, 0, 0],
};

interface EqualizerState {
  isSupported: boolean;
  hasCheckedSupport: boolean;
  bandFrequencies: number[];
  minLevelMB: number;
  maxLevelMB: number;
  configs: Record<string, DeviceEqConfig>; // keyed by device MAC address

  // Actions
  checkEqualizerSupport: () => boolean;
  getDeviceConfig: (address: string) => DeviceEqConfig;
  setDeviceEqEnabled: (address: string, enabled: boolean) => void;
  setDevicePreset: (address: string, preset: EqPresetName) => void;
  setDeviceBandLevel: (address: string, bandIndex: number, levelMB: number) => void;
  applyToHardware: (address: string) => boolean;
}

export const useEqualizerStore = create<EqualizerState>()(
  persist(
    (set, get) => ({
      isSupported: false,
      hasCheckedSupport: false,
      bandFrequencies: DEFAULT_BAND_FREQUENCIES,
      minLevelMB: -1500,
      maxLevelMB: 1500,
      configs: {},

      checkEqualizerSupport: () => {
        const bridge = getNativeBridge();
        let supported = false;
        let minLevel = -1500;
        let maxLevel = 1500;
        let freqs = DEFAULT_BAND_FREQUENCIES;

        try {
          supported = bridge.isEqualizerAvailable();
          if (supported) {
            const params = bridge.getEqualizerParameters();
            if (params) {
              minLevel = params.minLevelMB ?? -1500;
              maxLevel = params.maxLevelMB ?? 1500;
              if (params.bands && params.bands.length > 0) {
                freqs = params.bands.map((b: { centerFreqHz: number }) => b.centerFreqHz);
              }
            }
          }
        } catch (e) {
          console.warn('[EqualizerStore] Error checking hardware equalizer:', e);
          supported = false;
        }

        set({
          isSupported: supported,
          hasCheckedSupport: true,
          minLevelMB: minLevel,
          maxLevelMB: maxLevel,
          bandFrequencies: freqs,
        });

        return supported;
      },

      getDeviceConfig: (address: string) => {
        const addr = address ? address.toUpperCase() : '';
        const configs = get().configs;
        if (!configs[addr]) {
          return { ...DEFAULT_DEVICE_EQ };
        }
        return configs[addr];
      },

      setDeviceEqEnabled: (address: string, enabled: boolean) => {
        const addr = address.toUpperCase();
        const current = get().getDeviceConfig(addr);
        const updated: DeviceEqConfig = {
          ...current,
          enabled,
        };

        set({
          configs: {
            ...get().configs,
            [addr]: updated,
          },
        });

        get().applyToHardware(addr);
      },

      setDevicePreset: (address: string, preset: EqPresetName) => {
        const addr = address.toUpperCase();
        const current = get().getDeviceConfig(addr);
        let newLevels = [...current.bandLevels];

        if (preset !== 'Custom') {
          const presetVals = EQ_PRESETS[preset];
          if (presetVals) {
            newLevels = [...presetVals];
          }
        }

        const updated: DeviceEqConfig = {
          ...current,
          preset,
          bandLevels: newLevels,
        };

        set({
          configs: {
            ...get().configs,
            [addr]: updated,
          },
        });

        if (updated.enabled) {
          get().applyToHardware(addr);
        }
      },

      setDeviceBandLevel: (address: string, bandIndex: number, levelMB: number) => {
        const addr = address.toUpperCase();
        const current = get().getDeviceConfig(addr);
        const minL = get().minLevelMB;
        const maxL = get().maxLevelMB;
        const clamped = Math.max(minL, Math.min(maxL, levelMB));

        const updatedLevels = [...current.bandLevels];
        updatedLevels[bandIndex] = clamped;

        const updated: DeviceEqConfig = {
          ...current,
          preset: 'Custom',
          bandLevels: updatedLevels,
        };

        set({
          configs: {
            ...get().configs,
            [addr]: updated,
          },
        });

        if (updated.enabled) {
          get().applyToHardware(addr);
        }
      },

      applyToHardware: (address: string) => {
        const { isSupported } = get();
        if (!isSupported) {
          return false;
        }

        const addr = address.toUpperCase();
        const bridge = getNativeBridge();
        const config = get().getDeviceConfig(addr);

        try {
          if (!config.enabled) {
            bridge.setEqualizerEnabled(false);
            return true;
          }

          bridge.setEqualizerEnabled(true);
          config.bandLevels.forEach((levelMB, bandIdx) => {
            bridge.setEqualizerBandLevel(bandIdx, levelMB);
          });
          return true;
        } catch (e) {
          console.warn('[EqualizerStore] Failed to apply EQ to hardware:', e);
          return false;
        }
      },
    }),
    {
      name: '@earbudkit/equalizer-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        configs: state.configs,
      }),
    }
  )
);
