# EarbudKit - Development Handoff

## Project Overview
Android-first companion app for Bluetooth audio devices without official apps (e.g., Noise Buds Vector TWS earbuds, realme TechLife Studio H1 headphones). Standard Android/Bluetooth APIs only (no vendor protocols, no accounts, no analytics).

## Stage Checklist
- [x] Stage 1: Project setup (Expo TS SDK 58, expo-router 5 tabs, theme, folders, native module scaffold, prebuild)
- [x] Stage 2: Native module core (Kotlin) - getBondedAudioDevices & ACL connect/disconnect events
- [x] Stage 3: Multi-device store and Devices screen (Zustand + AsyncStorage, MAC keyed, nicknames, icons, active status)
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
  - `(tabs)/devices.tsx`: Devices screen displaying tracked devices, active device selection, nickname & icon editor modal, paired Bluetooth devices list, and target presets
  - `(tabs)/auto.tsx`: Auto-actions screen
  - `(tabs)/tools.tsx`: Tools screen
  - `(tabs)/settings.tsx`: Settings screen with theme selector & privacy note
- `src/`
  - `store/deviceStore.ts`: Multi-device Zustand store persisted to AsyncStorage (`@earbudkit/devices-storage`), keyed by MAC address, with actions for tracking, nicknames, icons ('earbuds' | 'headphones'), active device, and connection synchronization
  - `store/__tests__/deviceStore.test.ts`: Verification script confirming multi-device addition, updates, active selection, and persistence
  - `features/devices/useBluetoothDevices.ts`: Hook bridging native Bluetooth events into the Zustand store
  - `theme/`: Theme system (Material 3 inspired light/dark palette, typography, spacing, ThemeProvider)
- `modules/earbud-native/`: Local Expo native module
  - `android/src/main/java/expo/modules/earbudnative/EarbudNativeModule.kt`: Kotlin native module providing `getBondedAudioDevices()`, BroadcastReceiver for `ACTION_ACL_CONNECTED`/`DISCONNECTED`, profile proxies (A2DP & Headset), permissions helper, and Bluetooth settings launcher
  - `android/src/main/AndroidManifest.xml`: Android permissions for Bluetooth
  - `src/index.ts`: Typed JS interface and EventEmitter wrappers
- `android/`: Native Android project generated via `expo prebuild`

## Architecture Decisions
1. **MAC Address Keying**: All devices in `trackedDevices` are indexed by uppercase MAC address (e.g. `20:74:CF:89:12:01`).
2. **Persistent Store**: Zustand store persisted via `createJSONStorage(() => AsyncStorage)` under `@earbudkit/devices-storage`.
3. **Target Device Presets**: Built-in quick setup for "Noise Buds Vector" (earbuds) and "realme TechLife Studio H1" (headphones) for offline testing and fast onboarding.
4. **Active Device Management**: Single active target device with fallback to remaining devices if removed.

## Known Issues / Caveats
- Native APK compilation (`gradlew assembleDebug`) requires Android SDK installation on the host machine. Prebuild, TypeScript, and store verification pass with 0 errors.

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
Stage 4: Foreground service and Home screen
First action is to implement the foreground service (type connectedDevice) with persistent notification ("EarbudKit is watching your devices") so events arrive in the background and with the screen off, and build the Home screen showing status cards for each tracked device with connection badges, supporting multiple devices connected simultaneously.
