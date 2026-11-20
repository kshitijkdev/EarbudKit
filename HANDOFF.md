# EarbudKit - Development Handoff

## Project Overview
Android-first companion app for Bluetooth audio devices without official apps (e.g., Noise Buds Vector TWS earbuds, realme TechLife Studio H1 headphones). Standard Android/Bluetooth APIs only (no vendor protocols, no accounts, no analytics).

## Stage Checklist
- [x] Stage 1: Project setup (Expo TS SDK 58, expo-router 5 tabs, theme, folders, native module scaffold, prebuild)
- [x] Stage 2: Native module core (Kotlin) - getBondedAudioDevices & ACL connect/disconnect events
- [x] Stage 3: Multi-device store and Devices screen (Zustand + AsyncStorage, MAC keyed, nicknames, icons, active status)
- [x] Stage 4: Foreground service and Home screen (connectedDevice foreground service, persistent notification, multi-device cards)
- [ ] Stage 5: Battery monitoring
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
  - `(tabs)/index.tsx`: Home screen displaying background device watcher toggle, connection metrics, tracked device cards with live badges (supporting simultaneous dual connections), and quick presets
  - `(tabs)/devices.tsx`: Devices screen displaying tracked devices, active device selection, nickname & icon editor modal, paired Bluetooth devices list, and target presets
  - `(tabs)/auto.tsx`: Auto-actions screen placeholder
  - `(tabs)/tools.tsx`: Tools screen placeholder
  - `(tabs)/settings.tsx`: Settings screen with theme selector & privacy note
- `src/`
  - `store/deviceStore.ts`: Multi-device Zustand store persisted to AsyncStorage (`@earbudkit/devices-storage`), keyed by MAC address
  - `store/__tests__/deviceStore.test.ts`: Verification script for store operations and persistence
  - `features/devices/useBluetoothDevices.ts`: Hook bridging native Bluetooth events into the Zustand store
  - `theme/`: Theme system (Material 3 inspired light/dark palette, typography, spacing, ThemeProvider)
- `modules/earbud-native/`: Local Expo native module
  - `android/src/main/java/expo/modules/earbudnative/EarbudForegroundService.kt`: Android Foreground Service (type: `connectedDevice`) with persistent notification (`"EarbudKit is watching your devices"`), dedicated ACL BroadcastReceiver for background delivery with screen off
  - `android/src/main/java/expo/modules/earbudnative/EarbudNativeModule.kt`: Kotlin module handling device discovery, connection listeners, and service lifecycle controls (`startWatcherService`, `stopWatcherService`, `isWatcherServiceRunning`)
  - `android/src/main/AndroidManifest.xml`: Permissions for `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_CONNECTED_DEVICE`, `POST_NOTIFICATIONS`, `BLUETOOTH_CONNECT`
  - `src/index.ts`: Typed JS interface and EventEmitter wrappers
- `android/`: Native Android project generated via `expo prebuild`

## Architecture Decisions
1. **Foreground Service (`connectedDevice`)**: Declared with `android:foregroundServiceType="connectedDevice"` conforming to Android 14+ requirements. Runs with persistent notification to guarantee background ACL events and auto-actions when screen is off.
2. **Notification Channel**: Low-importance ongoing notification to prevent intrusive ringing while staying resident in memory.
3. **Simultaneous Connections**: Architecture treats all connected devices independently in Zustand; multiple devices (e.g. both earbuds and over-ear headphones) maintain their own live state and badges concurrently.

## Known Issues / Caveats
- Native APK compilation (`gradlew assembleDebug`) requires Android SDK on host machine. Prebuild and TypeScript validation pass with 0 errors.

## Build and Run Commands
```bash
# Type check
npx tsc --noEmit

# Prebuild native code
npx expo prebuild

# Run on Android
npx expo run:android

# Verify store logic
npx tsx src/store/__tests__/deviceStore.test.ts
```

## NEXT STEP
Stage 5: Battery
First action is to implement native battery level detection in `EarbudNativeModule.kt` trying in order:
(a) `BluetoothDevice.getBatteryLevel()` via reflection,
(b) `BATTERY_LEVEL_CHANGED` intent action (`android.bluetooth.device.action.BATTERY_LEVEL_CHANGED`),
(c) BLE Battery Service GATT (0x180F service / 0x2A19 characteristic),
returning null if none work (showing "Unavailable" in UI), updating the Home screen cards, and adding low-battery notification at a per-device threshold (default 20%).
