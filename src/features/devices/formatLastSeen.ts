import { TrackedDevice } from '../../store/deviceStore';

/**
 * Derives a human-readable last-seen or connection status label for a device.
 * Used on Home Registered Fleet shelf and device cards.
 */
export function formatLastSeen(
  dev: Pick<TrackedDevice, 'isConnected' | 'lastDisconnectedAt' | 'lastLocation'>,
  now: number = Date.now()
): string {
  if (dev.isConnected) return 'Connected now';
  const ts = dev.lastDisconnectedAt || dev.lastLocation?.timestamp;
  if (!ts) return 'Never connected';
  const diffMin = Math.floor((now - ts) / 60000);
  if (diffMin < 1) return 'Seen just now';
  if (diffMin < 60) return `Seen ${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Seen ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `Seen ${diffDays}d ago`;
}
