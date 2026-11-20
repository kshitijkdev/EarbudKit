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
- [ ] Stage 8: Sleep timer (with 10s fade-out)
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
  - `(tabs)/tools.tsx`: Tools screen with Find My Device (last-seen coordinates & address, Google Maps navigate button), live BLE RSSI proximity radar meter ("getting warmer"), and disconnect drop alert toggle
  - `(tabs)/settings.tsx`: Settings screen with theme selector & privacy note
- `src/`
  - `store/deviceStore.ts`: Multi-device Zustand store persisted to AsyncStorage (`@earbudkit/devices-storage`), keyed by MAC address, with last known location recording (`DeviceLocation`), disconnect drop alert settings, battery monitoring, and persistence
  - `store/autoStore.ts`: Auto-actions profile store persisted to AsyncStorage (`@earbudkit/auto-storage`)
  - `store/__tests__/deviceStore.test.ts`: Unit test for store persistence and battery threshold triggers
  - `store/__tests__/autoStore.test.ts`: Unit test for auto-actions profiles
  - `store/__tests__/findDevice.test.ts`: Unit test for disconnect location saving, Google Maps URL generation, BLE RSSI meter calculations, and drop alerts
  - `services/location.ts`: Location service using `expo-location` for GPS capture, reverse geocoding, and Google Maps Navigation launcher
  - `services/notifications.ts`: Local notification manager using `expo-notifications` for low-battery alerts and disconnect drop alerts
  - `features/devices/useBluetoothDevices.ts`: Hook bridging native Bluetooth events, battery updates, location recording on disconnect, and auto-actions
  - `theme/`: Theme system (Material 3 inspired light/dark palette, typography, spacing, ThemeProvider)
- `modules/earbud-native/`: Local Expo native module
  - `android/src/main/java/expo/modules/earbudnative/EarbudForegroundService.kt`: Android Foreground Service (type: `connectedDevice`) with persistent notification
  - `android/src/main/java/expo/modules/earbudnative/EarbudNativeModule.kt`: Kotlin module implementing 3-tier battery reading, audio volume controls, media pausing, app launcher, BLE RSSI scanner (`startRssiScan`/`stopRssiScan`), and screen interactive detection
  - `android/src/main/AndroidManifest.xml`: Permissions for `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_CONNECTED_DEVICE`, `POST_NOTIFICATIONS`, `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`
  - `src/index.ts`: Typed JS interface and EventEmitter wrappers (`addRssiListener`, `startRssiScan`, `stopRssiScan`)
- `android/`: Native Android project generated via `expo prebuild`

## Architecture Decisions
1. **Disconnect Location Recording**: On ACL disconnect, automatically captures GPS coordinates via `expo-location` with balanced accuracy and reverse-geocodes to street/city, persisting under `TrackedDevice.lastLocation`.
2. **Navigation Intent**: Provides direct Google Maps Navigation via `google.navigation:q=lat,lng` intent on Android, with universal web map fallback.
3. **Live BLE RSSI Radar**: Uses `BluetoothLeScanner` with `ScanFilter` for the specific device MAC address. Maps RSSI (-100 dBm to -40 dBm) to a dynamic color-coded gauge (Cold ❄️ -> Warmer ♨️ -> Hot 🔥) for finding lost devices in close quarters.
4. **Disconnect Drop Alert**: If device drops while the user is actively using their phone (`PowerManager.isInteractive()`), immediately fires a priority notification to alert the user before they leave the device behind.

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
```

## NEXT STEP
Stage 8: Sleep timer
First action is to implement sleep timer logic with presets (15, 30, 45, 60 min, and custom duration), a 10-second smooth volume fade-out prior to ending, followed by pausing media playback via `pauseMedia()`. Add the sleep timer UI to Tools screen (`app/(tabs)/tools.tsx`) with live countdown, cancel button, and audio volume fading.
