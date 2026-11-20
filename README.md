# EarbudKit

Android-first companion app for Bluetooth audio devices that have no official app.

## Supported Devices (Initial)
- **Noise Buds Vector** – TWS earbuds, BT 5.3, LDAC
- **realme TechLife Studio H1** – Over-ear headphones, ANC, 70 h battery

Works with any Bluetooth audio device. Cannot control vendor-specific features (ANC, gestures, firmware).

## Features
- 🎧 Multi-device tracking with connection status
- 🔋 Battery level monitoring
- ⚡ Auto-actions on connect/disconnect (launch apps, set volume)
- 📍 Find My Device with last-known location
- ⏰ Sleep timer with volume fade
- 🎵 System equalizer (best-effort)
- 🎨 Material 3 light/dark themes

## Stack
- Expo SDK 58 + React Native + TypeScript
- expo-router (file-based routing)
- Local Expo native module in Kotlin (`modules/earbud-native`)
- Zustand + AsyncStorage for state
- Android-first, iOS shows "Not supported" for Bluetooth features

## Project Structure
```
app/                    # expo-router routes
  (tabs)/               # Tab navigator
    index.tsx           # Home
    devices.tsx         # Devices
    auto.tsx            # Auto-Actions
    tools.tsx           # Tools
    settings.tsx        # Settings
src/
  features/             # Feature modules
    home/
    devices/
    auto/
    tools/
    settings/
  store/                # Zustand stores
  theme/                # Material 3 theme system
  components/           # Shared components
modules/
  earbud-native/        # Kotlin native module
```

## Build & Run

### Prerequisites
- Node.js 22+
- Android SDK (API 26–35)
- JDK 17
- An Android device or emulator

### Development
```bash
# Install dependencies
npm install

# Generate native projects
npx expo prebuild

# Run on Android
npx expo run:android

# Type check
npx tsc --noEmit
```

## Privacy
All data stays on-device. No backend, no accounts, no analytics.

## License
MIT
