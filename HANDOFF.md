# EarbudKit - Development Handoff

## Project Overview
Android-first companion app for Bluetooth audio devices without official apps (e.g., Noise Buds Vector TWS earbuds, realme TechLife Studio H1 headphones). Standard Android/Bluetooth APIs only (no vendor protocols, no accounts, no analytics).

## Stage Checklist
- [x] Stage 1: Project setup (Expo TS SDK 58, expo-router 5 tabs, theme, folders, native module scaffold, prebuild)
- [x] Stage 2: Native module core (Kotlin) - getBondedAudioDevices & ACL connect/disconnect events
- [x] Stage 3: Multi-device store and Devices screen (Zustand + AsyncStorage, MAC keyed, nicknames, icons, active status)
- [x] Stage 4: Foreground service and Home screen (connectedDevice foreground service, persistent notification, multi-device cards)
- [x] Stage 5: Battery monitoring (reflection, BATTERY_LEVEL_CHANGED broadcast, BLE GATT 0x180F/0x2A19, "Unavailable" fallback, threshold alerts)
- [x] Stage 6: Auto-actions (per-device connect/disconnect profiles: app launch, media volume, pause media, DND integration)
- [x] Stage 7: Find my device (last known location on disconnect, Google Maps navigation, BLE RSSI proximity radar, disconnect drop alert)
- [x] Stage 8: Sleep timer (presets 15/30/45/60/custom, 10-second smooth volume fade-out, media pause)
- [x] Stage 9: Equalizer (best effort: android.media.audiofx.Equalizer, bands, presets, per-device profiles, graceful degradation)
- [x] Stage 10: Extras and codec (active audio codec LDAC/aptX/AAC/SBC/Unknown, listening-time stats screen, Quick Settings tile)
- [ ] Stage 11: Polish & verification

## File Map
- `app/`
  - `_layout.tsx`: Root layout with ThemeProvider and StatusBar
  - `stats.tsx`: Dedicated Listening Statistics screen with total listening time, today's breakdown, session counts, active audio codec explanation (LDAC, aptX HD, AAC, SBC), and simulation test controls
  - `(tabs)/_layout.tsx`: 5-tab navigation (Home, Devices, Auto, Tools, Settings)
  - `(tabs)/index.tsx`: Home screen displaying background device watcher toggle, connection metrics, tracked device cards with live badges, battery percentage ("Unavailable" when unreadable), active audio codec badge, and link to stats
  - `(tabs)/devices.tsx`: Devices screen displaying tracked devices, active device selection, nickname/icon/battery threshold editor modal, test alert button, paired Bluetooth devices list, and target presets
  - `(tabs)/auto.tsx`: Auto-actions screen with device selector pills, On-Connect actions, On-Disconnect actions, and test execution buttons
  - `(tabs)/tools.tsx`: Tools screen with Find My Device (last-seen coordinates & address, Google Maps navigate button), live BLE RSSI proximity radar meter ("getting warmer"), disconnect drop alert toggle, Sleep Timer (presets 15/30/45/60m, custom stepper, live countdown display, 10s volume fade-out, cancel button, and 15s quick test), and Equalizer (AudioFX presets Flat/Bass Boost/Vocal/Treble/Custom, 5-band gain steppers -15dB to +15dB, level meters, and "EQ unavailable on this device" degradation banner)
  - `(tabs)/settings.tsx`: Settings screen with theme selector, Statistics navigation button, Quick Settings Tile instructions, and privacy note
- `src/`
  - `store/deviceStore.ts`: Multi-device Zustand store persisted to AsyncStorage (`@earbudkit/devices-storage`), keyed by MAC address, with last known location recording, disconnect drop alert settings, battery monitoring, active audio codec tracking, and persistence
  - `store/autoStore.ts`: Auto-actions profile store persisted to AsyncStorage (`@earbudkit/auto-storage`)
  - `store/sleepTimerStore.ts`: Sleep timer store with presets (15, 30, 45, 60m, custom), 10-second linear volume fade-out step reduction, and `pauseMedia()` completion
  - `store/equalizerStore.ts`: Per-device hardware Equalizer store persisted to AsyncStorage (`@earbudkit/equalizer-storage`), presets (Flat, Bass Boost, Vocal, Treble, Custom), -1500 to +1500 mB gain clamping, and hardware synchronization
  - `store/statsStore.ts`: Listening statistics store persisted to AsyncStorage (`@earbudkit/stats-storage`), tracking total seconds, today's seconds, session counts, and live session duration
  - `store/__tests__/deviceStore.test.ts`: Unit test for store persistence and battery threshold triggers
  - `store/__tests__/autoStore.test.ts`: Unit test for auto-actions profiles
  - `store/__tests__/findDevice.test.ts`: Unit test for disconnect location saving, Google Maps URL generation, BLE RSSI meter calculations, and drop alerts
  - `store/__tests__/sleepTimer.test.ts`: Unit test for sleep timer presets, countdown, 10s volume fade, and media pause
  - `store/__tests__/equalizer.test.ts`: Unit test for equalizer presets, 5-band levels, clamping, multi-device isolation, and graceful degradation
  - `store/__tests__/stats.test.ts`: Unit test for listening stats calculation, today aggregation, codec storage, and formatting
  - `services/location.ts`: Location service using `expo-location` for GPS capture, reverse geocoding, and Google Maps Navigation launcher
  - `services/notifications.ts`: Local notification manager using `expo-notifications` for low-battery alerts and disconnect drop alerts
  - `features/devices/useBluetoothDevices.ts`: Hook bridging native Bluetooth events, battery updates, location recording on disconnect, auto-actions, hardware Equalizer application on connect, and session tracking
  - `theme/`: Theme system (Material 3 inspired light/dark palette, typography, spacing, ThemeProvider)
- `modules/earbud-native/`: Local Expo native module
  - `android/src/main/java/expo/modules/earbudnative/EarbudForegroundService.kt`: Android Foreground Service (type: `connectedDevice`) with persistent notification
  - `android/src/main/java/expo/modules/earbudnative/EarbudQuickTileService.kt`: Android Quick Settings TileService for notification shade integration (API 24 to 35)
  - `android/src/main/java/expo/modules/earbudnative/EarbudNativeModule.kt`: Kotlin module implementing 3-tier battery reading, audio volume controls, media pausing, app launcher, BLE RSSI scanner, screen interactive detection, android.media.audiofx.Equalizer integration, and BluetoothCodecStatus reflection
  - `android/src/main/AndroidManifest.xml`: Permissions for `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_CONNECTED_DEVICE`, `POST_NOTIFICATIONS`, `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `MODIFY_AUDIO_SETTINGS`, and Quick Settings Tile declaration
  - `src/index.ts`: Typed JS interface and EventEmitter wrappers (including Codec methods, Equalizer, and stats helpers)
- `android/`: Native Android project generated via `expo prebuild`

## Architecture Decisions
1. **Bluetooth Audio Codec Reflection**: Standard Android `BluetoothCodecStatus` / `BluetoothCodecConfig` reflection queries active A2DP codec (LDAC, aptX, aptX HD, AAC, SBC, LC3). Degrades gracefully to "Unknown" when unreadable or disconnected without crashing.
2. **Listening Session Lifecycle**: Bound directly to Bluetooth ACL connection events. Connecting starts a session timestamp; disconnecting flushes duration to daily and lifetime stats.
3. **Quick Settings Tile (`EarbudQuickTileService`)**: Native Android TileService handles Android 8 through 15 (using `PendingIntent` for Android 14+ and `startActivityAndCollapse` for earlier APIs).
4. **UI Navigation**: Dedicated `app/stats.tsx` screen linked from Home header and Settings, displaying per-device breakdown and codec technical details.

## Known Issues / Caveats
- Native APK compilation (`gradlew assembleDebug`) requires Android SDK on host machine. Prebuild, TypeScript, and unit tests pass with 0 errors.

## Build and Run Commands
```bash
# Type check
npx tsc --noEmit

# Prebuild native code
npx expo prebuild

# Run on Android
npx expo run:android

# Verify tests
npx tsx src/store/__tests__/deviceStore.test.ts
npx tsx src/store/__tests__/autoStore.test.ts
npx tsx src/store/__tests__/findDevice.test.ts
npx tsx src/store/__tests__/sleepTimer.test.ts
npx tsx src/store/__tests__/equalizer.test.ts
npx tsx src/store/__tests__/stats.test.ts
```

## NEXT STEP
Stage 11: Polish
First action is to audit permission-denied states across all screens (Bluetooth, Location, Notification), ensure empty states are clean and descriptive, verify privacy note in Settings, ensure Android 8 to 15 compatibility, run full verification suite, and update README.md.
