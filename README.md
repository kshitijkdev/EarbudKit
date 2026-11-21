# EarbudKit

An Android-first companion app for Bluetooth audio devices that have no official companion app. Built with React Native, Expo SDK 58, and a local Kotlin native module using standard Android/Bluetooth APIs.

## Download Release APK

- **Production APK**: [Download release/EarbudKit.apk](release/EarbudKit.apk) (37.15 MB)
- **Direct GitHub Raw Link**: [Download EarbudKit.apk](https://github.com/kshitijkdev/EarbudKit/raw/main/release/EarbudKit.apk)
- **Integrity**: SHA-256 `695365F9849391972DA82E0FD159955BEDE0659EFD3692BDF618C104BBE11FD6`
- See [release/README.md](release/README.md) for full sideloading instructions, security hardening notes, and checksum verification.

---

## Target Hardware
- **Noise Buds Vector**: TWS earbuds, Bluetooth 5.3, Sony LDAC high-resolution audio.
- **realme TechLife Studio H1**: Over-ear headphones, ANC, 70-hour battery life.
- **Generic Bluetooth Audio Hardware**: Headphones, earbuds, studio monitors, receivers. Standard Android APIs only; no vendor-proprietary protocols, accounts, or cloud dependencies.

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
  - Frosted translucent mini-player and bottom navigation dock.
  - Dynamic ambient mesh glow behind the hero card tinted from the connected device profile.

---

## Core Features

### 1. Personal Hearing Calibration (Audiogram & Auto-EQ / HearID)
- **Interactive Audiogram Test**: 6-frequency hearing test spanning 250 Hz, 500 Hz, 1000 Hz, 2000 Hz, 4000 Hz, and 8000 Hz.
- **Dynamic Compensation Curve**: Normalizes individual hearing thresholds against an acoustic baseline and computes compensatory gain adjustments (-12 dB to +12 dB) across 5 hardware equalizer bands (60 Hz, 230 Hz, 910 Hz, 3.6 kHz, 14 kHz).
- **Per-Device Equalizer Synchronization**: Automatically applies and saves the calibrated compensation curve to the hardware `android.media.audiofx.Equalizer` keyed to the device MAC address.
- **Non-Destructive Revert**: Toggle off cleanly restores standard hardware flat or previous custom presets.

### 2. Smart Habit Predictor (Adaptive Context Engine / Smart Handshake)
- **Zero-Bloat On-Device Frequency Matrix**: Local storage footprint under 5 KB with zero background battery drain.
- **Time-of-Day Pattern Learning**: Learns user listening routines across 4 daily quadrants (Morning Commute, Afternoon Focus, Evening Workout, Late-Night Wind Down).
- **1-Tap Routine Capsule**: Surfaces an actionable Smart Handshake capsule on the Home screen with Bayesian confidence matching (85% to 99%).
- **Privacy Guaranteed**: 100% on-device learning; zero analytics, zero network requests.

### 3. Multi-Device Management & Bluetooth Telemetry
- Keyed by MAC address in a Zustand store persisted to AsyncStorage (`@earbudkit/devices-storage`).
- Form factor glyph switching (TWS Earbuds vs. Over-Ear Headphones).
- Untracked bonded Bluetooth device auto-discovery and 1-tap tracking.

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

### 10. Audio Codec Detection & Listening Statistics Dashboard
- Detects active A2DP audio codec via `BluetoothCodecStatus` / `BluetoothCodecConfig` reflection: `LDAC`, `aptX`, `aptX HD`, `AAC`, `SBC`, or `Unknown`.
- Dedicated Statistics screen (`/stats`) with 7-day bar chart, fleet usage distribution, active codec fidelity breakdown, and WHO-compliant decibel exposure meter.
- Native Android **Quick Settings Tile** (`EarbudQuickTileService`) in notification shade for 1-tap status monitoring.

---

## Privacy & Security

- **100% On-Device & Air-Gapped**: All data (devices, settings, locations, listening statistics, audiograms) is stored exclusively in local AsyncStorage.
- **Zero Network Permissions**: The app does not request `android.permission.INTERNET`.
- **No Accounts**: No login or registration required.
- **Zero Telemetry**: No third-party SDKs, tracking pixels, or cloud sync.

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

## Build and Verification

```bash
# Type check (0 errors)
npx tsc --noEmit

# Run all 8 unit test suites
npx tsx src/store/__tests__/deviceStore.test.ts
npx tsx src/store/__tests__/autoStore.test.ts
npx tsx src/store/__tests__/findDevice.test.ts
npx tsx src/store/__tests__/sleepTimer.test.ts
npx tsx src/store/__tests__/equalizer.test.ts
npx tsx src/store/__tests__/stats.test.ts
npx tsx src/store/__tests__/habitStore.test.ts
npx tsx src/store/__tests__/hearingCalibration.test.ts

# Export standalone offline JS bundle & drawables into Android project
npx expo export:embed --platform android --dev false --reset-cache --entry-file node_modules/expo-router/entry.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# Assemble debug APK
cd android
./gradlew.bat assembleDebug
```

---

## License
MIT License.
