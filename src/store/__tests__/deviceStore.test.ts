// Stage 3 & 5 Verification: Multi-device store, AsyncStorage persistence, and Battery Alerts
(globalThis as any).__DEV__ = true;
const memoryStore = new Map<string, string>();

(globalThis as any).localStorage = {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => memoryStore.set(k, v),
  removeItem: (k: string) => memoryStore.delete(k),
  clear: () => memoryStore.clear(),
};
(globalThis as any).window = globalThis;

import { useDeviceStore, TrackedDevice } from '../deviceStore';

export async function runStoreVerification() {
  console.log('--- STAGE 3 & 5 STORE VERIFICATION ---');

  // 1. Initial state
  const store = useDeviceStore.getState();
  console.log('Initial tracked devices:', Object.keys(store.trackedDevices).length);

  // 2. Add Device 1: Noise Buds Vector (battery 85%)
  store.addTrackedDevice({
    name: 'Noise Buds Vector',
    address: '20:74:CF:89:12:01',
    nickname: 'Noise Buds Vector',
    icon: 'earbuds',
    isConnected: true,
    batteryLevel: 85,
    lowBatteryThreshold: 20,
  });

  // 3. Add Device 2: realme TechLife Studio H1 (battery null -> Unavailable)
  store.addTrackedDevice({
    name: 'realme TechLife Studio H1',
    address: 'D8:55:75:A4:77:88',
    nickname: 'realme Studio H1',
    icon: 'headphones',
    isConnected: true,
    batteryLevel: null, // should show/say Unavailable
    lowBatteryThreshold: 25,
  });

  const devices: TrackedDevice[] = useDeviceStore.getState().getTrackedDeviceList();
  console.log(`Added ${devices.length} devices:`);
  devices.forEach((d: TrackedDevice) => {
    const batteryDisplay = d.batteryLevel !== null ? `${d.batteryLevel}%` : 'Unavailable';
    console.log(` - ${d.nickname} (${d.name}) [${d.address}] battery=${batteryDisplay} threshold=${d.lowBatteryThreshold}%`);
  });

  if (devices.length !== 2) {
    throw new Error(`Expected 2 devices, got ${devices.length}`);
  }

  // Verify battery levels: one shows 85%, one shows Unavailable (null)
  const dev1 = useDeviceStore.getState().getTrackedDevice('20:74:CF:89:12:01');
  const dev2 = useDeviceStore.getState().getTrackedDevice('D8:55:75:A4:77:88');
  if (dev1?.batteryLevel !== 85) {
    throw new Error('Device 1 battery level mismatch');
  }
  if (dev2?.batteryLevel !== null) {
    throw new Error('Device 2 should have null (Unavailable) battery level');
  }

  // 4. Test low battery trigger: drop dev1 battery from 85% to 15% (below threshold 20%)
  console.log('Testing low-battery threshold trigger: setting Noise Buds battery to 15%...');
  useDeviceStore.getState().setBatteryLevel('20:74:CF:89:12:01', 15);
  const updatedDev1 = useDeviceStore.getState().getTrackedDevice('20:74:CF:89:12:01');
  console.log(`Noise Buds battery is now: ${updatedDev1?.batteryLevel}%, alertSent=${updatedDev1?.batteryAlertSent}`);
  if (!updatedDev1?.batteryAlertSent) {
    throw new Error('Low battery alert flag was not set when battery dropped below threshold');
  }

  // 5. Test alert disarming when device is charged above threshold
  console.log('Testing device recharged to 90% (disarm alert)...');
  useDeviceStore.getState().setBatteryLevel('20:74:CF:89:12:01', 90);
  const rechargedDev1 = useDeviceStore.getState().getTrackedDevice('20:74:CF:89:12:01');
  console.log(`Noise Buds recharged: ${rechargedDev1?.batteryLevel}%, alertSent=${rechargedDev1?.batteryAlertSent}`);
  if (rechargedDev1?.batteryAlertSent) {
    throw new Error('Low battery alert flag was not cleared after recharging');
  }

  // 6. Test triggerTestLowBatteryAlert action
  console.log('Testing manual triggerTestLowBatteryAlert action...');
  const alertTriggered = await useDeviceStore.getState().triggerTestLowBatteryAlert('D8:55:75:A4:77:88');
  console.log('Manual test alert dispatched:', alertTriggered);

  // 7. Verify persistence survived
  await new Promise((r) => setTimeout(r, 100));
  const storedJson = (globalThis as any).localStorage.getItem('@earbudkit/devices-storage');
  if (!storedJson) {
    throw new Error('Storage was empty');
  }
  const parsed = JSON.parse(storedJson);
  console.log('Persisted devices count:', Object.keys(parsed.state.trackedDevices).length);

  console.log('✅ Stage 5 Verification PASSED: Battery reading, Unavailable fallback, and low-battery alert work cleanly!');
}

if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  runStoreVerification().catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });
}
