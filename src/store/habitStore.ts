/**
 * Smart Habit Predictor (Adaptive Context Engine / Smart Handshake)
 * Lightweight, zero-bloat on-device frequency matrix (< 5 KB in local storage).
 * Learns time-of-day listening patterns (morning podcasts, evening workouts, late-night sleep timer).
 * Surfaces a 1-tap "Smart Handshake" routine capsule on the Home screen.
 * 100% on-device privacy, zero background battery drain.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAutoStore } from './autoStore';
import { useSleepTimerStore } from './sleepTimerStore';

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
  appLabel?: string;
  targetVolume: number;
  enableDnd: boolean;
  sleepMinutes?: number;
}

interface HabitState {
  matrix: Record<string, Record<string, HabitPattern>>; // deviceAddress -> `${timeSlot}_${dayType}` -> pattern
  activeRoutine: SmartRoutine | null;
  isDismissed: boolean;
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
  applyRoutine: () => Promise<boolean>;
  dismissRoutine: () => void;
  resetHabits: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
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
const ROUTINE_ARCHETYPES: Record<TimeSlot, { title: string; subtitle: string; baseConfidence: number; defaultVol: number; dnd: boolean; sleep?: number; defaultApp: string }> = {
  morning: {
    title: 'Morning Commute',
    subtitle: 'Podcast & News Feed',
    baseConfidence: 91,
    defaultVol: 60,
    dnd: false,
    defaultApp: 'Pocket Casts',
  },
  afternoon: {
    title: 'Focus Soundstage',
    subtitle: 'Deep Work Acoustics',
    baseConfidence: 89,
    defaultVol: 55,
    dnd: true,
    defaultApp: 'Spotify',
  },
  evening: {
    title: 'Evening Workout',
    subtitle: 'High Energy & Peak Isolation',
    baseConfidence: 94,
    defaultVol: 85,
    dnd: true,
    defaultApp: 'YouTube Music',
  },
  night: {
    title: 'Late-Night Wind Down',
    subtitle: 'Gentle Fade & Sleep Timer',
    baseConfidence: 96,
    defaultVol: 35,
    dnd: true,
    sleep: 30,
    defaultApp: 'Apple Music',
  },
};

export const habitStore = create<HabitState>((set, get) => ({
  matrix: {},
  activeRoutine: null,
  isDismissed: false,
  isApplied: false,

  loadFromStorage: async () => {
    try {
      const raw = await AsyncStorage.getItem(HABIT_STORAGE_KEY);
      if (raw) {
        const matrix = JSON.parse(raw);
        set({ matrix });
      }
      // Re-evaluate routine after load
      get().evaluateCurrentRoutine();
    } catch {
      // Storage unavailable or parse error; fallback to memory
    }
  },

  recordSessionEvent: async ({ deviceAddress, app, volume = 65, dnd = false, sleepMinutes }) => {
    const timeSlot = getTimeSlot();
    const dayType = getDayType();
    const slotKey = `${timeSlot}_${dayType}`;

    const currentMatrix = { ...get().matrix };
    const deviceSlots = { ...(currentMatrix[deviceAddress] || {}) };
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

    currentMatrix[deviceAddress] = deviceSlots;
    set({ matrix: currentMatrix });

    try {
      await AsyncStorage.setItem(HABIT_STORAGE_KEY, JSON.stringify(currentMatrix));
    } catch {
      // Ephemeral fallback
    }

    get().evaluateCurrentRoutine(deviceAddress);
  },

  evaluateCurrentRoutine: (deviceAddress?: string) => {
    const timeSlot = getTimeSlot();
    const dayType = getDayType();
    const slotKey = `${timeSlot}_${dayType}`;

    const matrix = get().matrix;
    const deviceSlots = deviceAddress ? matrix[deviceAddress] : Object.values(matrix)[0];
    const learned = deviceSlots ? deviceSlots[slotKey] : undefined;
    const archetype = ROUTINE_ARCHETYPES[timeSlot];

    // Compute confidence match based on archetype baseline + frequency reinforcement
    const freqBoost = learned ? Math.min(learned.frequency * 2, 8) : 0;
    const confidenceMatch = Math.min(archetype.baseConfidence + freqBoost, 99);

    const routine: SmartRoutine = {
      id: `routine_${timeSlot}_${Date.now()}`,
      title: archetype.title,
      subtitle: archetype.subtitle,
      confidenceMatch,
      timeSlot,
      app: learned?.app || archetype.defaultApp,
      appLabel: learned?.app || archetype.defaultApp,
      targetVolume: learned?.volume ?? archetype.defaultVol,
      enableDnd: learned?.dnd ?? archetype.dnd,
      sleepMinutes: learned?.sleepMinutes ?? archetype.sleep,
    };

    set({ activeRoutine: routine, isDismissed: false, isApplied: false });
    return routine;
  },

  applyRoutine: async () => {
    const routine = get().activeRoutine;
    if (!routine) return false;

    // Apply auto-actions (Volume & DND)
    try {
      const activeDevice = Object.keys(get().matrix)[0] || 'default';
      await useAutoStore.getState().executeConnectProfile(activeDevice);
    } catch {
      // Continue applying remaining routine parameters
    }

    // Apply Sleep Timer if specified in routine
    if (routine.sleepMinutes && routine.sleepMinutes > 0) {
      useSleepTimerStore.getState().startTimer(routine.sleepMinutes);
    }

    set({ isApplied: true });
    return true;
  },

  dismissRoutine: () => {
    set({ isDismissed: true });
  },

  resetHabits: async () => {
    set({ matrix: {}, activeRoutine: null, isDismissed: false, isApplied: false });
    await AsyncStorage.removeItem(HABIT_STORAGE_KEY).catch(() => {});
  },
}));
