// Stage 6 Verification: Auto-actions store & profile execution
(globalThis as any).__DEV__ = true;
const memoryStore = new Map<string, string>();

(globalThis as any).localStorage = {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => memoryStore.set(k, v),
  removeItem: (k: string) => memoryStore.delete(k),
  clear: () => memoryStore.clear(),
};
(globalThis as any).window = globalThis;

import { useAutoStore, getDefaultProfileForDevice } from '../autoStore';

export async function runAutoStoreVerification() {
  console.log('--- STAGE 6 AUTO-ACTIONS STORE VERIFICATION ---');

  // 1. Test Preset: Over-ear Headphones (realme TechLife Studio H1)
  const headphonesProfile = getDefaultProfileForDevice('D8:55:75:A4:77:88', 'realme TechLife Studio H1');
  console.log('Headphones Profile:', {
    address: headphonesProfile.deviceAddress,
    connectApp: headphonesProfile.onConnect.launchAppLabel,
    connectVolume: headphonesProfile.onConnect.setVolume,
    disconnectPause: headphonesProfile.onDisconnect.pauseMedia,
  });

  if (headphonesProfile.onConnect.launchAppPackage !== 'com.spotify.music') {
    throw new Error('Headphones should default to Spotify music app');
  }
  if (headphonesProfile.onConnect.setVolume !== 70) {
    throw new Error('Headphones should default to 70% volume');
  }

  // 2. Test Preset: TWS Earbuds (Noise Buds Vector)
  const earbudsProfile = getDefaultProfileForDevice('20:74:CF:89:12:01', 'Noise Buds Vector');
  console.log('Earbuds Profile:', {
    address: earbudsProfile.deviceAddress,
    connectApp: earbudsProfile.onConnect.launchAppLabel,
    connectVolume: earbudsProfile.onConnect.setVolume,
    disconnectPause: earbudsProfile.onDisconnect.pauseMedia,
  });

  if (earbudsProfile.onConnect.launchAppPackage !== 'au.com.shiftyjelly.pocketcasts') {
    throw new Error('Earbuds should default to Pocket Casts podcast app');
  }
  if (earbudsProfile.onConnect.setVolume !== 55) {
    throw new Error('Earbuds should default to 55% volume');
  }

  // 3. Store Actions: updateConnectAction and updateDisconnectAction
  const store = useAutoStore.getState();
  store.updateConnectAction('D8:55:75:A4:77:88', {
    launchAppPackage: 'com.google.android.apps.youtube.music',
    launchAppLabel: 'YouTube Music',
    setVolume: 80,
    enableDnd: true,
  });

  store.updateDisconnectAction('D8:55:75:A4:77:88', {
    pauseMedia: true,
    setVolume: 20,
    disableDnd: true,
  });

  const updatedProfile = useAutoStore.getState().getProfile('D8:55:75:A4:77:88');
  console.log('Updated Profile:', {
    app: updatedProfile.onConnect.launchAppLabel,
    volume: updatedProfile.onConnect.setVolume,
    dnd: updatedProfile.onConnect.enableDnd,
    disconnectResetVol: updatedProfile.onDisconnect.setVolume,
  });

  if (updatedProfile.onConnect.launchAppPackage !== 'com.google.android.apps.youtube.music') {
    throw new Error('Connect action update failed');
  }

  // 4. Test execution of connect profile
  console.log('Executing Connect Profile...');
  const connectExec = await useAutoStore.getState().executeConnectProfile('D8:55:75:A4:77:88');
  console.log('Connect execution result:', connectExec);

  // 5. Test execution of disconnect profile (pausing media)
  console.log('Executing Disconnect Profile...');
  const disconnectExec = await useAutoStore.getState().executeDisconnectProfile('D8:55:75:A4:77:88');
  console.log('Disconnect execution result:', disconnectExec);

  // 6. Verify persistence in AsyncStorage
  await new Promise((r) => setTimeout(r, 100));
  const storedJson = (globalThis as any).localStorage.getItem('@earbudkit/auto-storage');
  if (!storedJson) {
    throw new Error('Auto-actions store was not persisted to AsyncStorage');
  }
  const parsed = JSON.parse(storedJson);
  console.log('Persisted profiles in storage:', Object.keys(parsed.state.profiles));

  console.log('✅ Stage 6 Verification PASSED: Auto-actions connect/disconnect profiles work cleanly!');
}

if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  runAutoStoreVerification().catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });
}
