# EarbudKit - Official Release

This directory contains the production-hardened standalone Android APK for **EarbudKit**.

## Download

- **Direct Download**: [Download EarbudKit.apk](https://github.com/kshitijkdev/EarbudKit/raw/main/release/EarbudKit.apk)
- **File Name**: `EarbudKit.apk`
- **File Size**: `37.15 MB` (37,153,897 bytes)
- **Target Architecture**: `arm64-v8a` (64-bit Android)
- **Minimum Android Version**: Android 7.0 Nougat (API level 24)
- **Target Android Version**: Android 15 Vanilla Ice Cream (API level 35)

## Integrity Verification

Verify the APK checksum before installing:

- **SHA-256**:
  ```text
  12355E6C71722FE79C2C6FBAF1E084AF8439BAA15B5223C091A2DAF3606DAE0B
  ```

### Verification Command

On Windows (PowerShell):
```powershell
Get-FileHash -Path .\EarbudKit.apk -Algorithm SHA256
```

On macOS / Linux:
```bash
sha256sum EarbudKit.apk
```

---

## Security & Privacy Profile

EarbudKit is designed with an air-gapped, zero-telemetry architecture:

1. **Air-Gapped Privacy**:
   - Zero network permissions (`android.permission.INTERNET` is excluded in release builds).
   - No external API calls, tracking, analytics, or user accounts.
2. **Cloud & ADB Backup Isolation**:
   - `android:allowBackup="false"` in manifest.
   - Comprehensive `dataExtractionRules` and `fullBackupContent` rules excluding all storage domains (`root`, `file`, `database`, `sharedpref`, `external`) to ensure saved Bluetooth MACs and disconnect GPS coordinates cannot leak via cloud sync or ADB backups.
3. **IPC & PendingIntent Hardening**:
   - Dynamic BroadcastReceivers strictly validate intent actions against an internal allowlist.
   - Parcelable extras are type-checked and wrapped in exception handlers.
   - All `PendingIntent` instances enforce `PendingIntent.FLAG_IMMUTABLE`.
4. **Input Sanitization**:
   - Advertised Bluetooth device names are sanitized to strip control characters and newlines (`[\x00-\x1F\x7F]`) with bounded lengths (<= 64 chars).
   - MAC addresses are strictly validated against IEEE 802 format (`XX:XX:XX:XX:XX:XX`).
   - Battery readings are bound-checked (`0..100%`) and BLE RSSI readings are clamped (`-100..-20 dBm`).
   - App launch package names are validated and verified via `PackageManager` with safe `ActivityNotFoundException` handling.
   - Find My Device coordinates are validated within finite geographic ranges (`[-90, 90]`, `[-180, 180]`) and URL-encoded.
5. **R8 Minification & Code Obfuscation**:
   - ProGuard/R8 dead-code stripping, class obfuscation, and AAPT2 resource shrinking enabled (~60% smaller APK footprint).
   - `android:debuggable="false"` enforced.

---

## Installation Instructions (Sideloading)

1. Download `EarbudKit.apk` directly to your Android device or transfer it via USB.
2. Open your device's file manager and tap `EarbudKit.apk`.
3. If prompted by Android, grant permission to **Install unknown apps** for your file manager or browser.
4. Tap **Install** and open **EarbudKit**.
5. Grant Bluetooth permissions when prompted to detect your paired headphones and earbuds.
