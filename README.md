# EarbudKit

An Android-first companion app for Bluetooth audio devices that have no official companion app. Built with React Native, Expo SDK 58, and a local Kotlin native module using standard Android/Bluetooth APIs.

## Download & Installation

- **Official Builds**: Download the signed release APK from [GitHub Releases](https://github.com/kshitijkdev/EarbudKit/releases).
- **Building Release APK Locally**:
  ```bash
  cd android
  ./gradlew.bat assembleRelease
  ```
  The built APK will be located at `android/app/build/outputs/apk/release/app-release.apk`.
- **Release Signing**:
  To sign with your production keystore, copy `android/keystore.properties.example` to `android/keystore.properties` and fill in your keystore credentials. When `keystore.properties` is absent, Gradle automatically falls back to signing release builds with the debug keystore for development and CI testing.

---

## Target Hardware

- **Universal Bluetooth Audio**: TWS earbuds, over-ear studio headphones, wireless neckbands, bone conduction headsets, car kits, and Bluetooth audio receivers.
- **Standards Compliant**: Built strictly on standard Android A2DP, AVRCP, and HFP/HSP profiles. Zero vendor-proprietary protocols, zero cloud accounts, and zero internet permissions.

---

## Design System: Soft Studio

EarbudKit features the Apple Music-inspired **Soft Studio** design language: clean, tactile, editorial minimalism engineered for high-fidelity audio hardware.

- **Primary Accent Options**:
  - Brand Crimson: `#FA2D48` (Vivid red-pink default)
  - Cool Sky Blue: `#74D1FF` (Cool acoustic glow)
  - Warm Amber: `#FBBF24` (Warm studio tube illumination)
  - Emerald Studio: `#34D399` (Precision monitor green)
- **Dark Mode (OLED Pure Pitch)**:
  - Canvas Background: `#000000`
  - Solid Card Surfaces: `#1C1C1E`
  - Raised Controls & Track Grooves: `#2C2C2E`
  - Primary Text: `#FFFFFF`
  - Secondary Text: `#8E8E93`
- **Light Mode (Acoustic Studio Plates)**:
  - Canvas Background: `#F2F2F7`
  - Solid Card Surfaces: `#FFFFFF`
  - Raised Controls & Well Insets: `#E5E5EA`
  - Primary Text: `#000000`
  - Secondary Text: `#6C6C70`
- **Geometry & Materials**:
  - 20px corner radius for cards, dialog sheets, and album artwork containers.
  - 9999px full-pill geometry for primary action buttons, status chips, and segmented controllers.
  - 0.5px hairline dividers (`rgba(255, 255, 255, 0.08)` / `rgba(0, 0, 0, 0.08)`).
  - Minimum 48dp touch targets on all interactive controls for mobile accessibility.
  - Frosted translucent mini-player and bottom navigation dock.
  - Dynamic ambient mesh glow behind the hero card tinted from the connected device profile.

---

## Core Features

### 1. Sound Personalization (Acoustic Calibration & Auto-EQ)
- **Medical Disclaimer**: Clearly labeled as an acoustic personalization tool, not a diagnostic medical test. Includes a pre-test safety advisory reminding users to check ambient noise and starting volume.
- **Pure Tone Generator**: Native 16-bit PCM mono sine tone generator in Kotlin playing across 6 octave frequencies (250 Hz, 500 Hz, 1000 Hz, 2000 Hz, 4000 Hz, 8000 Hz) with 40ms attack/release envelopes to eliminate acoustic pops.
- **Volume Guardrails**: Tone output is hard-capped to a safe maximum level (max 45 dB) to protect hearing during calibration.
- **Safe Equalizer Compensation Curve**: Normalizes user hearing thresholds against baseline calibration and maps them to a safe 5-band gain curve clamped between -6 dB and +8 dB on hardware equalizer bands (60 Hz, 230 Hz, 910 Hz, 3.6 kHz, 14 kHz).
- **1-Tap Reset to Flat**: Dedicated control to delete calibration data and revert the Android hardware Equalizer back to 0 dB flat preset instantly.

### 2. Smart Habit Predictor (Adaptive Context Engine)
- **100% On-Device & Zero Bloat**: Local storage footprint under 5 KB with zero background battery drain.
- **Empirical Learning Threshold**: Requires at least 3 historical listening sessions in a daily quadrant (Morning Commute, Afternoon Focus, Evening Workout, Late-Night Wind Down) before surfacing routine recommendations. Displays honest learning progress ("Learning your routine: N more sessions needed") while building evidence.
- **Honest Ratio Confidence**: Calculates confidence strictly from empirical session frequency ratios (`matching / total * 100%`), never fabricating synthetic 90%+ scores.
- **1-Tap Routine Capsule**: Surfaces an actionable capsule on the Home screen that directly triggers the device's configured On-Connect profile from Auto-Actions (volume, app launch, DND).
- **Slot-Aware Dismissal**: Dismissing a routine respects the current quadrant and automatically resets when the time slot advances.

### 3. Real-Device Discovery & Live Telemetry
- **Live Reconciliation**: Native `getConnectedAudioDevices()` queries active A2DP and HEADSET proxies on startup, app resume, and Bluetooth state transitions.
- **Zero Fake Devices**: Fresh installations start completely clean. Audio devices are auto-tracked when connected or added manually from the bonded list.
- **Honest Fallbacks**: Displays real device battery percentage with a clear hardware notice when an accessory does not report battery status over Bluetooth. Codec badges display live detected A2DP codecs (LDAC, aptX, aptX HD, AAC, SBC) or 'Unknown'.
- **Relative Timestamps**: Real last-seen relative timestamps ("Connected now", "Seen just now", "Seen 15m ago", "Seen 2h ago", "Yesterday").

### 4. Background Device Watcher Daemon
- Android Foreground Service (`connectedDevice` type) with persistent notification shade status.
- Receives Bluetooth ACL connect and disconnect broadcasts in real time with the screen off and app in the background.

### 5. 3-Tier Battery Monitoring & Low-Battery Alerts
- Tier 1: `BluetoothDevice.getBatteryLevel()` via reflection.
- Tier 2: `android.bluetooth.device.action.BATTERY_LEVEL_CHANGED` broadcast receiver.
- Tier 3: BLE Battery Service GATT (UUID 0x180F / 0x2A19).
- Clean "Unavailable" fallback state when unreadable by the driver.
- Configurable low-battery threshold (10%, 20%, 30%) with local notifications.

### 6. Per-Device Auto-Actions
- **On-Connect**: Auto-launch media source (Spotify, Pocket Casts, YouTube Music, Apple Music, Amazon Music, Audible, VLC), set target volume level, and enable Do Not Disturb acoustic isolation.
- **On-Disconnect**: Auto-pause playback (`pauseMedia()` with `KEYCODE_MEDIA_PAUSE`), reset speaker volume, and restore phone ringer.

### 7. Find My Device & BLE Proximity Radar
- Records GPS coordinates and reverse-geocoded street address on disconnect using `expo-location`.
- 1-tap Google Maps turn-by-turn navigation launcher (`google.navigation:q=lat,lng`).
- Live BLE 2.4GHz RSSI proximity meter with distance status (Cold, Warm, Hot) and live dBm readout.
- Disconnect drop alert notifying the user if a device disconnects while the screen is in active use.

### 8. Sleep Timer with 10-Second Volume Fade
- Presets for 15, 30, 45, 60 minutes, custom minute stepper, and a 15-second quick test mode.
- Smooth 10-second linear volume fade down to 0, followed by media pause.

### 9. Parametric Equalizer (AudioFX)
- Hardware equalizer bound to `android.media.audiofx.Equalizer` on global audio session 0.
- 5 frequency bands (60 Hz, 230 Hz, 910 Hz, 3.6 kHz, 14 kHz) with gain adjustment from -15 dB to +15 dB (-1500 to +1500 mB).
- Presets: `Flat`, `Bass Boost`, `Vocal`, `Treble`, and `Custom`.
- Graceful degradation: Displays `"EQ unavailable on this device"` banner if hardware AudioFX is unsupported.

### 10. Real Listening Statistics & Codec Introspection
- Dedicated Statistics screen (`/stats`) with 100% real tracked usage time, daily listening durations, and dynamic fleet usage allocation.
- Codec introspection explaining detected Bluetooth A2DP codecs and dynamic bitrate behaviors.
- WHO-aligned safe listening guidelines without fabricating unmeasured in-ear SPL decibel values.
- Native Android **Quick Settings Tile** (`EarbudQuickTileService`) in notification shade for 1-tap status monitoring.

---

## Privacy & Security

- **100% On-Device & Air-Gapped**: All data (devices, settings, locations, listening statistics, calibration profiles) is stored exclusively in local AsyncStorage.
- **Zero Network Permissions**: The app does not declare or request `android.permission.INTERNET`.
- **No Accounts**: No login or registration required.
- **Zero Telemetry**: No third-party SDKs, tracking pixels, or cloud sync.
- **Hardened Backups**: Local storage excluded from cloud and ADB backups (`android:allowBackup="false"`).
- **Strict IPC**: All internal components use `android:exported="false"`, `FLAG_IMMUTABLE` on all PendingIntents, and strict action allowlists in BroadcastReceivers.

---

## Android Compatibility

- **Android 14 & 15 (API 34–35)**:
  - `FOREGROUND_SERVICE_CONNECTED_DEVICE` declared in `AndroidManifest.xml` and passed to `startForeground()`.
  - `PendingIntent` for `TileService.startActivityAndCollapse()`.
- **Android 13 (API 33)**:
  - Runtime `POST_NOTIFICATIONS` permission requested before starting foreground service and battery alerts.
- **Android 12 & 12L (API 31–32)**:
  - Runtime `BLUETOOTH_CONNECT` and `BLUETOOTH_SCAN` permissions.
- **Android 8 to 11 (API 26–30)**:
  - Install-time Bluetooth permissions (`BLUETOOTH`, `BLUETOOTH_ADMIN`) handled transparently.

---

## Verification & Build Commands

```bash
# Type check (0 errors)
npx tsc --noEmit

# Run all 9 unit test suites
npm test

# Layout QA check across all UI screens (0 violations)
npm run layout:check

# Export standalone offline JS bundle & drawables into Android project
npx expo export:embed --platform android --dev false --reset-cache --entry-file node_modules/expo-router/entry.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# Assemble release APK
cd android
./gradlew.bat assembleRelease
```

---

## License
MIT License.
