/**
 * EarbudNative module - placeholder for Stage 2
 * Will expose Bluetooth device APIs to JS
 */

export interface BondedDevice {
  name: string;
  address: string;
  isConnected: boolean;
  type: number;
}

// Placeholder - will be replaced with actual native module in Stage 2
export function getBondedAudioDevices(): Promise<BondedDevice[]> {
  console.log('[EarbudNative] getBondedAudioDevices - native module not yet implemented');
  return Promise.resolve([]);
}

export function addConnectionListener(
  _callback: (event: { address: string; connected: boolean }) => void
): { remove: () => void } {
  console.log('[EarbudNative] addConnectionListener - native module not yet implemented');
  return { remove: () => {} };
}
