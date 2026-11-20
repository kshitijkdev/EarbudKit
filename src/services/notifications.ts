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
  if (!notificationsModule) {
    console.log(`[Notifications TEST STUB] Low Battery: ${deviceName} at ${batteryLevel}% (threshold: ${threshold}%)`);
    return true;
  }

  try {
    const { status } = await notificationsModule.getPermissionsAsync();
    if (status !== 'granted') {
      const request = await notificationsModule.requestPermissionsAsync();
      if (request.status !== 'granted') {
        console.warn('[Notifications] Notification permission not granted');
        return false;
      }
    }

    await notificationsModule.scheduleNotificationAsync({
      content: {
        title: `🪫 Low Battery: ${deviceName}`,
        body: `${deviceName} is at ${batteryLevel}% (below your ${threshold}% alert threshold). Please plug it in to charge.`,
        sound: true,
        priority: notificationsModule.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });

    console.log(`[Notifications] Low battery notification delivered for ${deviceName} (${batteryLevel}%)`);
    return true;
  } catch (e) {
    console.error('[Notifications] Failed to send low battery notification:', e);
    return false;
  }
}
