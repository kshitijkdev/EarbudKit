import { create } from 'zustand';

function getNativeBridge() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../../modules/earbud-native');
  } catch (_e) {
    return {
      setMediaVolume: (_v: number) => true,
      getMediaVolume: () => 50,
      pauseMedia: () => true,
    };
  }
}

interface SleepTimerState {
  isActive: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  isFading: boolean;
  initialVolume: number;
  selectedPreset: number | 'custom'; // minutes

  // Actions
  startTimer: (minutes: number) => void;
  startQuickTestTimer: (seconds: number) => void; // for fast testing of 10s fade
  cancelTimer: () => void;
  tick: () => void;
  triggerFadeAndFinish: () => Promise<void>;
}

let timerInterval: ReturnType<typeof setInterval> | null = null;
let fadeInterval: ReturnType<typeof setInterval> | null = null;

export const useSleepTimerStore = create<SleepTimerState>((set, get) => ({
  isActive: false,
  totalSeconds: 0,
  remainingSeconds: 0,
  isFading: false,
  initialVolume: 50,
  selectedPreset: 30,

  startTimer: (minutes: number) => {
    if (timerInterval) clearInterval(timerInterval);
    if (fadeInterval) clearInterval(fadeInterval);

    const totalSeconds = Math.round(minutes * 60);
    const bridge = getNativeBridge();
    const currentVol = bridge.getMediaVolume();

    set({
      isActive: true,
      totalSeconds,
      remainingSeconds: totalSeconds,
      isFading: false,
      initialVolume: currentVol,
      selectedPreset: [15, 30, 45, 60].includes(minutes) ? minutes : 'custom',
    });

    console.log(`[SleepTimer] Started timer for ${minutes} min (${totalSeconds}s). Initial volume: ${currentVol}%`);

    timerInterval = setInterval(() => {
      get().tick();
    }, 1000);
  },

  startQuickTestTimer: (seconds: number) => {
    if (timerInterval) clearInterval(timerInterval);
    if (fadeInterval) clearInterval(fadeInterval);

    const bridge = getNativeBridge();
    const currentVol = bridge.getMediaVolume();
    set({
      isActive: true,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      isFading: false,
      initialVolume: currentVol,
      selectedPreset: 'custom',
    });

    console.log(`[SleepTimer] Started quick test timer for ${seconds}s. Initial volume: ${currentVol}%`);

    timerInterval = setInterval(() => {
      get().tick();
    }, 1000);
  },

  cancelTimer: () => {
    if (timerInterval) clearInterval(timerInterval);
    if (fadeInterval) clearInterval(fadeInterval);
    timerInterval = null;
    fadeInterval = null;

    set({
      isActive: false,
      totalSeconds: 0,
      remainingSeconds: 0,
      isFading: false,
    });
    console.log('[SleepTimer] Timer cancelled');
  },

  tick: () => {
    const { remainingSeconds, isFading } = get();
    const bridge = getNativeBridge();

    if (remainingSeconds <= 1) {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      get().triggerFadeAndFinish();
      return;
    }

    const nextRemaining = remainingSeconds - 1;

    // Start 10-second fade out when remaining <= 10
    if (nextRemaining <= 10 && !isFading) {
      set({ isFading: true, remainingSeconds: nextRemaining });
      console.log('[SleepTimer] Entering 10-second volume fade-out phase');
      const initVol = get().initialVolume;
      const stepVol = Math.max(0, Math.round((initVol * nextRemaining) / 10));
      bridge.setMediaVolume(stepVol);
    } else if (isFading) {
      const initVol = get().initialVolume;
      const stepVol = Math.max(0, Math.round((initVol * nextRemaining) / 10));
      bridge.setMediaVolume(stepVol);
      set({ remainingSeconds: nextRemaining });
    } else {
      set({ remainingSeconds: nextRemaining });
    }
  },

  triggerFadeAndFinish: async () => {
    console.log('[SleepTimer] Finalizing: fading volume to 0 and pausing media...');
    set({ isFading: true, remainingSeconds: 0 });
    const bridge = getNativeBridge();

    // Ensure volume reaches 0
    bridge.setMediaVolume(0);

    // Pause media playback
    const paused = bridge.pauseMedia();
    console.log(`[SleepTimer] Media paused: ${paused}`);

    if (timerInterval) clearInterval(timerInterval);
    if (fadeInterval) clearInterval(fadeInterval);
    timerInterval = null;
    fadeInterval = null;

    setTimeout(() => {
      set({
        isActive: false,
        totalSeconds: 0,
        remainingSeconds: 0,
        isFading: false,
      });
      console.log('[SleepTimer] Sleep timer finished successfully');
    }, 1000);
  },
}));
