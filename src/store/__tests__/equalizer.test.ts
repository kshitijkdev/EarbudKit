// Stage 9 Verification: Equalizer (bands, presets, per-device profiles, and graceful degradation)
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
  useEqualizerStore,
  EQ_PRESETS,
  DEFAULT_BAND_FREQUENCIES,
  DEFAULT_DEVICE_EQ,
} from '../equalizerStore';

export async function runEqualizerVerification() {
  console.log('--- STAGE 9 EQUALIZER VERIFICATION ---');

  const store = useEqualizerStore.getState();

  // 1. Initial State & Graceful Degradation
  console.log('Checking initial state & frequencies...');
  if (store.bandFrequencies.length !== 5) {
    throw new Error('Default band frequencies should have 5 bands');
  }
  console.log('Default band frequencies:', store.bandFrequencies, 'Hz');

  // Verify degradation when unverified/unsupported:
  // Hardware EQ support should cleanly report false in node/unsupported environment without crashing
  const isSupported = store.checkEqualizerSupport();
  console.log('Equalizer hardware support on current runtime:', isSupported);
  // Graceful degradation check: applyToHardware should return false and not crash
  const degradationResult = store.applyToHardware('AA:BB:CC:DD:EE:01');
  if (degradationResult !== false) {
    throw new Error('applyToHardware should gracefully return false when unsupported');
  }
  console.log('✓ Graceful degradation verified (no crash when unsupported)');

  // 2. Per-Device Configuration & Defaults
  const deviceA = 'AA:BB:CC:DD:EE:01'; // Noise Buds Vector
  const deviceB = '11:22:33:44:55:66'; // realme TechLife Studio H1

  const defaultConf = store.getDeviceConfig(deviceA);
  console.log('Default config for Device A:', defaultConf);
  if (defaultConf.enabled !== false || defaultConf.preset !== 'Flat') {
    throw new Error('Default EQ profile should be disabled with Flat preset');
  }

  // 3. Preset Switching
  console.log('Applying Bass Boost preset to Device A...');
  store.setDevicePreset(deviceA, 'Bass Boost');
  let configA = useEqualizerStore.getState().getDeviceConfig(deviceA);
  console.log('Device A Bass Boost levels (mB):', configA.bandLevels);
  if (configA.preset !== 'Bass Boost' || configA.bandLevels[0] !== 600 || configA.bandLevels[1] !== 400) {
    throw new Error('Bass Boost preset values mismatch');
  }

  console.log('Applying Treble preset to Device B...');
  store.setDevicePreset(deviceB, 'Treble');
  let configB = useEqualizerStore.getState().getDeviceConfig(deviceB);
  console.log('Device B Treble levels (mB):', configB.bandLevels);
  if (configB.preset !== 'Treble' || configB.bandLevels[4] !== 700) {
    throw new Error('Treble preset values mismatch');
  }

  // Verify Device A was not affected by Device B
  configA = useEqualizerStore.getState().getDeviceConfig(deviceA);
  if (configA.preset !== 'Bass Boost') {
    throw new Error('Device configs should be isolated per MAC address');
  }
  console.log('✓ Multi-device profile isolation verified');

  // 4. Custom Band Adjustments & Clamping
  console.log('Modifying individual band on Device A...');
  store.setDeviceBandLevel(deviceA, 2, 350); // Set 910Hz mid to +3.5 dB
  configA = useEqualizerStore.getState().getDeviceConfig(deviceA);
  console.log('Device A Custom levels (mB):', configA.bandLevels);
  if (configA.preset !== 'Custom') {
    throw new Error('Preset should automatically switch to Custom when modifying bands');
  }
  if (configA.bandLevels[2] !== 350) {
    throw new Error('Band 2 level not updated correctly');
  }

  // Test Clamping to max (+1500 mB) and min (-1500 mB)
  console.log('Testing level clamping...');
  store.setDeviceBandLevel(deviceA, 0, 3000); // Exceeds +1500
  configA = useEqualizerStore.getState().getDeviceConfig(deviceA);
  if (configA.bandLevels[0] !== 1500) {
    throw new Error(`Expected level to be clamped to 1500, got ${configA.bandLevels[0]}`);
  }

  store.setDeviceBandLevel(deviceA, 0, -5000); // Exceeds -1500
  configA = useEqualizerStore.getState().getDeviceConfig(deviceA);
  if (configA.bandLevels[0] !== -1500) {
    throw new Error(`Expected level to be clamped to -1500, got ${configA.bandLevels[0]}`);
  }
  console.log('✓ Band gain clamping (-15dB to +15dB / -1500 to +1500 mB) verified');

  // 5. Enabling / Disabling EQ
  store.setDeviceEqEnabled(deviceA, true);
  configA = useEqualizerStore.getState().getDeviceConfig(deviceA);
  if (configA.enabled !== true) {
    throw new Error('Failed to enable device EQ');
  }

  store.setDeviceEqEnabled(deviceA, false);
  configA = useEqualizerStore.getState().getDeviceConfig(deviceA);
  if (configA.enabled !== false) {
    throw new Error('Failed to disable device EQ');
  }
  console.log('✓ Enable/disable toggles verified');

  console.log('--- ALL STAGE 9 EQUALIZER CHECKS PASSED ---');
}

runEqualizerVerification().catch((err) => {
  console.error('Equalizer Verification Failed:', err);
  process.exit(1);
});
