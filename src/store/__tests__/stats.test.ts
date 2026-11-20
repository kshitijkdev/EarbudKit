// Stage 10 Verification: Listening stats and audio codec tracking
(globalThis as any).__DEV__ = true;

const memoryStore = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => memoryStore.set(k, v),
  removeItem: (k: string) => memoryStore.delete(k),
  clear: () => memoryStore.clear(),
};
(globalThis as any).window = globalThis;

import { useStatsStore, formatDuration } from '../statsStore';
import { useDeviceStore } from '../deviceStore';

export async function runStatsVerification() {
  console.log('--- STAGE 10 STATS & CODEC VERIFICATION ---');

  // 1. Test Duration Formatter
  console.log('Verifying duration formatter...');
  if (formatDuration(0) !== '0m') throw new Error('formatDuration(0) failed');
  if (formatDuration(40) !== '< 1m') throw new Error('formatDuration(40) failed');
  if (formatDuration(1500) !== '25m') throw new Error('formatDuration(1500) failed');
  if (formatDuration(3600) !== '1h') throw new Error('formatDuration(3600) failed');
  if (formatDuration(7500) !== '2h 5m') throw new Error('formatDuration(7500) failed');
  console.log('✓ Duration formatting verified');

  const statsStore = useStatsStore.getState();
  const devStore = useDeviceStore.getState();

  const devA = '20:74:CF:89:12:01'; // Noise Buds Vector (LDAC)
  const devB = 'D8:55:75:A4:77:88'; // realme TechLife Studio H1 (AAC)

  // 2. Audio Codec Tracking in DeviceStore
  console.log('Verifying audio codec assignment & persistence...');
  devStore.addTrackedDevice({
    name: 'Noise Buds Vector',
    address: devA,
    nickname: 'Noise Buds',
    icon: 'earbuds',
    audioCodec: 'LDAC',
    isConnected: true,
  });

  devStore.addTrackedDevice({
    name: 'realme TechLife Studio H1',
    address: devB,
    nickname: 'realme Headphones',
    icon: 'headphones',
    audioCodec: 'AAC',
    isConnected: false,
  });

  let savedA = useDeviceStore.getState().getTrackedDevice(devA);
  let savedB = useDeviceStore.getState().getTrackedDevice(devB);

  if (savedA?.audioCodec !== 'LDAC') {
    throw new Error(`Device A codec mismatch: expected LDAC, got ${savedA?.audioCodec}`);
  }
  if (savedB?.audioCodec !== 'AAC') {
    throw new Error(`Device B codec mismatch: expected AAC, got ${savedB?.audioCodec}`);
  }

  // Test updating codec
  devStore.setAudioCodec(devB, 'Unknown');
  savedB = useDeviceStore.getState().getTrackedDevice(devB);
  if (savedB?.audioCodec !== 'Unknown') {
    throw new Error('Failed to update codec to Unknown');
  }
  console.log('✓ Audio codec storage & Unknown fallback verified');

  // 3. Listening Session Recording
  console.log('Verifying listening session tracking...');
  const initialStatsA = statsStore.getDeviceStats(devA);
  if (initialStatsA.totalSeconds !== 0 || initialStatsA.sessionCount !== 0) {
    throw new Error('Initial stats should be 0');
  }

  // Simulate adding 1800s (30m) to Device A
  statsStore.recordListeningDuration(devA, 1800);
  let updatedStatsA = useStatsStore.getState().getDeviceStats(devA);
  console.log('Device A Stats after +30m:', updatedStatsA);
  if (updatedStatsA.totalSeconds !== 1800 || updatedStatsA.formattedTotal !== '30m') {
    throw new Error('Total seconds calculation failed');
  }
  if (updatedStatsA.todaySeconds !== 1800 || updatedStatsA.sessionCount !== 1) {
    throw new Error('Today seconds or session count mismatch');
  }

  // Simulate adding 5400s (1h 30m) to Device B
  statsStore.recordListeningDuration(devB, 5400);
  const updatedStatsB = useStatsStore.getState().getDeviceStats(devB);
  console.log('Device B Stats after +1h 30m:', updatedStatsB);
  if (updatedStatsB.totalSeconds !== 5400 || updatedStatsB.formattedTotal !== '1h 30m') {
    throw new Error('Device B total seconds calculation failed');
  }

  // Verify Device A was not altered by Device B
  updatedStatsA = useStatsStore.getState().getDeviceStats(devA);
  if (updatedStatsA.totalSeconds !== 1800) {
    throw new Error('Device isolation failed');
  }
  console.log('✓ Per-device session isolation verified');

  // 4. Live Session Start and Stop
  console.log('Testing live session start & stop...');
  statsStore.startListeningSession(devA);
  let liveStats = useStatsStore.getState().getDeviceStats(devA);
  if (!liveStats.isCurrentlyListening) {
    throw new Error('Should report currently listening when session started');
  }

  // Wait 50ms then stop
  await new Promise((r) => setTimeout(r, 50));
  statsStore.stopListeningSession(devA);
  liveStats = useStatsStore.getState().getDeviceStats(devA);
  if (liveStats.isCurrentlyListening) {
    throw new Error('Should not be listening after session stopped');
  }
  if (liveStats.sessionCount !== 2) {
    throw new Error(`Expected 2 sessions, got ${liveStats.sessionCount}`);
  }
  console.log('✓ Live session lifecycle verified');

  console.log('--- ALL STAGE 10 STATS & CODEC CHECKS PASSED ---');
}

runStatsVerification().catch((err) => {
  console.error('Stats Verification Failed:', err);
  process.exit(1);
});
