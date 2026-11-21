package expo.modules.earbudnative

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import java.util.regex.Pattern

/**
 * Security utilities for EarbudKit native module and services.
 * Provides strict input validation, sanitization, bound checking,
 * and PII masking for Bluetooth identifiers.
 */
object EarbudSecurityUtils {
    private val MAC_PATTERN = Pattern.compile("^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$")
    private val PACKAGE_PATTERN = Pattern.compile("^[a-zA-Z][a-zA-Z0-9_]*(\\.[a-zA-Z][a-zA-Z0-9_]*)+$")
    private val CONTROL_CHARS_PATTERN = Pattern.compile("[\\p{Cntrl}\\r\\n\\t]")

    val ALLOWED_BROADCAST_ACTIONS: Set<String> = setOf(
        BluetoothDevice.ACTION_ACL_CONNECTED,
        BluetoothDevice.ACTION_ACL_DISCONNECTED,
        BluetoothDevice.ACTION_ACL_DISCONNECT_REQUESTED,
        BluetoothAdapter.ACTION_STATE_CHANGED,
        BluetoothDevice.ACTION_BOND_STATE_CHANGED,
        ACTION_BATTERY_LEVEL_CHANGED
    )

    /**
     * Validates whether the given string is a valid IEEE 802 MAC-48 address.
     */
    fun isValidMacAddress(address: String?): Boolean {
        if (address.isNullOrBlank()) return false
        return MAC_PATTERN.matcher(address.trim()).matches()
    }

    /**
     * Returns sanitized uppercase MAC address if valid, otherwise null.
     */
    fun sanitizeMacAddress(address: String?): String? {
        if (address.isNullOrBlank()) return null
        val trimmed = address.trim()
        return if (MAC_PATTERN.matcher(trimmed).matches()) trimmed.uppercase() else null
    }

    /**
     * Masks the first 4 octets of a MAC address for secure logging.
     * Example: "AA:BB:CC:DD:12:34" -> "XX:XX:XX:XX:12:34"
     */
    fun maskMacAddress(address: String?): String {
        if (address.isNullOrBlank()) return "XX:XX:XX:XX:XX:XX"
        val trimmed = address.trim()
        if (!MAC_PATTERN.matcher(trimmed).matches()) return "XX:XX:XX:XX:XX:XX"
        val parts = trimmed.split(":")
        return "XX:XX:XX:XX:${parts[4]}:${parts[5]}".uppercase()
    }

    /**
     * Sanitizes advertised Bluetooth device names by removing control characters,
     * newlines, and truncating to a maximum safe length of 64 characters.
     */
    fun sanitizeDeviceName(name: String?): String {
        if (name.isNullOrBlank()) return "Unknown Device"
        val cleaned = CONTROL_CHARS_PATTERN.matcher(name).replaceAll("").trim()
        if (cleaned.isEmpty()) return "Unknown Device"
        return if (cleaned.length > 64) cleaned.substring(0, 64) else cleaned
    }

    /**
     * Validates and bounds a battery percentage level (0 to 100).
     * Returns null if out of range or malformed.
     */
    fun clampBattery(level: Int?): Int? {
        if (level == null) return null
        return if (level in 0..100) level else null
    }

    /**
     * Clamps BLE RSSI to standard realistic dBm range (-100 to -20).
     */
    fun clampRssi(rssi: Int): Int {
        return rssi.coerceIn(-100, -20)
    }

    /**
     * Validates an Android application package name format to prevent intent injection.
     */
    fun isValidPackageName(packageName: String?): Boolean {
        if (packageName.isNullOrBlank()) return false
        return PACKAGE_PATTERN.matcher(packageName.trim()).matches()
    }
}
