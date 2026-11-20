import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';
import { DeviceLocation } from '../store/deviceStore';

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
    console.warn('[Location] Error requesting location permissions:', e);
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
      console.warn('[Location] Location permission denied, cannot record disconnect coordinates');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    let addressText: string | null = null;
    try {
      const geocoded = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
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
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp || Date.now(),
      addressText,
    };

    console.log('[Location] Recorded disconnect location:', result);
    return result;
  } catch (e) {
    console.error('[Location] Failed to capture location on disconnect:', e);
    return null;
  }
}

/**
 * Opens Google Maps Navigation directly to the coordinates.
 */
export async function openGoogleMapsNavigation(
  latitude: number,
  longitude: number
): Promise<boolean> {
  const googleMapsAppUrl = `google.navigation:q=${latitude},${longitude}`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

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
    console.error('[Location] Failed to open Google Maps:', e);
    return false;
  }
}
