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
- [ ] Stage 9: Equalizer (best effort)
- [ ] Stage 10: Extras and codec (active audio codec, stats)
- [ ] Stage 11: Polish & verification

## File Map
- `app/`
  - `_layout.tsx`: Root layout with ThemeProvider and StatusBar
  - `(tabs)/_layout.tsx`: 5-tab navigation (Home, Devices, Auto, Tools, Settings)
  - `(tabs)/index.tsx`: Home screen displaying background device watcher toggle, connection metrics, tracked device cards with live badges & battery percentage ("Unavailable" when unreadable), and low-battery warning banners
  - `(tabs)/devices.tsx`: Devices screen displaying tracked devices, active device selection, nickname/icon/battery threshold editor modal, test alert button, paired Bluetooth devices list, and target presets
  - `(tabs)/auto.tsx`: Auto-actions screen with device selector pills, On-Connect actions, On-Disconnect actions, and test execution buttons
  - `(tabs)/tools.tsx`: Tools screen with Find My Device (last-seen coordinates & address, Google Maps navigate button), live BLE RSSI proximity radar meter ("getting warmer"), disconnect drop alert toggle, and Sleep Timer (presets 15/30/45/60m, custom stepper, live countdown display, 10s volume fade-out, cancel button, and 15s quick test)
  - `(tabs)/settings.tsx`: Settings screen with theme selector & privacy note
- `src/`
  - `store/deviceStore.ts`: Multi-device Zustand store persisted to AsyncStorage (`@earbudkit/devices-storage`), keyed by MAC address, with last known location recording, disconnect drop alert settings, battery monitoring, and persistence
  - `store/autoStore.ts`: Auto-actions profile store persisted to AsyncStorage (`@earbudkit/auto-storage`)
  - `store/sleepTimerStore.ts`: Sleep timer store with presets (15, 30, 45, 60m, custom), 10-second linear volume fade-out step reduction, and `pauseMedia()` completion
  - `store/__tests__/deviceStore.test.ts`: Unit test for store persistence and battery threshold triggers
  - `store/__tests__/autoStore.test.ts`: Unit test for auto-actions profiles
  - `store/__tests__/findDevice.test.ts`: Unit test for disconnect location saving, Google Maps URL generation, BLE RSSI meter calculations, and drop alerts
  - `store/__tests__/sleepTimer.test.ts`: Unit test for sleep timer presets, countdown, 10s volume fade, and media pause
  - `services/location.ts`: Location service using `expo-location` for GPS capture, reverse geocoding, and Google Maps Navigation launcher
  - `services/notifications.ts`: Local notification manager using `expo-notifications` for low-battery alerts and disconnect drop alerts
  - `features/devices/useBluetoothDevices.ts`: Hook bridging native Bluetooth events, battery updates, location recording on disconnect, and auto-actions
  - `theme/`: Theme system (Material 3 inspired light/dark palette, typography, spacing, ThemeProvider)
- `modules/earbud-native/`: Local Expo native module
  - `android/src/main/java/expo/modules/earbudnative/EarbudForegroundService.kt`: Android Foreground Service (type: `connectedDevice`) with persistent notification
  - `android/src/main/java/expo/modules/earbudnative/EarbudNativeModule.kt`: Kotlin module implementing 3-tier battery reading, audio volume controls, media pausing, app launcher, BLE RSSI scanner, and screen interactive detection
  - `android/src/main/AndroidManifest.xml`: Permissions for `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_CONNECTED_DEVICE`, `POST_NOTIFICATIONS`, `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `MODIFY_AUDIO_SETTINGS`
  - `src/index.ts`: Typed JS interface and EventEmitter wrappers
- `android/`: Native Android project generated via `expo prebuild`

## Architecture Decisions
1. **Sleep Timer Engine**: Operates independently in `sleepTimerStore.ts`, keeping track of total and remaining seconds.
2. **10-Second Volume Fade Out**: When `remainingSeconds <= 10`, enters `isFading` mode, gradually reducing the volume from the initial volume linearly to 0 each second.
3. **Media Pause on Completion**: Calls standard `pauseMedia()` (dispatching KEYCODE_MEDIA_PAUSE & audio focus) to cleanly pause any playing audio app.
4. **Quick Test Preset**: Includes a 15-second fast timer preset in Tools screen to verify the 10-second volume fade-out and media pausing immediately.

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
```

## NEXT STEP
Stage 9: Equalizer (best effort)
First action is to implement native Android Equalizer support using `android.media.audiofx.Equalizer`:
- Query frequency bands (count, center frequencies, min/max gain levels in millibels)
- Presets: Flat, Bass Boost, Vocal, Treble, Custom
- Wrap in try/catch to gracefully handle devices without hardware audiofx support
- Store equalizer band settings per device MAC address in Zustand
- Build the Equalizer UI with sliders for each band, preset selector, and "EQ unavailable on this device" degradation.
