import { sanitizeDeviceName, safeLog } from '../utils/security';

let notificationsModule: typeof import('expo-notifications') | null = null;

try {
  notificationsModule = require('expo-notifications');
  notificationsModule?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (_e) {
  // Graceful fallback in non-native or testing environments
}

/**
 * Sends a local notification for low battery on a device.
 */
export async function sendLowBatteryNotification(
  deviceName: string,
  batteryLevel: number,
  threshold: number
): Promise<boolean> {
  const safeName = sanitizeDeviceName(deviceName);
  if (!notificationsModule) {
    safeLog.log(`[Notifications TEST STUB] Low Battery: ${safeName} at ${batteryLevel}% (threshold: ${threshold}%)`);
    return true;
  }

  try {
    const { status } = await notificationsModule.getPermissionsAsync();
    if (status !== 'granted') {
      const request = await notificationsModule.requestPermissionsAsync();
      if (request.status !== 'granted') {
        safeLog.warn('[Notifications] Notification permission not granted');
        return false;
      }
    }

    await notificationsModule.scheduleNotificationAsync({
      content: {
        title: `Low Battery: ${safeName}`,
        body: `${safeName} is at ${batteryLevel}% (below your ${threshold}% alert threshold). Please plug it in to charge.`,
        sound: true,
        priority: notificationsModule.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });

    safeLog.log(`[Notifications] Low battery notification delivered for ${safeName}`);
    return true;
  } catch (e) {
    safeLog.error('[Notifications] Failed to send low battery notification:', e);
    return false;
  }
}

/**
 * Stage 7: Sends a disconnect alert notification when a device drops while phone is in use.
 */
export async function sendDisconnectAlert(
  deviceName: string,
  locationText?: string | null
): Promise<boolean> {
  const safeName = sanitizeDeviceName(deviceName);
  if (!notificationsModule) {
    safeLog.log(`[Notifications TEST STUB] Disconnect Alert: ${safeName} disconnected. Location: ${locationText ?? 'Saved'}`);
    return true;
  }

  try {
    const body = locationText
      ? `${safeName} has disconnected near ${locationText}. Tap to view on map.`
      : `${safeName} has disconnected. Last known location saved in Find My Device.`;

    await notificationsModule.scheduleNotificationAsync({
      content: {
        title: `${safeName} Disconnected`,
        body,
        sound: true,
        priority: notificationsModule.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });

    safeLog.log(`[Notifications] Disconnect alert delivered for ${safeName}`);
    return true;
  } catch (e) {
    safeLog.error('[Notifications] Failed to send disconnect alert:', e);
    return false;
  }
}
