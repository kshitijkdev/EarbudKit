/**
 * Personal Hearing Calibration (Audiogram & Auto-EQ / HearID Engine)
 * Interactive frequency tone hearing test (250Hz to 8kHz).
 * Generates and applies a custom compensation curve to the 5-band Equalizer per device MAC.
 * Works universally on any Bluetooth audio device (100% on-device).
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEqualizerStore } from './equalizerStore';

export const TEST_FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000] as const;

export interface HearingProfile {
  deviceAddress: string;
  calibratedAt: number;
  thresholds: Record<number, number>; // frequency -> hearing threshold (dB)
  compensationCurve: number[];        // 5 equalizer band gains in dB (-6 to +8)
  enabled: boolean;
}

interface HearingCalibrationState {
  profiles: Record<string, HearingProfile>; // MAC -> Profile
  isTesting: boolean;
  currentFreqIndex: number;
  currentTestVolumeDb: number; // starts soft, ramps up
  tempThresholds: Record<number, number>;
  activeProfile: HearingProfile | null;

  // Actions
  startTest: () => void;
  registerHearingResponse: (heard: boolean, deviceAddress: string) => Promise<void>;
  cancelTest: () => void;
  applyProfile: (deviceAddress: string) => Promise<boolean>;
  toggleProfileEnabled: (deviceAddress: string, enabled: boolean) => Promise<void>;
  resetProfile: (deviceAddress: string) => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const HEARING_STORAGE_KEY = '@earbudkit/hearing-calibration';

/**
 * Calculates optimal 5-band EQ compensation curve from audiogram thresholds.
 * Equalizer bands: [60Hz, 230Hz, 910Hz, 3600Hz, 14000Hz]
 */
export function calculateCompensationCurve(thresholds: Record<number, number>): number[] {
  const t250 = thresholds[250] ?? 20;
  const t500 = thresholds[500] ?? 20;
  const t1000 = thresholds[1000] ?? 20;
  const t2000 = thresholds[2000] ?? 20;
  const t4000 = thresholds[4000] ?? 20;
  const t8000 = thresholds[8000] ?? 20;

  // Baseline reference is 1000Hz (human vocal intelligibility core)
  const baseline = t1000;

  // Map hearing deficits to gentle equalization boosts/cuts (50% compensation factor to prevent ear fatigue)
  const clampGain = (val: number) => Math.min(Math.max(Math.round(val), -6), 8);

  const band0_60Hz = clampGain((t250 - baseline) * 0.35);
  const band1_230Hz = clampGain((((t250 + t500) / 2) - baseline) * 0.45);
  const band2_910Hz = 0; // anchor band
  const band3_3600Hz = clampGain((((t2000 + t4000) / 2) - baseline) * 0.55);
  const band4_14000Hz = clampGain((((t4000 + t8000) / 2) - baseline) * 0.50);

  return [band0_60Hz, band1_230Hz, band2_910Hz, band3_3600Hz, band4_14000Hz];
}

export const useHearingCalibrationStore = create<HearingCalibrationState>((set, get) => ({
  profiles: {},
  isTesting: false,
  currentFreqIndex: 0,
  currentTestVolumeDb: 10,
  tempThresholds: {},
  activeProfile: null,

  loadFromStorage: async () => {
    try {
      const raw = await AsyncStorage.getItem(HEARING_STORAGE_KEY);
      if (raw) {
        const profiles = JSON.parse(raw);
        set({ profiles });
      }
    } catch {
      // Memory fallback
    }
  },

  startTest: () => {
    set({
      isTesting: true,
      currentFreqIndex: 0,
      currentTestVolumeDb: 10,
      tempThresholds: {},
    });
  },

  registerHearingResponse: async (heard: boolean, deviceAddress: string) => {
    const { currentFreqIndex, currentTestVolumeDb, tempThresholds } = get();
    const freq = TEST_FREQUENCIES[currentFreqIndex];

    if (!heard && currentTestVolumeDb < 45) {
      // User didn't hear tone yet: ramp volume up by 10dB
      set({ currentTestVolumeDb: currentTestVolumeDb + 10 });
      return;
    }

    // Tone was heard or max volume reached: record threshold for current frequency
    const updatedThresholds = {
      ...tempThresholds,
      [freq]: currentTestVolumeDb,
    };

    if (currentFreqIndex < TEST_FREQUENCIES.length - 1) {
      // Proceed to next test frequency
      set({
        currentFreqIndex: currentFreqIndex + 1,
        currentTestVolumeDb: 10,
        tempThresholds: updatedThresholds,
      });
    } else {
      // Calibration completed across all frequencies! Compute compensation curve.
      const curve = calculateCompensationCurve(updatedThresholds);
      const profile: HearingProfile = {
        deviceAddress: deviceAddress.toUpperCase(),
        calibratedAt: Date.now(),
        thresholds: updatedThresholds,
        compensationCurve: curve,
        enabled: true,
      };

      const profiles = {
        ...get().profiles,
        [profile.deviceAddress]: profile,
      };

      set({
        profiles,
        activeProfile: profile,
        isTesting: false,
        currentFreqIndex: 0,
      });

      try {
        await AsyncStorage.setItem(HEARING_STORAGE_KEY, JSON.stringify(profiles));
      } catch {
        // Ephemeral
      }

      // Automatically apply to hardware equalizer
      await get().applyProfile(deviceAddress);
    }
  },

  cancelTest: () => {
    set({
      isTesting: false,
      currentFreqIndex: 0,
      currentTestVolumeDb: 10,
      tempThresholds: {},
    });
  },

  applyProfile: async (deviceAddress: string) => {
    const addr = deviceAddress.toUpperCase();
    const profile = get().profiles[addr];
    if (!profile || !profile.enabled) return false;

    // Apply 5 bands to equalizerStore
    const eq = useEqualizerStore.getState();
    profile.compensationCurve.forEach((gainDb, index) => {
      // equalizerStore uses milliBels (1 dB = 100 mB)
      eq.setDeviceBandLevel(addr, index, gainDb * 100);
    });
    eq.setDevicePreset(addr, 'Custom');
    eq.setDeviceEqEnabled(addr, true);

    return true;
  },

  toggleProfileEnabled: async (deviceAddress: string, enabled: boolean) => {
    const addr = deviceAddress.toUpperCase();
    const profile = get().profiles[addr];
    if (!profile) return;

    const updatedProfile = { ...profile, enabled };
    const profiles = { ...get().profiles, [addr]: updatedProfile };
    set({ profiles, activeProfile: updatedProfile });

    try {
      await AsyncStorage.setItem(HEARING_STORAGE_KEY, JSON.stringify(profiles));
    } catch {}

    if (enabled) {
      await get().applyProfile(addr);
    } else {
      // Reset EQ to Flat
      useEqualizerStore.getState().setDevicePreset(addr, 'Flat');
    }
  },

  resetProfile: async (deviceAddress: string) => {
    const addr = deviceAddress.toUpperCase();
    const profiles = { ...get().profiles };
    delete profiles[addr];
    set({ profiles, activeProfile: null });
    await AsyncStorage.setItem(HEARING_STORAGE_KEY, JSON.stringify(profiles)).catch(() => {});
  },
}));
