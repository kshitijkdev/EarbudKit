// Unit Test Suite for Smart Habit Predictor Engine (Stage S12)
(globalThis as any).__DEV__ = true;
const memoryStore = new Map<string, string>();

(globalThis as any).localStorage = {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => memoryStore.set(k, v),
  removeItem: (k: string) => memoryStore.delete(k),
  clear: () => memoryStore.clear(),
};
(globalThis as any).window = globalThis;

import { habitStore, getTimeSlot, getDayType } from '../habitStore';
import { useSleepTimerStore } from '../sleepTimerStore';

export async function runHabitStoreTests() {
  console.log('--- SMART HABIT PREDICTOR VERIFICATION (STAGE S12) ---');

  // Test 1: Time slot and day type calculation
  const morningDate = new Date('2026-11-21T08:30:00');
  const afternoonDate = new Date('2026-11-21T14:15:00');
  const eveningDate = new Date('2026-11-21T19:45:00');
  const nightDate = new Date('2026-11-21T23:20:00');

  if (getTimeSlot(morningDate) !== 'morning') throw new Error('Failed morning time slot check');
  if (getTimeSlot(afternoonDate) !== 'afternoon') throw new Error('Failed afternoon time slot check');
  if (getTimeSlot(eveningDate) !== 'evening') throw new Error('Failed evening time slot check');
  if (getTimeSlot(nightDate) !== 'night') throw new Error('Failed night time slot check');
  console.log('✓ Time slot calculation verified for all 4 daily quadrants');

  // Reset store for clean threshold tests
  await habitStore.getState().resetHabits();

  // Test 2: Clean install state (0 events) -> No fake 96% match, must be learning state
  const addr = '20:74:CF:89:12:01';
  habitStore.getState().evaluateCurrentRoutine(addr);
  let state = habitStore.getState();
  if (state.activeRoutine !== null) {
    throw new Error('On clean install with 0 events, activeRoutine must be null');
  }
  if (!state.learningState || state.learningState.sessionsNeeded !== 3 || state.learningState.currentSessions !== 0) {
    throw new Error('Learning state must indicate 3 sessions needed');
  }
  console.log('✓ Clean install empty state: routine is null, learning state needs 3 sessions');

  // Test 3: Thresholding (1 and 2 events still do not unlock routine)
  const currentHour = new Date().getHours();
  const todayBase = new Date();
  todayBase.setHours(currentHour, 5, 0, 0);

  const ts1 = todayBase.getTime() - 2 * 24 * 3600 * 1000; // 2 days ago in current time slot
  const ts2 = todayBase.getTime() - 1 * 24 * 3600 * 1000; // 1 day ago in current time slot
  const ts3 = todayBase.getTime(); // today in current time slot

  habitStore.getState().recordConnectionEvent(addr, ts1);
  state = habitStore.getState();
  if (state.activeRoutine !== null || state.learningState?.sessionsNeeded !== 2) {
    throw new Error('After 1 session, routine must remain locked with 2 sessions needed');
  }

  habitStore.getState().recordConnectionEvent(addr, ts2);
  state = habitStore.getState();
  if (state.activeRoutine !== null || state.learningState?.sessionsNeeded !== 1) {
    throw new Error('After 2 sessions, routine must remain locked with 1 session needed');
  }
  console.log('✓ Thresholding: routine remains locked after 1 and 2 sessions');

  // Test 4: 3rd event in same slot unlocks routine with honest ratio confidence
  habitStore.getState().recordConnectionEvent(addr, ts3);
  state = habitStore.getState();
  if (!state.activeRoutine) {
    throw new Error('After 3 sessions in slot, activeRoutine must be unlocked');
  }
  if (state.learningState !== null) {
    throw new Error('Learning state must be null once routine is unlocked');
  }
  // 3 of 3 sessions = 100%
  if (state.activeRoutine.confidenceMatch !== 100) {
    throw new Error(`Expected 100% confidence for 3/3 sessions, got ${state.activeRoutine.confidenceMatch}%`);
  }
  if (!state.activeRoutine.evidenceText.includes('3 of your last 3 sessions')) {
    throw new Error(`Evidence text mismatch: ${state.activeRoutine.evidenceText}`);
  }
  console.log(`✓ 3rd session unlocks routine: "${state.activeRoutine.title}" with 100% confidence (${state.activeRoutine.evidenceText})`);

  // Test 5: Ratio confidence calculation with sessions in another slot
  // Add an event in a guaranteed different time slot (+12 hours)
  const differentSlotDate = new Date();
  differentSlotDate.setHours((currentHour + 12) % 24, 0, 0, 0);
  habitStore.getState().recordConnectionEvent(addr, differentSlotDate.getTime());
  state = habitStore.getState();
  // Total sessions = 4, current slot matching = 3 -> 3/4 = 75%
  if (state.activeRoutine?.confidenceMatch !== 75) {
    throw new Error(`Expected 75% confidence for 3/4 sessions, got ${state.activeRoutine?.confidenceMatch}%`);
  }
  if (!state.activeRoutine.evidenceText.includes('3 of your last 4 sessions')) {
    throw new Error(`Evidence text mismatch: ${state.activeRoutine.evidenceText}`);
  }
  console.log(`✓ Honest ratio confidence: 3 of 4 sessions correctly yields 75% match`);

  // Test 6: Slot-aware dismissal
  habitStore.getState().dismissRoutine();
  if (!habitStore.getState().isDismissed) {
    throw new Error('Dismiss routine flag not set');
  }
  // Re-evaluating for current slot stays dismissed
  habitStore.getState().evaluateCurrentRoutine(addr);
  if (!habitStore.getState().isDismissed) {
    throw new Error('Routine should remain dismissed for current slot');
  }
  console.log('✓ Slot-aware dismissal: routine remains hidden for current slot');

  // Test 7: Apply routine executes profile and sets isApplied
  const applied = await habitStore.getState().applyRoutine(addr);
  if (!applied || !habitStore.getState().isApplied) {
    throw new Error('Apply routine failed');
  }
  console.log('✓ 1-Tap routine execution verified');

  // Test 8: Simulate 3 past sessions helper (for DEV / testers)
  await habitStore.getState().resetHabits();
  await habitStore.getState().simulatePastSessions(addr);
  state = habitStore.getState();
  if (!state.activeRoutine || state.activeRoutine.confidenceMatch !== 100) {
    throw new Error('Simulation failed to unlock routine');
  }
  console.log('✓ simulatePastSessions unlocks routine immediately for testing');

  console.log('✅ ALL SMART HABIT PREDICTOR CHECKS PASSED (STAGE S12)');
  useSleepTimerStore.getState().cancelTimer();
  process.exit(0);
}

runHabitStoreTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
