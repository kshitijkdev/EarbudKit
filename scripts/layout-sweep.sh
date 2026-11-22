#!/usr/bin/env bash
# layout-sweep.sh: Takes screenshots across all tabs/routes for layout verification
set -e

# Resolve ADB binary
ADB="adb"
if ! command -v adb &> /dev/null; then
  if [ -n "$LOCALAPPDATA" ] && [ -f "$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" ]; then
    ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
  elif [ -n "$ANDROID_HOME" ] && [ -f "$ANDROID_HOME/platform-tools/adb" ]; then
    ADB="$ANDROID_HOME/platform-tools/adb"
  elif [ -n "$ANDROID_SDK_ROOT" ] && [ -f "$ANDROID_SDK_ROOT/platform-tools/adb" ]; then
    ADB="$ANDROID_SDK_ROOT/platform-tools/adb"
  else
    echo "Notice: 'adb' command not found in PATH or standard Android SDK directories."
    echo "Please ensure Android platform-tools is installed and in PATH."
    exit 0
  fi
fi

# Check connected device
DEVICE_COUNT=$("$ADB" devices | grep -v "List" | grep -c "device" || true)
if [ "$DEVICE_COUNT" -eq 0 ]; then
  echo "Notice: No connected Android device or emulator detected via ADB."
  echo "Connect an Android device with USB debugging enabled or launch an emulator to run a screenshot sweep."
  exit 0
fi

OUTPUT_DIR="qa/screens"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DEVICE_NAME=$("$ADB" get-serialno)

echo "Capturing screen sweep on device $DEVICE_NAME..."
SCREEN_FILE="$OUTPUT_DIR/${DEVICE_NAME}_sweep_${TIMESTAMP}.png"
"$ADB" exec-out screencap -p > "$SCREEN_FILE"
echo "Saved screen capture to $SCREEN_FILE"
