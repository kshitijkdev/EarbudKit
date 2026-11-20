import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DeviceListeningStats {
  totalSeconds: number;
  sessionCount: number;
  sessionStartTimestamp: number | null; // null if not currently listening
  dailySeconds: Record<string, number>; // key: 'YYYY-MM-DD'
}

export interface DeviceStatsSummary {
  totalSeconds: number;
  formattedTotal: string;
  todaySeconds: number;
  formattedToday: string;
  sessionCount: number;
  isCurrentlyListening: boolean;
  currentSessionDurationSeconds: number;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hrs === 0) {
    if (mins === 0) return '< 1m';
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hrs}h`;
  }

  return `${hrs}h ${mins}m`;
}

function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface StatsState {
  stats: Record<string, DeviceListeningStats>; // Keyed by MAC address

  // Actions
  startListeningSession: (address: string) => void;
  stopListeningSession: (address: string) => void;
  recordListeningDuration: (address: string, seconds: number) => void;
  getDeviceStats: (address: string) => DeviceStatsSummary;
  clearStats: (address?: string) => void;
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      stats: {},

      startListeningSession: (address: string) => {
        const addr = address.toUpperCase();
        const current = get().stats[addr] ?? {
          totalSeconds: 0,
          sessionCount: 0,
          sessionStartTimestamp: null,
          dailySeconds: {},
        };

        set({
          stats: {
            ...get().stats,
            [addr]: {
              ...current,
              sessionStartTimestamp: Date.now(),
            },
          },
        });
        console.log(`[StatsStore] Started listening session for ${addr}`);
      },

      stopListeningSession: (address: string) => {
        const addr = address.toUpperCase();
        const current = get().stats[addr];
        if (!current || current.sessionStartTimestamp === null) return;

        const durationSec = Math.max(
          1,
          Math.round((Date.now() - current.sessionStartTimestamp) / 1000)
        );
        const today = getTodayKey();
        const currentDaily = current.dailySeconds[today] ?? 0;

        set({
          stats: {
            ...get().stats,
            [addr]: {
              ...current,
              totalSeconds: current.totalSeconds + durationSec,
              sessionCount: current.sessionCount + 1,
              sessionStartTimestamp: null,
              dailySeconds: {
                ...current.dailySeconds,
                [today]: currentDaily + durationSec,
              },
            },
          },
        });
        console.log(`[StatsStore] Stopped session for ${addr}. Added ${durationSec}s. Total: ${current.totalSeconds + durationSec}s`);
      },

      recordListeningDuration: (address: string, seconds: number) => {
        const addr = address.toUpperCase();
        const current = get().stats[addr] ?? {
          totalSeconds: 0,
          sessionCount: 0,
          sessionStartTimestamp: null,
          dailySeconds: {},
        };

        const today = getTodayKey();
        const currentDaily = current.dailySeconds[today] ?? 0;

        set({
          stats: {
            ...get().stats,
            [addr]: {
              ...current,
              totalSeconds: current.totalSeconds + seconds,
              sessionCount: current.sessionCount + 1,
              dailySeconds: {
                ...current.dailySeconds,
                [today]: currentDaily + seconds,
              },
            },
          },
        });
      },

      getDeviceStats: (address: string): DeviceStatsSummary => {
        const addr = address.toUpperCase();
        const current = get().stats[addr];
        const today = getTodayKey();

        if (!current) {
          return {
            totalSeconds: 0,
            formattedTotal: '0m',
            todaySeconds: 0,
            formattedToday: '0m',
            sessionCount: 0,
            isCurrentlyListening: false,
            currentSessionDurationSeconds: 0,
          };
        }

        let liveSessionSec = 0;
        const isListening = current.sessionStartTimestamp !== null;
        if (isListening && current.sessionStartTimestamp) {
          liveSessionSec = Math.max(
            0,
            Math.round((Date.now() - current.sessionStartTimestamp) / 1000)
          );
        }

        const total = current.totalSeconds + liveSessionSec;
        const todayTotal = (current.dailySeconds[today] ?? 0) + liveSessionSec;

        return {
          totalSeconds: total,
          formattedTotal: formatDuration(total),
          todaySeconds: todayTotal,
          formattedToday: formatDuration(todayTotal),
          sessionCount: current.sessionCount + (isListening ? 1 : 0),
          isCurrentlyListening: isListening,
          currentSessionDurationSeconds: liveSessionSec,
        };
      },

      clearStats: (address?: string) => {
        if (address) {
          const addr = address.toUpperCase();
          const next = { ...get().stats };
          delete next[addr];
          set({ stats: next });
        } else {
          set({ stats: {} });
        }
      },
    }),
    {
      name: '@earbudkit/stats-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
