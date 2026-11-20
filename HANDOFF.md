# EarbudKit - Development Handoff

## Project Overview
Android-first companion app for Bluetooth audio devices without official apps (e.g., Noise Buds Vector TWS earbuds, realme TechLife Studio H1 headphones). Standard Android/Bluetooth APIs only (no vendor protocols, no accounts, no analytics).

## Stage Checklist
- [x] Stage 1: Project setup (Expo TS SDK 58, expo-router 5 tabs, theme, folders, native module scaffold, prebuild)
- [x] Stage 2: Native module core (Kotlin) - getBondedAudioDevices & ACL connect/disconnect events
- [ ] Stage 3: Multi-device store and Devices screen
- [ ] Stage 4: Foreground service and Home screen
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
  - `(tabs)/index.tsx`: Home screen
  - `(tabs)/devices.tsx`: Devices screen displaying bonded audio devices, connection status, permission prompts
  - `(tabs)/auto.tsx`: Auto-actions screen
  - `(tabs)/tools.tsx`: Tools screen
  - `(tabs)/settings.tsx`: Settings screen with theme selector & privacy note
- `src/`
  - `features/devices/useBluetoothDevices.ts`: Hook providing bonded devices, permissions request, live ACL event logging, and state sync
  - `theme/`: Theme system (Material 3 inspired light/dark palette, typography, spacing, ThemeProvider)
  - `store/`: Zustand state management (deviceStore placeholder)
  - `features/`: Feature modules
- `modules/earbud-native/`: Local Expo native module
  - `android/src/main/java/expo/modules/earbudnative/EarbudNativeModule.kt`: Kotlin native module providing `getBondedAudioDevices()`, BroadcastReceiver for `ACTION_ACL_CONNECTED`/`DISCONNECTED`, profile proxies (A2DP & Headset), permissions helper, and Bluetooth settings launcher
  - `android/src/main/AndroidManifest.xml`: Android permissions for Bluetooth
  - `src/index.ts`: Typed JS interface and EventEmitter wrappers
- `android/`: Native Android project generated via `expo prebuild`

## Architecture Decisions
1. **Bluetooth Audio Device Filtering**: Filters bonded devices by `BluetoothClass.Device.Major.AUDIO_VIDEO` and audio subclasses (headphones, headset, loudspeaker, portable audio, hifi, car audio).
2. **Dual-check Connection State**: Uses `BluetoothProfile` proxies (`A2DP`, `HEADSET`) as standard Android API check + reflection on `BluetoothDevice.isConnected` for instant fallback.
3. **ACL Events Receiver**: Listens for `ACTION_ACL_CONNECTED`, `ACTION_ACL_DISCONNECTED`, and `ACTION_STATE_CHANGED`, emitting typed events `onDeviceConnectionChanged` and `onBluetoothStateChanged` via Expo EventEmitter.
4. **Permissions Strategy**: Android 12+ (API 31+) requests `BLUETOOTH_CONNECT` and `BLUETOOTH_SCAN` via `PermissionsAndroid.requestMultiple`; Android <12 uses install-time permissions.

## Known Issues / Caveats
- Native APK compilation (`gradlew assembleDebug`) requires Android SDK installation on the host machine. Prebuild and TypeScript validation pass with 0 errors.

## Build and Run Commands
```bash
# Type check
npx tsc --noEmit

# Prebuild native code
npx expo prebuild

# Run on Android
npx expo run:android
```

## NEXT STEP
Stage 3: Multi-device store and Devices screen
First action is to implement the Zustand store in `src/store/deviceStore.ts` with AsyncStorage persistence, keyed by MAC address, supporting tracking/untracking devices, nicknames, icon selection (earbuds/headphones), active device selection, and integrate with the Devices screen.
