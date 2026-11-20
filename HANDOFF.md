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
- [ ] Stage 7: Find my device (last known location + BLE RSSI meter)
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
  - `(tabs)/auto.tsx`: Auto-actions screen with device selector pills, On-Connect actions (app launch, volume preset, DND toggle), On-Disconnect actions (pause media playback, reset volume, restore DND), and test execution buttons
  - `(tabs)/tools.tsx`: Tools screen placeholder
  - `(tabs)/settings.tsx`: Settings screen with theme selector & privacy note
- `src/`
  - `store/deviceStore.ts`: Multi-device Zustand store persisted to AsyncStorage (`@earbudkit/devices-storage`), keyed by MAC address
  - `store/autoStore.ts`: Auto-actions profile store persisted to AsyncStorage (`@earbudkit/auto-storage`), providing per-device connect/disconnect profiles, presets (headphones -> Spotify/70%, earbuds -> Pocket Casts/55%), and execution runners
  - `store/__tests__/deviceStore.test.ts`: Unit test for store persistence and battery threshold triggers
  - `store/__tests__/autoStore.test.ts`: Unit test for auto-actions profile generation, updates, and execution
  - `services/notifications.ts`: Local notification manager using `expo-notifications` for low-battery alerts
  - `features/devices/useBluetoothDevices.ts`: Hook bridging native Bluetooth events, battery updates, and auto-action profile execution on connect/disconnect
  - `theme/`: Theme system (Material 3 inspired light/dark palette, typography, spacing, ThemeProvider)
- `modules/earbud-native/`: Local Expo native module
  - `android/src/main/java/expo/modules/earbudnative/EarbudForegroundService.kt`: Android Foreground Service (type: `connectedDevice`) with persistent notification (`"EarbudKit is watching your devices"`), dedicated ACL & battery BroadcastReceiver
  - `android/src/main/java/expo/modules/earbudnative/EarbudNativeModule.kt`: Kotlin module implementing 3-tier battery reading, `setMediaVolume(0-100%)`, `getMediaVolume()`, `pauseMedia()` (dispatching KEYCODE_MEDIA_PAUSE & audio focus), `launchApp(packageName)`, and Do Not Disturb policy controls
  - `android/src/main/AndroidManifest.xml`: Permissions for `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_CONNECTED_DEVICE`, `POST_NOTIFICATIONS`, `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`, `MODIFY_AUDIO_SETTINGS`
  - `src/index.ts`: Typed JS interface and EventEmitter wrappers
- `android/`: Native Android project generated via `expo prebuild`

## Architecture Decisions
1. **Per-Device Automation Profiles**: Stored by MAC address in `autoStore`, executing automatically on `onDeviceConnectionChanged` events (both in foreground and via `EarbudForegroundService` in background).
2. **Audio & App Actions**: Uses standard Android `AudioManager.setStreamVolume` and `dispatchMediaKeyEvent` + `requestAudioFocus` to pause any playing audio player reliably without vendor lock-in.
3. **App Launcher**: Opens target packages via Android `PackageManager.getLaunchIntentForPackage` with `FLAG_ACTIVITY_NEW_TASK`.
4. **DND Integration**: Safe check of `NotificationManager.isNotificationPolicyAccessGranted`, with one-tap deep link to system Notification Policy Access settings when permission is needed.

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

# Verify store and auto-actions logic
npx tsx src/store/__tests__/deviceStore.test.ts
npx tsx src/store/__tests__/autoStore.test.ts
```

## NEXT STEP
Stage 7: Find my device
First action is to implement disconnect location recording:
- On disconnect, capture current GPS coordinates via `expo-location` and timestamp per device
- Save last known location in deviceStore (latitude, longitude, accuracy, timestamp)
- Build Find My Device UI in Tools screen (`app/(tabs)/tools.tsx`):
  - Device card with last known location address / coordinates & timestamp
  - "Navigate" button (opens Google Maps / geo intent with device coordinates)
  - Live BLE RSSI "getting warmer" proximity meter while scanning for nearby devices
  - Disconnect alert notification if device drops while phone is in active use
  - In-context location permission requests with clear user explanations.
