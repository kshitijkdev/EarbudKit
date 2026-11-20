// Unit Test Suite for Smart Habit Predictor Engine
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

export async function runHabitStoreTests() {
  console.log('--- SMART HABIT PREDICTOR VERIFICATION ---');

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

  // Test 2: Initial evaluation
  const initialRoutine = habitStore.getState().evaluateCurrentRoutine('20:74:CF:89:12:01');
  if (!initialRoutine) throw new Error('Routine should evaluate successfully');
  if (initialRoutine.confidenceMatch < 85 || initialRoutine.confidenceMatch > 99) {
    throw new Error(`Unexpected confidence match: ${initialRoutine.confidenceMatch}`);
  }
  console.log(`✓ Baseline routine generated: "${initialRoutine.title}" (${initialRoutine.confidenceMatch}% match)`);

  // Test 3: Session event recording and frequency learning
  await habitStore.getState().recordSessionEvent({
    deviceAddress: '20:74:CF:89:12:01',
    app: 'Pocket Casts',
    volume: 75,
    dnd: true,
  });

  const updatedRoutine = habitStore.getState().activeRoutine;
  if (!updatedRoutine) throw new Error('Active routine should be present after recording');
  console.log(`✓ Recorded session event: learned volume=${updatedRoutine.targetVolume}%, app=${updatedRoutine.app}`);

  // Test 4: Dismiss and Apply actions
  habitStore.getState().dismissRoutine();
  if (!habitStore.getState().isDismissed) throw new Error('Dismiss routine flag not set');
  console.log('✓ Dismiss routine verified');

  const applied = await habitStore.getState().applyRoutine();
  if (!applied || !habitStore.getState().isApplied) throw new Error('Apply routine failed');
  console.log('✓ 1-Tap routine execution verified');

  console.log('✅ ALL SMART HABIT PREDICTOR CHECKS PASSED');
  // Cancel active timer so event loop can terminate
  const { useSleepTimerStore } = require('../sleepTimerStore');
  useSleepTimerStore.getState().cancelTimer();
  process.exit(0);
}

runHabitStoreTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
