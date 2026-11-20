/**
 * Device store - placeholder for Stage 3
 * Will manage tracked Bluetooth devices with Zustand + AsyncStorage
 */

export interface TrackedDevice {
  address: string;
  name: string;
  nickname: string;
  icon: 'earbuds' | 'headphones';
  isActive: boolean;
  isConnected: boolean;
  batteryLevel: number | null;
  addedAt: number;
}

// Will be implemented in Stage 3
