import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';
import { DeviceLocation } from '../store/deviceStore';
import { isValidCoordinate, safeLog } from '../utils/security';

/**
 * Request location permission with context and rationale.
 */
export async function requestLocationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    if (existingStatus === 'granted') {
      return true;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    safeLog.warn('[Location] Error requesting location permissions:', e);
    return false;
  }
}

/**
 * Capture current GPS coordinates and human-readable address on device disconnect.
 */
export async function captureCurrentLocation(): Promise<DeviceLocation | null> {
  try {
    const hasPerm = await requestLocationPermissions();
    if (!hasPerm) {
      safeLog.warn('[Location] Location permission denied, cannot record disconnect coordinates');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude, accuracy } = location.coords;
    if (!isValidCoordinate(latitude, longitude)) {
      safeLog.warn('[Location] Received invalid coordinates from provider');
      return null;
    }

    let addressText: string | null = null;
    try {
      const geocoded = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (geocoded.length > 0) {
        const place = geocoded[0];
        const parts = [
          place.name || place.street,
          place.district || place.subregion,
          place.city,
        ].filter(Boolean);
        addressText = parts.length > 0 ? parts.join(', ') : place.city ?? null;
      }
    } catch (_geoErr) {
      // Geocoding failure shouldn't block coordinate saving
    }

    const result: DeviceLocation = {
      latitude,
      longitude,
      accuracy,
      timestamp: location.timestamp || Date.now(),
      addressText,
    };

    safeLog.log('[Location] Recorded disconnect location successfully');
    return result;
  } catch (e) {
    safeLog.error('[Location] Failed to capture location on disconnect:', e);
    return null;
  }
}

/**
 * Opens Google Maps Navigation directly to the coordinates.
 * Validates coordinate ranges and encodes parameters to prevent injection.
 */
export async function openGoogleMapsNavigation(
  latitude: number,
  longitude: number
): Promise<boolean> {
  if (!isValidCoordinate(latitude, longitude)) {
    safeLog.warn('[Location] Invalid coordinates passed to openGoogleMapsNavigation');
    return false;
  }

  const latStr = encodeURIComponent(latitude.toFixed(6));
  const lngStr = encodeURIComponent(longitude.toFixed(6));
  const googleMapsAppUrl = `google.navigation:q=${latStr},${lngStr}`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latStr},${lngStr}`;

  try {
    if (Platform.OS === 'android') {
      const supported = await Linking.canOpenURL(googleMapsAppUrl);
      if (supported) {
        await Linking.openURL(googleMapsAppUrl);
        return true;
      }
    }
    await Linking.openURL(webUrl);
    return true;
  } catch (e) {
    safeLog.error('[Location] Failed to open Google Maps:', e);
    return false;
  }
}
