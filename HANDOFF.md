# EarbudKit - Development Handoff

## Project Overview
Android-first companion app for Bluetooth audio devices without official apps (e.g., Noise Buds Vector TWS earbuds, realme TechLife Studio H1 headphones). Standard Android/Bluetooth APIs only (no vendor protocols, no accounts, no analytics).

## Stage Checklist
- [x] Stage 1: Project setup (Expo TS SDK 58, expo-router 5 tabs, theme, folders, native module scaffold, prebuild)
- [ ] Stage 2: Native module core (Kotlin) - getBondedAudioDevices & ACL connect/disconnect events
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
  - `(tabs)/index.tsx`: Home screen placeholder
  - `(tabs)/devices.tsx`: Devices screen placeholder
  - `(tabs)/auto.tsx`: Auto-actions screen placeholder
  - `(tabs)/tools.tsx`: Tools screen placeholder
  - `(tabs)/settings.tsx`: Settings screen with theme selector & privacy note
- `src/`
  - `theme/`: Theme system (Material 3 inspired light/dark palette, typography, spacing, ThemeProvider)
  - `store/`: Zustand state management (deviceStore placeholder)
  - `features/`: Feature modules (home, devices, auto, tools, settings)
- `modules/earbud-native/`: Local Expo native module
  - `android/`: Kotlin implementation & build config
  - `src/index.ts`: TypeScript API definitions & JS fallback
  - `expo-module.config.json`: Expo module config
- `android/`: Generated native Android project via `expo prebuild`

## Architecture Decisions
1. **Expo + expo-router**: File-based tabs in `app/(tabs)/`.
2. **Local Native Module (`modules/earbud-native`)**: Written in Kotlin with Expo Modules API for Bluetooth Classic/BLE, audio settings, foreground service, and battery level reflection.
3. **M3 Theming**: Light/Dark modes adhering to Material 3 tokens, persisted with AsyncStorage.
4. **Permissions**: Declared in `app.json` (Android 12+ `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`, `POST_NOTIFICATIONS`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_CONNECTED_DEVICE`, `MODIFY_AUDIO_SETTINGS`).

## Known Issues / Caveats
- Android SDK is not installed in the local environment, so full `gradlew assembleDebug` requires installing Android SDK / setting `ANDROID_HOME` or running on a machine with Android SDK. `npx expo prebuild` and `npx tsc --noEmit` pass with zero errors.

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
Stage 2: Native module core (Kotlin)
First action is to implement `getBondedAudioDevices()` and register the BroadcastReceiver for `ACTION_ACL_CONNECTED` and `ACTION_ACL_DISCONNECTED` in `modules/earbud-native/android/src/main/java/expo/modules/earbudnative/EarbudNativeModule.kt`, handle Android 12+ `BLUETOOTH_CONNECT` permission checks, and export typed event emitters to JS.
