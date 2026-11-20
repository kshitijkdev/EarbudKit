# EarbudKit - Development Handoff

## Project Overview
Android-first companion app for Bluetooth audio devices without official apps (e.g., Noise Buds Vector TWS earbuds, realme TechLife Studio H1 headphones). Standard Android/Bluetooth APIs only (no vendor protocols, no accounts, no analytics).

## Stage Checklist
- [x] Stage 1: Project setup (Expo TS SDK 58, expo-router 5 tabs, theme, folders, native module scaffold, prebuild)
- [x] Stage 2: Native module core (Kotlin) - getBondedAudioDevices & ACL connect/disconnect events
- [x] Stage 3: Multi-device store and Devices screen (Zustand + AsyncStorage, MAC keyed, nicknames, icons, active status)
- [x] Stage 4: Foreground service and Home screen (connectedDevice foreground service, persistent notification, multi-device cards)
- [x] Stage 5: Battery monitoring (reflection, BATTERY_LEVEL_CHANGED broadcast, BLE GATT 0x180F/0x2A19, "Unavailable" fallback, threshold alerts)
- [ ] Stage 6: Auto-actions (profiles on connect/disconnect)
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
  - `(tabs)/auto.tsx`: Auto-actions screen
  - `(tabs)/tools.tsx`: Tools screen
  - `(tabs)/settings.tsx`: Settings screen with theme selector & privacy note
- `src/`
  - `store/deviceStore.ts`: Multi-device Zustand store persisted to AsyncStorage (`@earbudkit/devices-storage`), keyed by MAC address, with battery level tracking, per-device low battery threshold (default 20%), alert debouncing, and automated notification triggers
  - `store/__tests__/deviceStore.test.ts`: Verification test verifying battery reading, threshold alert triggering, and "Unavailable" handling
  - `services/notifications.ts`: Local notification manager using `expo-notifications` for low-battery alerts
  - `features/devices/useBluetoothDevices.ts`: Hook bridging native Bluetooth events & battery level listeners into the Zustand store
  - `theme/`: Theme system (Material 3 inspired light/dark palette, typography, spacing, ThemeProvider)
- `modules/earbud-native/`: Local Expo native module
  - `android/src/main/java/expo/modules/earbudnative/EarbudForegroundService.kt`: Android Foreground Service (type: `connectedDevice`) with persistent notification (`"EarbudKit is watching your devices"`), dedicated ACL & battery BroadcastReceiver
  - `android/src/main/java/expo/modules/earbudnative/EarbudNativeModule.kt`: Kotlin module implementing 3-tier battery reading: (a) reflection on `BluetoothDevice.getBatteryLevel()`, (b) broadcast cache for `android.bluetooth.device.action.BATTERY_LEVEL_CHANGED`, (c) BLE Battery Service GATT (0x180F / 0x2A19)
  - `android/src/main/AndroidManifest.xml`: Permissions for `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_CONNECTED_DEVICE`, `POST_NOTIFICATIONS`, `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`
  - `src/index.ts`: Typed JS interface and EventEmitter wrappers (`addBatteryListener`, `getDeviceBatteryLevel`)
- `android/`: Native Android project generated via `expo prebuild`

## Architecture Decisions
1. **3-Tier Battery Detection**:
   - Level 1: `BluetoothDevice.getBatteryLevel()` via reflection (standard Android 9+ hidden/public API).
   - Level 2: `android.bluetooth.device.action.BATTERY_LEVEL_CHANGED` broadcast receiver in module and foreground service.
   - Level 3: GATT client connection to BLE Battery Service (UUID `0x180F`), reading characteristic `0x2A19`.
   - Fallback: Returns `null` if none respond, displaying "Unavailable" with no crash.
2. **Per-Device Battery Alerts**: Configurable threshold (10%-30%, default 20%). Triggers `expo-notifications` alert when battery drops below threshold, with automatic disarming once recharged above `threshold + 5%`.

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

# Verify store and battery alert logic
npx tsx src/store/__tests__/deviceStore.test.ts
```

## NEXT STEP
Stage 6: Auto-actions
First action is to implement per-device automation profiles in a new store/feature slice that execute actions on connect and disconnect:
- Launch chosen app (package name / intent or deep link)
- Set media volume (0-100%) via native module `AudioManager.setStreamVolume`
- Pause media on disconnect via `KeyEvent.KEYCODE_MEDIA_PAUSE` or `AudioManager.requestAudioFocus`
- Open Do Not Disturb settings if permission missing
- Build the Auto screen (`app/(tabs)/auto.tsx`) to configure connect/disconnect profiles per device (e.g. headphones open music app, earbuds open podcast app).
