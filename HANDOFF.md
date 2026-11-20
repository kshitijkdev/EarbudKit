# EarbudKit - Development Handoff

## Project Overview
Android-first companion app for Bluetooth audio devices without official apps (specifically targeting Noise Buds Vector TWS earbuds and realme TechLife Studio H1 headphones, while supporting any generic Bluetooth audio device). Standard Android/Bluetooth APIs only (no vendor protocols, no accounts, no analytics).

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
- [x] Stage 11: Polish & verification (permission-denied states, empty states, privacy note, Android 8–15 compatibility, test suites, README refresh)

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
1. **Material 3 UI & Feedback**: Large touch targets, full dark/light theme switching, and contextual permissions throughout.
2. **Standard Android APIs Only**: No proprietary vendor protocols; all data stays on-device; 100% private.
3. **Graceful Fallbacks**: Missing Bluetooth/Location/Notification permissions show in-context explanation banners; unsupported features (e.g. Equalizer, Codec) show clear "Unavailable" indicators without crashing.
4. **Platform Boundary**: Clean "Not supported on iOS" empty states for all Bluetooth/Android-specific features.
5. **Android 8 to 15 Ready**: Handled API 26 through 35 differences (Android 12 Bluetooth runtime permissions, Android 13 notification runtime permissions, Android 14 `connectedDevice` foreground service type, and Android 14+ `PendingIntent` for Quick Settings tile).

## Build and Run Commands
```bash
# Type check (Passes with 0 errors)
npx tsc --noEmit

# Run all 6 unit test suites (Passes with 0 errors)
npx tsx src/store/__tests__/deviceStore.test.ts
npx tsx src/store/__tests__/autoStore.test.ts
npx tsx src/store/__tests__/findDevice.test.ts
npx tsx src/store/__tests__/sleepTimer.test.ts
npx tsx src/store/__tests__/equalizer.test.ts
npx tsx src/store/__tests__/stats.test.ts

# Export standalone offline JS bundle & drawables into Android project
npx expo export:embed --platform android --dev false --reset-cache --entry-file index.ts --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# Build and install on connected Android device / emulator via Gradle (x86_64 target for fast emulator compilation):
cd android
./gradlew app:installDebug -PreactNativeArchitectures=x86_64

# Start Metro development bundler (optional for live code updates):
npx expo start -c

# In Android Studio:
# 1. Open the project folder at `D:\android\EarbudKit\android`
# 2. Wait for Gradle Sync to complete (using bundled JDK/JBR 21+)
# 3. Select `app` in the run configuration dropdown and choose your emulator / connected device
# 4. Press ▶ (Run) or Shift+F10
```

## STATUS
All 11 Core Stages Complete! Ready for Sonic Neo-Glass Design Reskin.
- [x] Stage 1: Project setup
- [x] Stage 2: Native module core (Kotlin)
- [x] Stage 3: Multi-device store and Devices screen
- [x] Stage 4: Foreground service and Home screen
- [x] Stage 5: Battery monitoring
- [x] Stage 6: Auto-actions
- [x] Stage 7: Find my device
- [x] Stage 8: Sleep timer
- [x] Stage 9: Equalizer (best effort)
- [x] Stage 10: Extras and codec
- [x] Stage 11: Polish & verification

## Design Reskin (Sonic Neo-Glass) Checklist
- [x] Stage D1: Design system foundation (theme tokens, fonts, reusable UI components: GlassCard, PillButton, StatusChip, Toggle, NeonSlider, BatteryRing, SectionHeader, FloatingPillNav)
- [x] Stage D2: Navigation shell and Home
- [x] Stage D3: Devices
- [ ] Stage D4: Auto-actions
- [ ] Stage D5: Tools
- [ ] Stage D6: Settings and Stats
- [ ] Stage D7: Light theme, polish, verify

## Design Reskin Decisions & File Map (D1, D2 & D3)
- `src/theme/theme.ts`: Fully updated with Sonic Neo-Glass tokens for dark mode (Base Void `#0B0B10`, Electric Violet `#7C5CFF`, Hot Pink `#FF4FD8`, Lime Neon `#C6FF3D`, glass opacities) and light mode (`#FCF8FF`, `#5E39E0`, `#AF0093`, `#006947`). Space Grotesk / Inter typography scale and 24px bento / 9999px pill radii.
- `android/app/src/main/assets/fonts/`: Stored native offline font assets for Space Grotesk and Inter for zero-latency standalone offline rendering.
- `src/components/ui/`:
  - `GlassCard.tsx`: Glassmorphic container with 24px radius, 1px border, translucent fill, and optional electric violet glow.
  - `PillButton.tsx`: Full pill morphology (9999px radius) with 48px touch targets, 4 variants (primary violet, secondary glass, ghost lime, danger red).
  - `StatusChip.tsx`: Compact metadata chip with pulsing colored micro-dot.
  - `Toggle.tsx`: Chunky 50×28 pill with animated sliding circular thumb, floods with Lime Neon when ON.
  - `NeonSlider.tsx`: 4px track, violet-to-pink gradient fill, white thumb with lime rim, and direct stepper buttons.
  - `BatteryRing.tsx`: SVG ring with percentage readout, Lime (>20%) / Error (<=20%), friendly "Unavailable" fallback state.
  - `SectionHeader.tsx`: Space Grotesk headline, Inter body, and action button support.
  - `FloatingPillNav.tsx`: Elevated dock with 5 tabs, active violet glow and hot pink micro-dot.
- `app/(tabs)/_layout.tsx`: Replaced tab bar with `FloatingPillNav` docked cleanly above safe area across 5 tabs (Home, Devices, Auto, Tools, Settings) with React Navigation 7 `navigateToTab` / `navigation.navigate` compatibility.
- `app/(tabs)/index.tsx`: Completely rebuilt Home with Sonic Neo-Glass design:
  - Header with title and real-time Background Watcher toggle chip (`WATCHER: ON/OFF`).
  - Hero Bento Card for connected device with dynamic silhouette visualizer, daily driver tag, Connected `StatusChip`, Codec pill, battery telemetry ring with `BatteryRing`, and active audio stream info.
  - Horizontal Registered Fleet carousel for tracked devices with live battery badges and real relative timestamp ("Seen Xm ago" / "Standby"), plus "+ Add Kit" launcher.
  - Daily Session Load card bound to `statsStore` today listening time, animated 7-bar waveform visualizer, and navigation link to `/stats`.
  - Diagnostics bento row: Bluetooth status chip and Fleet count (`<N> kits`, `<active> Active • <offline> Standby`).
  - Rapid command quick launcher chips: Sleep Timer, Find Device, Equalizer, Auto Actions.
- `app/(tabs)/devices.tsx`: Rebuilt Devices screen to match Sonic Neo-Glass mockup:
  - Header row with "Tracked Devices", live saved count badge, and pulsing "RADIO ACTIVE" / "RADIO OFF" `StatusChip`.
  - Friendly permission banners (nearby Bluetooth and disabled Bluetooth) with gradient `PillButton` triggers (no red-on-red).
  - Background Access Active telemetry glass banner.
  - Wallet-style tracked device cards with active target violet glow, device avatar, nickname, MAC, connection status dot, live battery bar (or friendly driver restriction fallback), alert threshold pill, codec tag, and Set Active / Edit / Remove actions.
  - "Pair New Bluetooth Device" interactive Bento tile with radar ripple indicator, "+ Scan Paired Devices" loader, and system BT settings shortcut.
  - Discovered paired Bluetooth devices list with 1-tap "+ Track" `PillButton`s.
  - Target device quick-add sticker chips (Noise Buds Vector, realme Studio H1, Generic BLE).
  - Restyled glass modal for device editing (nickname input, earbuds vs over-ear icon selector, 10-30% battery threshold pills, test notification trigger, cancel & save buttons).

## NEXT STEP: Stage D4, first action is restyling the Auto-actions screen (`app/(tabs)/auto.tsx`) to match `designstich/Dark_theme/` with device pill selector, On-Connect & On-Disconnect glass cards, app launcher tile grid with violet glow, volume slider/stepper, DND toggles, and ghost test buttons.
