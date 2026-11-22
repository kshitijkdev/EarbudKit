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
import { useAutoStore } from './autoStore';
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

export interface ConnectionEvent {
  deviceAddress: string;
  timestamp: number;
  dayOfWeek: number;
  hourOfDay: number;
  timeSlot: TimeSlot;
}

export interface RoutineLearningState {
  isLearning: true;
  sessionsNeeded: number;
  currentSessions: number;
  targetSessions: number;
  timeSlot: TimeSlot;
}

export interface SmartRoutine {
  id: string;
  title: string;
  subtitle: string;
  confidenceMatch: number; // Real calculated ratio percentage
  timeSlot: TimeSlot;
  app?: string;
  appPackage?: string;
  appLabel?: string;
  targetVolume: number;
  enableDnd: boolean;
  sleepMinutes?: number;
  evidenceText: string;
}

interface HabitState {
  matrix: Record<string, Record<string, HabitPattern>>; // deviceAddress -> `${timeSlot}_${dayType}` -> pattern
  events: ConnectionEvent[]; // Bounded connection history (max 100 events within 30 days)
  learningState: RoutineLearningState | null;
  activeRoutine: SmartRoutine | null;
  isDismissed: boolean;
  lastDismissedSlot: string | null;
  isApplied: boolean;

  // Actions
  recordConnectionEvent: (deviceAddress: string, timestamp?: number) => void;
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
  simulatePastSessions: (deviceAddress?: string) => Promise<void>;
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
export const ROUTINE_ARCHETYPES: Record<
  TimeSlot,
  {
    title: string;
    subtitle: string;
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
    defaultVol: 60,
    dnd: false,
    defaultApp: 'Pocket Casts',
    defaultPackage: 'au.com.shiftyjelly.pocketcasts',
  },
  afternoon: {
    title: 'Focus Soundstage',
    subtitle: 'Deep Work Acoustics',
    defaultVol: 55,
    dnd: true,
    defaultApp: 'Spotify',
    defaultPackage: 'com.spotify.music',
  },
  evening: {
    title: 'Evening Workout',
    subtitle: 'High Energy & Peak Isolation',
    defaultVol: 85,
    dnd: true,
    defaultApp: 'YouTube Music',
    defaultPackage: 'com.google.android.apps.youtube.music',
  },
  night: {
    title: 'Late-Night Wind Down',
    subtitle: 'Gentle Fade & Sleep Timer',
    defaultVol: 35,
    dnd: true,
    sleep: 30,
    defaultApp: 'Apple Music',
    defaultPackage: 'com.apple.android.music',
  },
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const REQUIRED_SESSIONS_THRESHOLD = 3;

export const habitStore = create<HabitState>()(
  persist(
    (set, get) => ({
      matrix: {},
      events: [],
      learningState: null,
      activeRoutine: null,
      isDismissed: false,
      lastDismissedSlot: null,
      isApplied: false,

      recordConnectionEvent: (deviceAddress: string, timestamp?: number) => {
        const cleanAddress = (deviceAddress || 'DEFAULT_DEVICE').toUpperCase();
        const ts = timestamp ?? Date.now();
        const date = new Date(ts);
        const timeSlot = getTimeSlot(date);

        const newEvent: ConnectionEvent = {
          deviceAddress: cleanAddress,
          timestamp: ts,
          dayOfWeek: date.getDay(),
          hourOfDay: date.getHours(),
          timeSlot,
        };

        const now = Date.now();
        const pruned = [...get().events, newEvent]
          .filter((e) => now - e.timestamp <= THIRTY_DAYS_MS)
          .slice(-100);

        set({ events: pruned });
        get().evaluateCurrentRoutine(cleanAddress);
      },

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

        // Also record timestamped connection event
        const now = Date.now();
        const date = new Date(now);
        const newEvent: ConnectionEvent = {
          deviceAddress: cleanAddress,
          timestamp: now,
          dayOfWeek: date.getDay(),
          hourOfDay: date.getHours(),
          timeSlot,
        };

        const prunedEvents = [...get().events, newEvent]
          .filter((e) => now - e.timestamp <= THIRTY_DAYS_MS)
          .slice(-100);

        set({ matrix: currentMatrix, events: prunedEvents });

        get().evaluateCurrentRoutine(cleanAddress);
      },

      evaluateCurrentRoutine: (deviceAddress?: string) => {
        const now = Date.now();
        const timeSlot = getTimeSlot();
        const dayType = getDayType();
        const slotKey = `${timeSlot}_${new Date().toDateString()}`;

        const matrix = get().matrix;
        const events = get().events;
        const targetAddr = deviceAddress
          ? deviceAddress.toUpperCase()
          : events.length > 0
          ? events[events.length - 1].deviceAddress
          : Object.keys(matrix)[0];

        if (!targetAddr) {
          set({
            activeRoutine: null,
            learningState: null,
            isDismissed: false,
          });
          return null;
        }

        // Filter events for this device within the last 30 days
        const recentDeviceEvents = events.filter(
          (e) => e.deviceAddress === targetAddr && now - e.timestamp <= THIRTY_DAYS_MS
        );

        const matchingSlotSessions = recentDeviceEvents.filter((e) => e.timeSlot === timeSlot).length;
        const totalDeviceSessions = recentDeviceEvents.length;

        const isDismissedForSlot = get().lastDismissedSlot === slotKey;

        // Check 3-session evidence threshold
        if (matchingSlotSessions < REQUIRED_SESSIONS_THRESHOLD) {
          const sessionsNeeded = REQUIRED_SESSIONS_THRESHOLD - matchingSlotSessions;
          const learningState: RoutineLearningState = {
            isLearning: true,
            sessionsNeeded,
            currentSessions: matchingSlotSessions,
            targetSessions: REQUIRED_SESSIONS_THRESHOLD,
            timeSlot,
          };

          set({
            activeRoutine: null,
            learningState,
            isDismissed: isDismissedForSlot,
            isApplied: false,
          });
          return null;
        }

        // Honest ratio confidence calculation
        const confidenceRatio = totalDeviceSessions > 0
          ? Math.round((matchingSlotSessions / totalDeviceSessions) * 100)
          : 100;
        const confidenceMatch = Math.min(Math.max(confidenceRatio, 1), 100);

        const deviceSlots = matrix[targetAddr];
        const learned = deviceSlots ? deviceSlots[`${timeSlot}_${dayType}`] : undefined;
        const archetype = ROUTINE_ARCHETYPES[timeSlot];
        const evidenceText = `Based on ${matchingSlotSessions} of your last ${totalDeviceSessions} sessions`;

        const routine: SmartRoutine = {
          id: `routine_${timeSlot}`,
          title: archetype.title,
          subtitle: `${evidenceText} • ${archetype.subtitle}`,
          confidenceMatch,
          timeSlot,
          app: learned?.app || archetype.defaultApp,
          appPackage: learned?.app ? undefined : archetype.defaultPackage,
          appLabel: learned?.app || archetype.defaultApp,
          targetVolume: learned?.volume ?? archetype.defaultVol,
          enableDnd: learned?.dnd ?? archetype.dnd,
          sleepMinutes: learned?.sleepMinutes ?? archetype.sleep,
          evidenceText,
        };

        set({
          activeRoutine: routine,
          learningState: null,
          isDismissed: isDismissedForSlot,
          isApplied: false,
        });
        return routine;
      },

      applyRoutine: async (deviceAddress?: string) => {
        const routine = get().activeRoutine;
        if (!routine) return false;

        const events = get().events;
        const targetAddr = (
          deviceAddress ||
          (events.length > 0 ? events[events.length - 1].deviceAddress : undefined) ||
          Object.keys(get().matrix)[0] ||
          'DEFAULT_DEVICE'
        ).toUpperCase();

        // 1. Execute that device's On-Connect profile from Auto-Actions
        try {
          await useAutoStore.getState().executeConnectProfile(targetAddr);
        } catch (e) {
          safeLog.warn('[HabitStore] Error executing Auto-Actions connect profile:', e);
        }

        // 2. Set media volume directly to routine target volume (reinforce)
        const bridge = getNativeBridge();
        try {
          bridge.setMediaVolume(routine.targetVolume);
        } catch (e) {
          safeLog.warn('[HabitStore] Error setting volume:', e);
        }

        // 3. Start Sleep Timer if specified
        if (routine.sleepMinutes && routine.sleepMinutes > 0) {
          try {
            useSleepTimerStore.getState().startTimer(routine.sleepMinutes);
          } catch (e) {
            safeLog.warn('[HabitStore] Error starting sleep timer:', e);
          }
        }

        set({ isApplied: true });
        return true;
      },

      dismissRoutine: () => {
        const timeSlot = getTimeSlot();
        const slotKey = `${timeSlot}_${new Date().toDateString()}`;
        set({ isDismissed: true, lastDismissedSlot: slotKey });
      },

      simulatePastSessions: async (deviceAddress?: string) => {
        const targetAddr = (deviceAddress || '20:74:CF:89:12:01').toUpperCase();
        const now = Date.now();
        const timeSlot = getTimeSlot();

        // Simulate 3 past connections in the current time slot over the past 3 days
        const simEvents: ConnectionEvent[] = [
          {
            deviceAddress: targetAddr,
            timestamp: now - 2 * 24 * 60 * 60 * 1000,
            dayOfWeek: new Date(now - 2 * 24 * 60 * 60 * 1000).getDay(),
            hourOfDay: new Date().getHours(),
            timeSlot,
          },
          {
            deviceAddress: targetAddr,
            timestamp: now - 1 * 24 * 60 * 60 * 1000,
            dayOfWeek: new Date(now - 1 * 24 * 60 * 60 * 1000).getDay(),
            hourOfDay: new Date().getHours(),
            timeSlot,
          },
          {
            deviceAddress: targetAddr,
            timestamp: now,
            dayOfWeek: new Date().getDay(),
            hourOfDay: new Date().getHours(),
            timeSlot,
          },
        ];

        const existingEvents = get().events.filter((e) => e.deviceAddress !== targetAddr);
        set({
          events: [...existingEvents, ...simEvents],
          isDismissed: false,
          lastDismissedSlot: null,
          isApplied: false,
        });

        get().evaluateCurrentRoutine(targetAddr);
      },

      resetHabits: async () => {
        set({
          matrix: {},
          events: [],
          learningState: null,
          activeRoutine: null,
          isDismissed: false,
          lastDismissedSlot: null,
          isApplied: false,
        });
      },
    }),
    {
      name: HABIT_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        matrix: state.matrix,
        events: state.events,
        lastDismissedSlot: state.lastDismissedSlot,
      }),
      onRehydrateStorage: () => (state) => {
        state?.evaluateCurrentRoutine();
      },
    }
  )
);
