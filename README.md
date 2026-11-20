# EarbudKit 🎧

An Android-first companion app for Bluetooth audio devices that have **NO official app**. Built with React Native, Expo SDK 58, and a local Kotlin native module using standard Android/Bluetooth APIs.

---

## 🎯 Target Devices
- **Noise Buds Vector**: TWS earbuds, Bluetooth 5.3, Sony LDAC high-resolution audio.
- **realme TechLife Studio H1**: Over-ear headphones, ANC, 70-hour battery life.
- *Any generic Bluetooth audio device*: Headphones, earbuds, speakers, and car receivers. Standard Android APIs only; no vendor-proprietary protocols.

---

## ✨ Features

1. **Multi-Device Connection & Management (Stage 3)**
   - Add/remove tracked devices keyed by MAC address in a Zustand store persisted to AsyncStorage (`@earbudkit/devices-storage`).
   - Custom nicknames, icon selection (TWS Earbuds vs. Over-Ear Headphones), active target marking, and untracked bonded device discovery.

2. **Persistent Foreground Service Watcher (Stage 4)**
   - Android foreground service (`connectedDevice` type) with persistent notification: *"EarbudKit is watching your devices"*.
   - Receives Bluetooth ACL connect and disconnect broadcasts in real time with the screen off and app in the background.
   - Simultaneous multi-device connection tracking on the Home screen.

3. **3-Tier Battery Monitoring & Low-Battery Alerts (Stage 5)**
   - Tier 1: `BluetoothDevice.getBatteryLevel()` via reflection.
   - Tier 2: `android.bluetooth.device.action.BATTERY_LEVEL_CHANGED` broadcast receiver cache.
   - Tier 3: BLE Battery Service GATT (UUID 0x180F / 0x2A19).
   - "Unavailable" fallback with explanation when unreadable by the Bluetooth driver (never crashes or invents placeholder data).
   - Configurable per-device low-battery threshold (default 20%) with local notifications via `expo-notifications`.

4. **Per-Device Auto-Actions (Stage 6)**
   - On-Connect: Automatically launch an audio/podcast app (Spotify, Pocket Casts, YouTube Music, Audible), set custom media volume, and enable Do Not Disturb.
   - On-Disconnect: Automatically pause playback (`pauseMedia()` with `KEYCODE_MEDIA_PAUSE` & audio focus request), restore default media volume, and disable DND.
   - Profile presets customized for earbuds (podcasts) vs. headphones (music).

5. **Find My Device & BLE RSSI Radar (Stage 7)**
   - Records GPS coordinates and reverse-geocoded street address on disconnect using `expo-location`.
   - 1-tap navigation button launching turn-by-turn directions in Google Maps (`google.navigation:q=lat,lng`).
   - Live BLE RSSI "Getting Warmer" proximity meter (-100 to -40 dBm, Cold ❄️ / Warmer ♨️ / Hot 🔥).
   - Disconnect drop alert notifying the user if a device disconnects while the screen is in active use.

6. **Sleep Timer with 10-Second Volume Fade Out (Stage 8)**
   - Presets for 15, 30, 45, 60 minutes, custom stepper, and a 15-second quick test mode.
   - Smooth 10-second linear volume fade down to 0, followed by media pause.

7. **System Equalizer (AudioFX) (Stage 9)**
   - Best-effort hardware equalizer bound to `android.media.audiofx.Equalizer` on global audio session 0.
   - 5 frequency bands (60 Hz, 230 Hz, 910 Hz, 3.6 kHz, 14 kHz) with gain adjustment from -15 dB to +15 dB (-1500 to +1500 mB).
   - Presets: `Flat`, `Bass Boost`, `Vocal`, `Treble`, and `Custom`.
   - Saved per device MAC address and synced on connect.
   - Graceful degradation: Displays `"EQ unavailable on this device"` banner if hardware AudioFX is unsupported.

8. **Active Audio Codec Detection & Listening Statistics (Stage 10)**
   - Detects active A2DP audio codec via `BluetoothCodecStatus` / `BluetoothCodecConfig` reflection: `LDAC`, `aptX`, `aptX HD`, `AAC`, `SBC`, or `Unknown`.
   - Tracks cumulative and daily listening time per device in `statsStore.ts` (`@earbudkit/stats-storage`).
   - Dedicated `Stats` screen with lifetime and daily usage breakdown, session counts, and live active session timer.
   - Native Android **Quick Settings Tile** (`EarbudQuickTileService`) in notification shade for 1-tap app launch and live monitoring.

9. **Sonic Neo-Glass Design System & UI Architecture (Stages D1–D7)**
   - Complete visual reskin inspired by cybernetic glassmorphism and bento ergonomics.
   - **Color Palette**: Void base (`#0B0B10`), Electric Violet (`#7C5CFF`), Cyber Hot Pink (`#FF4FD8`), and Neon Lime (`#C6FF3D`) in Dark mode; matched with high-contrast, clean frosted surfaces (`#FCF8FF`, `#5E39E0`, `#AF0093`, `#006947`) in Light mode.
   - **Typography**: Space Grotesk for bold headlines, numerical telemetry readouts, and badge chips; Inter for clear body text. Native offline TTF font bundling in Android assets.
   - **Component Suite (`src/components/ui/`)**:
     - `GlassCard`: 24px Bento radius, translucent surface fills, 1px subtle borders, and optional active target violet glow.
     - `FloatingPillNav`: Elevated floating bottom navigation dock across 5 core tabs (Home, Devices, Auto, Tools, Settings) with active violet highlight and hot pink indicator.
     - `PillButton`: 48px touch targets, full 9999px pill morphology, with primary violet, secondary glass, ghost lime, and danger red variants.
     - `Toggle`: Chunky tactile 50×28 switch with animated sliding thumb, flooding with Lime Neon when active.
     - `NeonSlider`: 4px gradient track (violet to hot pink) with tactile - / + stepping buttons.
     - `BatteryRing`: SVG telemetry arc with dynamic color shifting (Lime > 20%, Error <= 20%) and friendly "Unavailable" fallback state.
     - `StatusChip`: Micro-chips with pulsing live activity dots.

---

## 🔒 Privacy Guarantee
- **100% On-Device**: All data (devices, settings, locations, listening statistics) stays in local AsyncStorage.
- **No Accounts**: No login or registration required.
- **No Analytics / No Telemetry**: Zero tracking or third-party servers.

---

## 📱 Android Version Compatibility (Android 8 to 15)
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

## 🛠️ Stack & Architecture
- **Framework**: Expo SDK 58, React Native 0.81, TypeScript 5.9
- **Routing**: `expo-router` with tab navigation (Home, Devices, Auto, Tools, Settings) + Stack routes (`/stats`)
- **State Management**: Zustand with `persist` middleware and `@react-native-async-storage/async-storage`
- **Native Module**: Local Kotlin module `modules/earbud-native` exposing:
  - `EarbudNativeModule.kt` (Bluetooth, Battery, Codec, Volume, AudioFX Equalizer, BLE RSSI scanner)
  - `EarbudForegroundService.kt` (Android `connectedDevice` background service)
  - `EarbudQuickTileService.kt` (Android Quick Settings Tile)

---

## 🚀 Build and Run

### Prerequisites
- Node.js 22+ (tested on Node v25)
- Android SDK (API 26–35)
- Java JDK 17

### Commands
```bash
# Install dependencies
npm install

# Type check
npx tsc --noEmit

# Run unit tests
npx tsx src/store/__tests__/deviceStore.test.ts
npx tsx src/store/__tests__/autoStore.test.ts
npx tsx src/store/__tests__/findDevice.test.ts
npx tsx src/store/__tests__/sleepTimer.test.ts
npx tsx src/store/__tests__/equalizer.test.ts
npx tsx src/store/__tests__/stats.test.ts

# Prebuild native Android project
npx expo prebuild

# Run on connected Android device / emulator
npx expo run:android
```

---

## 📄 License
MIT License.
