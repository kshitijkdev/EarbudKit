/**
 * Security and sanitization utilities for EarbudKit.
 * Provides MAC validation, masking, name sanitization, coordinate bounds checking,
 * and dev-only logging wrappers to prevent PII/location leaks in production.
 */

const MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/g;

/**
 * Validates whether the given string is a valid IEEE 802 MAC-48 address.
 */
export function isValidMac(address: unknown): boolean {
  if (typeof address !== 'string') return false;
  return MAC_REGEX.test(address.trim());
}

/**
 * Returns a sanitized uppercase MAC address if valid, otherwise empty string.
 */
export function sanitizeMac(address: unknown): string {
  if (typeof address !== 'string') return '';
  const trimmed = address.trim();
  return MAC_REGEX.test(trimmed) ? trimmed.toUpperCase() : '';
}

/**
 * Masks the first 4 octets of a MAC address for secure display or logging.
 * Example: "AA:BB:CC:DD:12:34" -> "XX:XX:XX:XX:12:34"
 */
export function maskMac(address: unknown): string {
  if (typeof address !== 'string') return 'XX:XX:XX:XX:XX:XX';
  const trimmed = address.trim();
  if (!MAC_REGEX.test(trimmed)) return 'XX:XX:XX:XX:XX:XX';
  const parts = trimmed.split(':');
  return `XX:XX:XX:XX:${parts[4]}:${parts[5]}`.toUpperCase();
}

/**
 * Sanitizes Bluetooth device name: removes control characters and newlines,
 * bounds length to 64 characters, and falls back to "Unknown Device".
 */
export function sanitizeDeviceName(name: unknown): string {
  if (typeof name !== 'string') return 'Unknown Device';
  const cleaned = name.replace(CONTROL_CHARS_REGEX, '').trim();
  if (cleaned.length === 0) return 'Unknown Device';
  return cleaned.length > 64 ? cleaned.slice(0, 64) : cleaned;
}

/**
 * Validates that latitude and longitude are finite numbers within valid geographic ranges:
 * Latitude: -90 to 90
 * Longitude: -180 to 180
 */
export function isValidCoordinate(latitude: unknown, longitude: unknown): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return true;
}

/**
 * Validates and bounds a battery percentage level (0 to 100).
 */
export function clampBattery(level: unknown): number | null {
  if (typeof level !== 'number' || !Number.isFinite(level) || Number.isNaN(level)) {
    return null;
  }
  const rounded = Math.round(level);
  return rounded >= 0 && rounded <= 100 ? rounded : null;
}

/**
 * Clamps BLE RSSI to standard realistic dBm range (-100 to -20).
 */
export function clampRssi(rssi: unknown): number {
  if (typeof rssi !== 'number' || !Number.isFinite(rssi) || Number.isNaN(rssi)) {
    return -70;
  }
  return Math.max(-100, Math.min(-20, Math.round(rssi)));
}

/**
 * Safe logger that only prints when __DEV__ is true, preventing sensitive
 * device identifiers and location data from leaking in production release builds.
 */
export const safeLog = {
  log: (...args: any[]) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.error(...args);
    }
  },
};
