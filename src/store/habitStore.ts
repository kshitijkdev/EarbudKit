/**
 * Smart Habit Predictor (Adaptive Context Engine / Smart Handshake)
 * Lightweight, zero-bloat on-device frequency matrix (< 5 KB in local storage).
 * Learns time-of-day listening patterns (morning podcasts, evening workouts, late-night sleep timer).
 * Surfaces a 1-tap "Smart Handshake" routine capsule on the Home screen.
 * 100% on-device privacy, zero background battery drain.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSleepTimerStore } from './sleepTimerStore';
import { safeLog } from '../utils/security';

function getNativeBridge() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../../modules/earbud-native');
  } catch (_e) {
    return {
      setMediaVolume: () => true,
      launchApp: () => true,
      isDndPermissionGranted: () => true,
      setDndEnabled: () => true,
    };
  }
}

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';
export type DayType = 'weekday' | 'weekend';

export interface HabitPattern {
  app?: string;
  volume: number;
  dnd: boolean;
  sleepMinutes?: number;
  frequency: number;
}

export interface SmartRoutine {
  id: string;
  title: string;
  subtitle: string;
  confidenceMatch: number; // e.g. 94 (percentage)
  timeSlot: TimeSlot;
  app?: string;
  appPackage?: string;
  appLabel?: string;
  targetVolume: number;
  enableDnd: boolean;
  sleepMinutes?: number;
}

interface HabitState {
  matrix: Record<string, Record<string, HabitPattern>>; // deviceAddress -> `${timeSlot}_${dayType}` -> pattern
  activeRoutine: SmartRoutine | null;
  isDismissed: boolean;
  lastDismissedSlot: string | null;
  isApplied: boolean;

  // Actions
  recordSessionEvent: (params: {
    deviceAddress: string;
    app?: string;
    volume?: number;
    dnd?: boolean;
    sleepMinutes?: number;
  }) => Promise<void>;
  evaluateCurrentRoutine: (deviceAddress?: string) => SmartRoutine | null;
  applyRoutine: (deviceAddress?: string) => Promise<boolean>;
  dismissRoutine: () => void;
  resetHabits: () => Promise<void>;
}

export const HABIT_STORAGE_KEY = '@earbudkit/habit-matrix';

export function getTimeSlot(date = new Date()): TimeSlot {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export function getDayType(date = new Date()): DayType {
  const day = date.getDay();
  return day === 0 || day === 6 ? 'weekend' : 'weekday';
}

// Preset archetypes tailored to audio listening contexts
const ROUTINE_ARCHETYPES: Record<
  TimeSlot,
  {
    title: string;
    subtitle: string;
    baseConfidence: number;
    defaultVol: number;
    dnd: boolean;
    sleep?: number;
    defaultApp: string;
    defaultPackage?: string;
  }
> = {
  morning: {
    title: 'Morning Commute',
    subtitle: 'Podcast & News Feed',
    baseConfidence: 91,
    defaultVol: 60,
    dnd: false,
    defaultApp: 'Pocket Casts',
    defaultPackage: 'au.com.shiftyjelly.pocketcasts',
  },
  afternoon: {
    title: 'Focus Soundstage',
    subtitle: 'Deep Work Acoustics',
    baseConfidence: 89,
    defaultVol: 55,
    dnd: true,
    defaultApp: 'Spotify',
    defaultPackage: 'com.spotify.music',
  },
  evening: {
    title: 'Evening Workout',
    subtitle: 'High Energy & Peak Isolation',
    baseConfidence: 94,
    defaultVol: 85,
    dnd: true,
    defaultApp: 'YouTube Music',
    defaultPackage: 'com.google.android.apps.youtube.music',
  },
  night: {
    title: 'Late-Night Wind Down',
    subtitle: 'Gentle Fade & Sleep Timer',
    baseConfidence: 96,
    defaultVol: 35,
    dnd: true,
    sleep: 30,
    defaultApp: 'Apple Music',
    defaultPackage: 'com.apple.android.music',
  },
};

export const habitStore = create<HabitState>()(
  persist(
    (set, get) => ({
      matrix: {},
      activeRoutine: null,
      isDismissed: false,
      lastDismissedSlot: null,
      isApplied: false,

      recordSessionEvent: async ({ deviceAddress, app, volume = 65, dnd = false, sleepMinutes }) => {
        const cleanAddress = (deviceAddress || 'DEFAULT_DEVICE').toUpperCase();
        const timeSlot = getTimeSlot();
        const dayType = getDayType();
        const slotKey = `${timeSlot}_${dayType}`;

        const currentMatrix = { ...get().matrix };
        const deviceSlots = { ...(currentMatrix[cleanAddress] || {}) };
        const existing = deviceSlots[slotKey] || {
          frequency: 0,
          volume: 65,
          dnd: false,
        };

        // Incremental update of weighted moving average
        const count = existing.frequency + 1;
        const updatedVolume = Math.round((existing.volume * existing.frequency + volume) / count);

        deviceSlots[slotKey] = {
          app: app || existing.app,
          volume: updatedVolume,
          dnd: dnd !== undefined ? dnd : existing.dnd,
          sleepMinutes: sleepMinutes || existing.sleepMinutes,
          frequency: count,
        };

        currentMatrix[cleanAddress] = deviceSlots;
        set({ matrix: currentMatrix });

        get().evaluateCurrentRoutine(cleanAddress);
      },

      evaluateCurrentRoutine: (deviceAddress?: string) => {
        const timeSlot = getTimeSlot();
        const dayType = getDayType();
        const slotKey = `${timeSlot}_${dayType}`;

        const matrix = get().matrix;
        const targetAddr = deviceAddress ? deviceAddress.toUpperCase() : Object.keys(matrix)[0];
        const deviceSlots = targetAddr ? matrix[targetAddr] : undefined;
        const learned = deviceSlots ? deviceSlots[slotKey] : undefined;
        const archetype = ROUTINE_ARCHETYPES[timeSlot];

        // Compute confidence match based on archetype baseline + frequency reinforcement
        const freqBoost = learned ? Math.min(learned.frequency * 2, 8) : 0;
        const confidenceMatch = Math.min(archetype.baseConfidence + freqBoost, 99);

        const routine: SmartRoutine = {
          id: `routine_${timeSlot}`,
          title: archetype.title,
          subtitle: archetype.subtitle,
          confidenceMatch,
          timeSlot,
          app: learned?.app || archetype.defaultApp,
          appPackage: learned?.app ? undefined : archetype.defaultPackage,
          appLabel: learned?.app || archetype.defaultApp,
          targetVolume: learned?.volume ?? archetype.defaultVol,
          enableDnd: learned?.dnd ?? archetype.dnd,
          sleepMinutes: learned?.sleepMinutes ?? archetype.sleep,
        };

        const isDismissedForSlot = get().lastDismissedSlot === slotKey;

        set({
          activeRoutine: routine,
          isDismissed: isDismissedForSlot,
          isApplied: false,
        });
        return routine;
      },

      applyRoutine: async (deviceAddress?: string) => {
        const routine = get().activeRoutine;
        if (!routine) return false;

        const bridge = getNativeBridge();

        // 1. Set media volume directly to routine target volume
        try {
          bridge.setMediaVolume(routine.targetVolume);
        } catch (e) {
          safeLog.warn('[HabitStore] Error setting volume:', e);
        }

        // 2. Set Do Not Disturb if requested
        try {
          if (routine.enableDnd && bridge.isDndPermissionGranted()) {
            bridge.setDndEnabled(true);
          }
        } catch (e) {
          safeLog.warn('[HabitStore] Error setting DND:', e);
        }

        // 3. Start Sleep Timer if specified
        if (routine.sleepMinutes && routine.sleepMinutes > 0) {
          try {
            useSleepTimerStore.getState().startTimer(routine.sleepMinutes);
          } catch (e) {
            safeLog.warn('[HabitStore] Error starting sleep timer:', e);
          }
        }

        // 4. Launch associated app if package is defined
        if (routine.appPackage) {
          try {
            bridge.launchApp(routine.appPackage);
          } catch (e) {
            safeLog.warn('[HabitStore] Error launching app:', e);
          }
        }

        // 5. Reinforce habit matrix with this execution
        const targetAddr = deviceAddress || Object.keys(get().matrix)[0] || 'DEFAULT_DEVICE';
        try {
          await get().recordSessionEvent({
            deviceAddress: targetAddr,
            app: routine.app,
            volume: routine.targetVolume,
            dnd: routine.enableDnd,
            sleepMinutes: routine.sleepMinutes,
          });
        } catch (e) {
          safeLog.warn('[HabitStore] Error recording routine session:', e);
        }

        set({ isApplied: true });
        return true;
      },

      dismissRoutine: () => {
        const timeSlot = getTimeSlot();
        const dayType = getDayType();
        const slotKey = `${timeSlot}_${dayType}`;
        set({ isDismissed: true, lastDismissedSlot: slotKey });
      },

      resetHabits: async () => {
        set({ matrix: {}, activeRoutine: null, isDismissed: false, lastDismissedSlot: null, isApplied: false });
      },
    }),
    {
      name: HABIT_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        matrix: state.matrix,
        lastDismissedSlot: state.lastDismissedSlot,
      }),
      onRehydrateStorage: () => (state) => {
        state?.evaluateCurrentRoutine();
      },
    }
  )
);
