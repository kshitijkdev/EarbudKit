# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Expo Modules and EarbudNative
-keep class expo.modules.earbudnative.** { *; }
-keepclassmembers class expo.modules.earbudnative.** { *; }
-keep class expo.modules.kotlin.** { *; }
-keepclassmembers class expo.modules.kotlin.** { *; }

# Keep Bluetooth reflection targets and methods so R8 does not strip them
-keepclassmembers class android.bluetooth.BluetoothDevice {
    public int getBatteryLevel();
    public boolean isConnected();
}

-keepclassmembers class android.bluetooth.BluetoothA2dp {
    public *;
}

-dontwarn android.bluetooth.BluetoothCodecStatus
-keep class android.bluetooth.BluetoothCodecStatus { *; }
-keepclassmembers class android.bluetooth.BluetoothCodecStatus { *; }

-dontwarn android.bluetooth.BluetoothCodecConfig
-keep class android.bluetooth.BluetoothCodecConfig { *; }
-keepclassmembers class android.bluetooth.BluetoothCodecConfig { *; }

# AudioFx Hardware Equalizer
-keep class android.media.audiofx.Equalizer { *; }
-keepclassmembers class android.media.audiofx.Equalizer { *; }

