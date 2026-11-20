// Unit Test Suite for Personal Hearing Calibration (HearID)
(globalThis as any).__DEV__ = true;
const memoryStore = new Map<string, string>();

(globalThis as any).localStorage = {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => memoryStore.set(k, v),
  removeItem: (k: string) => memoryStore.delete(k),
  clear: () => memoryStore.clear(),
};
(globalThis as any).window = globalThis;

import {
  useHearingCalibrationStore,
  calculateCompensationCurve,
  TEST_FREQUENCIES,
} from '../hearingCalibrationStore';
import { useEqualizerStore } from '../equalizerStore';

export async function runHearingCalibrationTests() {
  console.log('--- PERSONAL HEARING CALIBRATION VERIFICATION ---');

  // Test 1: Test frequencies specification
  if (TEST_FREQUENCIES.length !== 6) throw new Error('Expected 6 testing frequencies');
  console.log(`✓ 6-Frequency Audiogram range verified: ${TEST_FREQUENCIES.join(', ')} Hz`);

  // Test 2: Calculate compensation curve
  const sampleThresholds = {
    250: 15,
    500: 20,
    1000: 20,
    2000: 25,
    4000: 35, // -15dB high-frequency loss relative to baseline
    8000: 40,
  };
  const curve = calculateCompensationCurve(sampleThresholds);
  console.log('✓ Computed 5-Band Compensation Curve:', curve);
  if (curve.length !== 5) throw new Error('Expected 5 EQ bands');
  if (curve[3] <= 0 || curve[4] <= 0) {
    throw new Error('Expected positive high-frequency boost compensation for high-frequency hearing loss');
  }

  // Test 3: Test lifecycle & simulation
  const store = useHearingCalibrationStore.getState();
  store.startTest();
  if (!useHearingCalibrationStore.getState().isTesting) throw new Error('isTesting should be true');

  const testDevice = 'D8:55:75:A4:77:88';
  // Step through all 6 frequencies
  for (let i = 0; i < TEST_FREQUENCIES.length; i++) {
    await useHearingCalibrationStore.getState().registerHearingResponse(true, testDevice);
  }

  const finishedState = useHearingCalibrationStore.getState();
  if (finishedState.isTesting) throw new Error('Test should be finished after all frequencies');
  const profile = finishedState.profiles[testDevice];
  if (!profile) throw new Error('Profile should be created and saved');
  console.log(`✓ Profile created for ${testDevice}: curve=[${profile.compensationCurve.join(', ')}] dB`);

  // Test 4: Equalizer hardware synchronization
  const eq = useEqualizerStore.getState().getDeviceConfig(testDevice);
  if (eq.preset !== 'Custom') throw new Error('EQ preset should be set to Custom');
  console.log('✓ Equalizer updated with personal hearing curve:', eq.bandLevels);

  // Test 5: Profile toggle and reset
  await useHearingCalibrationStore.getState().toggleProfileEnabled(testDevice, false);
  const disabledEq = useEqualizerStore.getState().getDeviceConfig(testDevice);
  if (disabledEq.preset !== 'Flat') throw new Error('EQ should revert to Flat when disabled');
  console.log('✓ Equalizer cleanly reverted when personal hearing profile is toggled off');

  console.log('✅ ALL PERSONAL HEARING CALIBRATION CHECKS PASSED');
  process.exit(0);
}

runHearingCalibrationTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
