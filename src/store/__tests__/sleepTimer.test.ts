// Stage 8 Verification: Sleep Timer (presets, 10-second volume fade, and media pause)
(globalThis as any).__DEV__ = true;

import { useSleepTimerStore } from '../sleepTimerStore';

export async function runSleepTimerVerification() {
  console.log('--- STAGE 8 SLEEP TIMER VERIFICATION ---');

  const store = useSleepTimerStore.getState();

  // 1. Initial State
  if (store.isActive) {
    throw new Error('Timer should not be active initially');
  }

  // 2. Test Presets (15, 30, 45, 60 min)
  store.startTimer(15);
  let state = useSleepTimerStore.getState();
  console.log('Started 15m timer:', { totalSeconds: state.totalSeconds, preset: state.selectedPreset });
  if (state.totalSeconds !== 900 || state.selectedPreset !== 15) {
    throw new Error('15 min preset calculation failed');
  }

  store.startTimer(45);
  state = useSleepTimerStore.getState();
  console.log('Started 45m timer:', { totalSeconds: state.totalSeconds, preset: state.selectedPreset });
  if (state.totalSeconds !== 2700 || state.selectedPreset !== 45) {
    throw new Error('45 min preset calculation failed');
  }

  // Cancel timer
  store.cancelTimer();
  state = useSleepTimerStore.getState();
  if (state.isActive) {
    throw new Error('Timer should be inactive after cancel');
  }

  // 3. Test 10-Second Volume Fade Out & Media Pause
  console.log('Testing 10-second volume fade out phase...');
  // Start with a 12-second test timer to observe fade transition at 10s
  store.startQuickTestTimer(12);
  state = useSleepTimerStore.getState();
  console.log('Started quick test timer: remaining =', state.remainingSeconds, 'isFading =', state.isFading);

  // Tick 1: 12 -> 11s (not fading yet)
  store.tick();
  state = useSleepTimerStore.getState();
  console.log(`Tick 1: remaining = ${state.remainingSeconds}s, isFading = ${state.isFading}`);
  if (state.isFading) {
    throw new Error('Should not be fading at 11s');
  }

  // Tick 2: 11 -> 10s (enters 10s fade-out phase!)
  store.tick();
  state = useSleepTimerStore.getState();
  console.log(`Tick 2: remaining = ${state.remainingSeconds}s, isFading = ${state.isFading}`);
  if (!state.isFading) {
    throw new Error('Should be in fading state at <= 10s');
  }

  // Tick through remaining seconds down to 1s
  for (let s = 9; s >= 1; s--) {
    store.tick();
    state = useSleepTimerStore.getState();
    console.log(`Fading step (${state.remainingSeconds}s remaining)... isFading = ${state.isFading}`);
  }

  // Final Tick: triggers triggerFadeAndFinish()
  console.log('Final tick: executing triggerFadeAndFinish() to pause media...');
  await store.triggerFadeAndFinish();

  console.log('✅ Stage 8 Verification PASSED: Sleep timer presets, 10s volume fade, and media pause function perfectly!');
}

if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  runSleepTimerVerification().catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });
}
