import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import {
  useDeviceStore,
  TrackedDevice,
  DeviceLocation,
  useSleepTimerStore,
  useEqualizerStore,
  EqPresetName,
  DEFAULT_DEVICE_EQ,
} from '../../src/store';
import {
  startRssiScan,
  stopRssiScan,
  addRssiListener,
  isRssiScanning,
} from '../../modules/earbud-native';
import {
  captureCurrentLocation,
  openGoogleMapsNavigation,
  requestLocationPermissions,
} from '../../src/services/location';
import { FeedbackToast } from '../../src/components/FeedbackToast';

// -------------------------------------------------------------
// Memoized Sleep Timer Section (avoids re-rendering the whole page every 1s)
// -------------------------------------------------------------
interface SleepTimerCardProps {
  colors: any;
  borderRadius: any;
  onToast: (msg: string) => void;
}

const SleepTimerCard = memo(function SleepTimerCard({
  colors,
  borderRadius,
  onToast,
}: SleepTimerCardProps) {
  const isTimerActive = useSleepTimerStore((s) => s.isActive);
  const remainingSeconds = useSleepTimerStore((s) => s.remainingSeconds);
  const isFading = useSleepTimerStore((s) => s.isFading);
  const selectedPreset = useSleepTimerStore((s) => s.selectedPreset);
  const startTimer = useSleepTimerStore((s) => s.startTimer);
  const startQuickTestTimer = useSleepTimerStore((s) => s.startQuickTestTimer);
  const cancelTimer = useSleepTimerStore((s) => s.cancelTimer);
  const [customMinutes, setCustomMinutes] = useState(25);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartPreset = (mins: number) => {
    startTimer(mins);
    onToast(`✓ Sleep timer started for ${mins} minutes`);
  };

  const handleStartCustom = () => {
    startTimer(customMinutes);
    onToast(`✓ Sleep timer started for ${customMinutes} minutes`);
  };

  const handleQuickTest = () => {
    startQuickTestTimer(15);
    onToast('⚡ 15s fade test started');
  };

  const handleCancel = () => {
    cancelTimer();
    onToast('Sleep timer cancelled');
  };

  return (
    <View
      style={[
        styles.toolCard,
        {
          backgroundColor: colors.surfaceContainer,
          borderRadius: borderRadius.xl,
          borderColor: isTimerActive ? colors.primary : colors.outlineVariant,
          borderWidth: isTimerActive ? 2 : 1,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.cardEmoji}>⏰</Text>
          <View>
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
              Sleep Timer
            </Text>
            <Text style={[styles.cardDesc, { color: colors.onSurfaceVariant }]}>
              Fades volume down over 10s, then pauses playback
            </Text>
          </View>
        </View>
        {isTimerActive && (
          <View
            style={[
              styles.activeTimerPill,
              {
                backgroundColor: isFading
                  ? colors.errorContainer
                  : colors.primaryContainer,
              },
            ]}
          >
            <Text
              style={[
                styles.activeTimerPillText,
                {
                  color: isFading
                    ? colors.onError
                    : colors.onPrimaryContainer,
                },
              ]}
            >
              {isFading ? 'FADING OUT' : 'RUNNING'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.timerBody}>
        {isTimerActive ? (
          <View style={styles.countdownContainer}>
            <Text
              style={[
                styles.countdownDisplay,
                {
                  color: isFading ? colors.error : colors.onSurface,
                },
              ]}
            >
              {formatSeconds(remainingSeconds)}
            </Text>
            <Text
              style={[
                styles.countdownSubtext,
                {
                  color: isFading ? colors.error : colors.onSurfaceVariant,
                },
              ]}
            >
              {isFading
                ? '🔉 Fading out volume over 10 seconds...'
                : 'Media playing • Will fade out & pause automatically'}
            </Text>

            <TouchableOpacity
              style={[
                styles.cancelTimerBtn,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: borderRadius.md,
                },
              ]}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.cancelTimerText,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                ✕ Cancel Sleep Timer
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.inputHeading, { color: colors.onSurface }]}>
              Select Duration:
            </Text>
            <View style={styles.presetsGrid}>
              {[15, 30, 45, 60].map((mins) => {
                const isPicked = selectedPreset === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isPicked
                          ? colors.primaryContainer
                          : colors.surface,
                        borderColor: isPicked
                          ? colors.primary
                          : colors.outlineVariant,
                        borderWidth: isPicked ? 2 : 1,
                        borderRadius: borderRadius.md,
                      },
                    ]}
                    onPress={() => handleStartPreset(mins)}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        {
                          color: isPicked
                            ? colors.onPrimaryContainer
                            : colors.onSurface,
                          fontWeight: isPicked ? '700' : '600',
                        },
                      ]}
                    >
                      {isPicked ? '✓ ' : ''}{mins}m
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Minutes Stepper */}
            <View style={styles.customRow}>
              <Text
                style={[
                  styles.customLabel,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                Custom: {customMinutes} min
              </Text>
              <View style={styles.stepperGroup}>
                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.outlineVariant,
                      borderRadius: borderRadius.sm,
                    },
                  ]}
                  onPress={() => setCustomMinutes((p) => Math.max(5, p - 5))}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.stepperText, { color: colors.onSurface }]}>-5m</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.outlineVariant,
                      borderRadius: borderRadius.sm,
                    },
                  ]}
                  onPress={() => setCustomMinutes((p) => p + 5)}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.stepperText, { color: colors.onSurface }]}>+5m</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.startCustomBtn,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: borderRadius.sm,
                    },
                  ]}
                  onPress={handleStartCustom}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.startCustomText, { color: colors.onPrimary }]}>
                    Start ({customMinutes}m)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 15s Test Preset */}
            <TouchableOpacity
              style={[
                styles.quickTestTimerBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.outlineVariant,
                  borderRadius: borderRadius.sm,
                },
              ]}
              onPress={handleQuickTest}
              activeOpacity={0.7}
            >
              <Text style={[styles.quickTestTimerText, { color: colors.primary }]}>
                ⚡ Test Fade Out & Pause (15-second timer)
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
});

// -------------------------------------------------------------
// Memoized Equalizer Card (reactively bound to configs)
// -------------------------------------------------------------
interface EqualizerCardProps {
  colors: any;
  borderRadius: any;
  selectedAddress: string | null;
  selectedNickname: string;
  onToast: (msg: string) => void;
}

const EqualizerCard = memo(function EqualizerCard({
  colors,
  borderRadius,
  selectedAddress,
  selectedNickname,
  onToast,
}: EqualizerCardProps) {
  const configs = useEqualizerStore((s) => s.configs);
  const isEqSupported = useEqualizerStore((s) => s.isSupported);
  const bandFrequencies = useEqualizerStore((s) => s.bandFrequencies);
  const setDeviceEqEnabled = useEqualizerStore((s) => s.setDeviceEqEnabled);
  const setDevicePreset = useEqualizerStore((s) => s.setDevicePreset);
  const setDeviceBandLevel = useEqualizerStore((s) => s.setDeviceBandLevel);
  const getDeviceConfig = useEqualizerStore((s) => s.getDeviceConfig);

  const upperAddr = selectedAddress ? selectedAddress.toUpperCase() : '';
  const eqConfig = upperAddr && configs[upperAddr]
    ? configs[upperAddr]
    : (upperAddr ? getDeviceConfig(upperAddr) : DEFAULT_DEVICE_EQ);

  const handleToggle = (val: boolean) => {
    if (!upperAddr) return;
    setDeviceEqEnabled(upperAddr, val);
    onToast(val ? '✓ Equalizer Turned ON' : 'Equalizer Turned OFF');
  };

  const handlePreset = (preset: EqPresetName) => {
    if (!upperAddr) return;
    setDevicePreset(upperAddr, preset);
    onToast(`✓ Equalizer Preset: ${preset}`);
  };

  const handleBandLevel = (bandIdx: number, newLevel: number, freqLabel: string) => {
    if (!upperAddr) return;
    setDeviceBandLevel(upperAddr, bandIdx, newLevel);
    const db = (newLevel / 100).toFixed(1);
    onToast(`✓ ${freqLabel}: ${newLevel > 0 ? '+' : ''}${db} dB`);
  };

  return (
    <View
      style={[
        styles.toolCard,
        {
          backgroundColor: colors.surfaceContainer,
          borderColor: eqConfig.enabled ? colors.primary : colors.outlineVariant,
          borderWidth: eqConfig.enabled ? 2 : 1,
          borderRadius: borderRadius.xl,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.cardEmoji}>🎚️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
              Equalizer (AudioFX)
            </Text>
            <Text style={[styles.cardDesc, { color: colors.onSurfaceVariant }]}>
              {selectedNickname} hardware EQ profile
            </Text>
          </View>
        </View>

        {isEqSupported && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: borderRadius.full,
                backgroundColor: eqConfig.enabled ? '#10b981' : colors.surfaceVariant,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: eqConfig.enabled ? '#ffffff' : colors.onSurfaceVariant,
                }}
              >
                {eqConfig.enabled ? 'ON' : 'OFF'}
              </Text>
            </View>
            <Switch
              value={eqConfig.enabled}
              onValueChange={handleToggle}
              thumbColor={eqConfig.enabled ? colors.primary : colors.surfaceVariant}
              trackColor={{
                false: colors.surfaceVariant,
                true: colors.primaryContainer,
              }}
            />
          </View>
        )}
      </View>

      <View style={styles.eqBody}>
        {!isEqSupported ? (
          <View
            style={[
              styles.eqUnavailableBanner,
              {
                backgroundColor: colors.surfaceVariant,
                borderRadius: borderRadius.sm,
              },
            ]}
          >
            <Text style={styles.eqUnavailableIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eqUnavailableTitle, { color: colors.onSurface }]}>
                EQ unavailable on this device
              </Text>
              <Text style={[styles.eqUnavailableBody, { color: colors.onSurfaceVariant }]}>
                Hardware Android AudioFX Equalizer engine is not supported on this device/session. Standard audio playback is unaffected.
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ opacity: eqConfig.enabled ? 1 : 0.45 }}>
            {/* Presets Row */}
            <Text style={[styles.inputHeading, { color: colors.onSurface }]}>
              Presets
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsRow}
            >
              {(['Flat', 'Bass Boost', 'Vocal', 'Treble', 'Custom'] as EqPresetName[]).map((preset) => {
                const isSelected = eqConfig.preset === preset;
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.eqPresetChip,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.surface,
                        borderColor: isSelected
                          ? colors.primary
                          : colors.outlineVariant,
                        borderWidth: isSelected ? 2 : 1,
                        borderRadius: borderRadius.full,
                      },
                    ]}
                    disabled={!eqConfig.enabled}
                    onPress={() => handlePreset(preset)}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.eqPresetText,
                        {
                          color: isSelected
                            ? colors.onPrimary
                            : colors.onSurface,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {isSelected ? '✓ ' : ''}{preset}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 5-Band Sliders / Steppers */}
            <Text
              style={[
                styles.inputHeading,
                { color: colors.onSurface, marginTop: 16 },
              ]}
            >
              Frequency Bands
            </Text>

            {bandFrequencies.map((freq, idx) => {
              const levelMB = eqConfig.bandLevels[idx] ?? 0;
              const levelDB = (levelMB / 100).toFixed(1);
              const formattedFreq =
                freq >= 1000 ? `${(freq / 1000).toFixed(1)} kHz` : `${freq} Hz`;

              return (
                <View key={idx} style={styles.eqBandRow}>
                  <View style={styles.eqBandLabelCol}>
                    <Text style={[styles.eqBandFreqText, { color: colors.onSurface }]}>
                      {formattedFreq}
                    </Text>
                    <Text
                      style={[
                        styles.eqBandDbText,
                        {
                          color:
                            levelMB > 0
                              ? colors.primary
                              : levelMB < 0
                              ? colors.error
                              : colors.onSurfaceVariant,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {levelMB > 0 ? `+${levelDB}` : levelDB} dB
                    </Text>
                  </View>

                  <View style={styles.eqBandControls}>
                    <TouchableOpacity
                      style={[
                        styles.eqStepBtn,
                        {
                          backgroundColor: colors.surfaceVariant,
                          borderRadius: borderRadius.sm,
                        },
                      ]}
                      disabled={!eqConfig.enabled || levelMB <= -1500}
                      onPress={() => handleBandLevel(idx, levelMB - 100, formattedFreq)}
                      activeOpacity={0.6}
                    >
                      <Text style={[styles.eqStepBtnText, { color: colors.onSurface }]}>
                        -
                      </Text>
                    </TouchableOpacity>

                    {/* Visual level track */}
                    <View
                      style={[
                        styles.eqLevelTrack,
                        { backgroundColor: colors.surfaceVariant },
                      ]}
                    >
                      <View
                        style={[
                          styles.eqZeroIndicator,
                          { backgroundColor: colors.outlineVariant },
                        ]}
                      />
                      <View
                        style={[
                          styles.eqLevelFill,
                          {
                            backgroundColor:
                              levelMB >= 0 ? colors.primary : colors.error,
                            left: levelMB >= 0 ? '50%' : undefined,
                            right:
                              levelMB < 0
                                ? `${50 - (Math.abs(levelMB) / 3000) * 100}%`
                                : undefined,
                            width: `${(Math.abs(levelMB) / 3000) * 100}%`,
                          },
                        ]}
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.eqStepBtn,
                        {
                          backgroundColor: colors.surfaceVariant,
                          borderRadius: borderRadius.sm,
                        },
                      ]}
                      disabled={!eqConfig.enabled || levelMB >= 1500}
                      onPress={() => handleBandLevel(idx, levelMB + 100, formattedFreq)}
                      activeOpacity={0.6}
                    >
                      <Text style={[styles.eqStepBtnText, { color: colors.onSurface }]}>
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
});

// -------------------------------------------------------------
// Main Tools Screen
// -------------------------------------------------------------
export default function ToolsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { colors, borderRadius } = theme;

  const trackedDevicesMap = useDeviceStore((s) => s.trackedDevices);
  const activeDeviceAddress = useDeviceStore((s) => s.activeDeviceAddress);
  const trackedDevices = Object.values(trackedDevicesMap);

  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [currentRssi, setCurrentRssi] = useState<number | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  // Ensure valid selected address
  useEffect(() => {
    if (trackedDevices.length > 0) {
      if (!selectedAddress || !trackedDevicesMap[selectedAddress]) {
        setSelectedAddress(activeDeviceAddress || trackedDevices[0].address);
      }
    } else {
      setSelectedAddress(null);
    }
  }, [trackedDevices, selectedAddress, activeDeviceAddress, trackedDevicesMap]);

  const selectedDevice: TrackedDevice | undefined = selectedAddress
    ? trackedDevicesMap[selectedAddress]
    : undefined;

  const setDeviceLocation = useDeviceStore((s) => s.setDeviceLocation);
  const setDisconnectAlert = useDeviceStore((s) => s.setDisconnectAlert);
  const triggerTestDisconnectAlert = useDeviceStore((s) => s.triggerTestDisconnectAlert);

  // Equalizer Support Init
  const hasCheckedEq = useEqualizerStore((s) => s.hasCheckedSupport);
  const checkEqSupport = useEqualizerStore((s) => s.checkEqualizerSupport);

  useEffect(() => {
    if (!hasCheckedEq) {
      checkEqSupport();
    }
  }, [hasCheckedEq, checkEqSupport]);

  // Throttled RSSI scanner listener (max 1 update per 250ms to eliminate UI stutter)
  const lastRssiRef = useRef<number>(0);
  useEffect(() => {
    const rssiSub = addRssiListener((event) => {
      const now = Date.now();
      if (now - lastRssiRef.current < 250) return;
      lastRssiRef.current = now;

      if (
        selectedAddress &&
        event.address.toLowerCase() === selectedAddress.toLowerCase()
      ) {
        setCurrentRssi(event.rssi);
      }
    });

    return () => {
      rssiSub.remove();
      if (isRssiScanning()) {
        stopRssiScan();
      }
    };
  }, [selectedAddress]);

  const handleToggleRssiScan = () => {
    if (Platform.OS !== 'android' || !selectedAddress) return;

    if (isScanning) {
      stopRssiScan();
      setIsScanning(false);
      setCurrentRssi(null);
      showToast('Proximity scan stopped');
    } else {
      const started = startRssiScan(selectedAddress);
      setIsScanning(started);
      if (started) {
        showToast(`🔍 Searching for ${selectedDevice?.nickname || 'device'}...`);
      } else {
        Alert.alert(
          'Scan Notice',
          'Ensure Bluetooth and Location permissions are enabled on your device to search nearby.'
        );
      }
    }
  };

  const handleManualCaptureLocation = async () => {
    if (!selectedAddress) return;
    setIsCapturingLocation(true);
    try {
      const hasPerm = await requestLocationPermissions();
      if (!hasPerm) {
        Alert.alert(
          'Location Permission Needed',
          'EarbudKit needs location access to save where your audio device was last seen.'
        );
        return;
      }

      const loc = await captureCurrentLocation();
      if (loc) {
        setDeviceLocation(selectedAddress, loc);
        showToast('✓ Current location saved as last-seen point!');
      } else {
        const demoLoc: DeviceLocation = {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 5,
          timestamp: Date.now(),
          addressText: 'Market St & 4th, San Francisco, CA',
        };
        setDeviceLocation(selectedAddress, demoLoc);
        showToast('✓ Simulated location saved for testing!');
      }
    } finally {
      setIsCapturingLocation(false);
    }
  };

  const handleNavigate = () => {
    if (!selectedDevice?.lastLocation) return;
    const { latitude, longitude } = selectedDevice.lastLocation;
    showToast('🧭 Launching Google Maps...');
    openGoogleMapsNavigation(latitude, longitude);
  };

  const handleTestDisconnectAlert = async () => {
    if (!selectedAddress) return;
    const sent = await triggerTestDisconnectAlert(selectedAddress);
    if (sent) {
      showToast('✓ Test disconnect notification delivered!');
    }
  };

  const calculateProximity = (rssi: number | null) => {
    if (rssi === null) return { percent: 0, label: 'Scanning for signal...', color: colors.outline };
    const clamped = Math.min(Math.max(rssi, -100), -40);
    const percent = Math.round(((clamped - -100) / (-40 - -100)) * 100);

    if (rssi >= -55) {
      return { percent, label: '🔥 Hot! Right next to you', color: colors.error };
    } else if (rssi >= -70) {
      return { percent, label: '♨️ Very Warm! In the same room', color: '#f97316' };
    } else if (rssi >= -85) {
      return { percent, label: '🌤️ Getting Warmer...', color: colors.primary };
    } else {
      return { percent, label: '❄️ Cold (Weak signal)', color: colors.onSurfaceVariant };
    }
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
          <Text style={styles.largeEmoji}>🍎</Text>
          <Text style={[styles.title, { color: colors.onSurface }]}>iOS Not Supported</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Tools (Find My Device, BLE Radar, Sleep Timer volume fade, and AudioFX Equalizer) require Android system APIs.
          </Text>
        </View>
      </View>
    );
  }

  if (trackedDevices.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
          <Text style={styles.largeEmoji}>🔧</Text>
          <Text style={[styles.title, { color: colors.onSurface }]}>No Devices Tracked</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Add a device to configure last-seen location, sleep timer volume fade, and hardware equalizer profiles.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.sm }]}
            onPress={() => router.push('/devices')}
            activeOpacity={0.7}
          >
            <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
              Go to Devices Screen
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const proximity = calculateProximity(currentRssi);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Universal Instant Feedback Toast */}
      <FeedbackToast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      {/* Device Selector Pill Bar */}
      <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
        Select Device:
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.devicePillsRow}
      >
        {trackedDevices.map((dev) => {
          const isSelected = dev.address === selectedAddress;
          return (
            <TouchableOpacity
              key={dev.address}
              style={[
                styles.devicePill,
                {
                  backgroundColor: isSelected
                    ? colors.primaryContainer
                    : colors.surfaceContainer,
                  borderColor: isSelected ? colors.primary : colors.outlineVariant,
                  borderWidth: isSelected ? 2 : 1,
                  borderRadius: borderRadius.full,
                },
              ]}
              onPress={() => {
                setSelectedAddress(dev.address);
                showToast(`✓ Selected: ${dev.nickname}`);
              }}
              activeOpacity={0.6}
            >
              <Text style={styles.pillEmoji}>
                {dev.icon === 'earbuds' ? '🎧' : '🎧'}
              </Text>
              <Text
                style={[
                  styles.pillText,
                  {
                    color: isSelected
                      ? colors.onPrimaryContainer
                      : colors.onSurface,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {isSelected ? '✓ ' : ''}{dev.nickname}
              </Text>
              {dev.isConnected && (
                <View
                  style={[
                    styles.onlineDot,
                    { backgroundColor: colors.primary },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedDevice && (
        <>
          {/* CARD 1: LAST KNOWN LOCATION & MAP */}
          <View
            style={[
              styles.toolCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderRadius: borderRadius.xl,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.cardEmoji}>📍</Text>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                    Last Known Location
                  </Text>
                  <Text style={[styles.cardDesc, { color: colors.onSurfaceVariant }]}>
                    Saved automatically whenever device disconnects
                  </Text>
                </View>
              </View>
            </View>

            {selectedDevice.lastLocation ? (
              <View style={styles.locationBody}>
                <View
                  style={[
                    styles.mapMockCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.outlineVariant,
                      borderRadius: borderRadius.lg,
                    },
                  ]}
                >
                  <View style={styles.mapPinRow}>
                    <Text style={styles.bigPinEmoji}>📌</Text>
                    <View style={styles.mapPinDetails}>
                      <Text
                        style={[
                          styles.locationAddressText,
                          { color: colors.onSurface },
                        ]}
                      >
                        {selectedDevice.lastLocation.addressText || 'Coordinates Recorded'}
                      </Text>
                      <Text
                        style={[
                          styles.locationCoordsText,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {selectedDevice.lastLocation.latitude.toFixed(6)}° N,{' '}
                        {selectedDevice.lastLocation.longitude.toFixed(6)}° E
                      </Text>
                      <Text
                        style={[
                          styles.locationAccuracyText,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        Accuracy: ±{Math.round(selectedDevice.lastLocation.accuracy ?? 10)}m •{' '}
                        {new Date(selectedDevice.lastLocation.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.navigateBtn,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                  onPress={handleNavigate}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.navigateBtnText, { color: colors.onPrimary }]}>
                    🧭 Navigate in Google Maps
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.outlineVariant,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                  onPress={handleManualCaptureLocation}
                  disabled={isCapturingLocation}
                  activeOpacity={0.7}
                >
                  {isCapturingLocation ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[styles.secondaryBtnText, { color: colors.onSurface }]}>
                      📍 Update Location Now
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noLocationContainer}>
                <Text style={styles.dimEmoji}>🗺️</Text>
                <Text style={[styles.noLocationTitle, { color: colors.onSurface }]}>
                  No Location Saved Yet
                </Text>
                <Text style={[styles.noLocationDesc, { color: colors.onSurfaceVariant }]}>
                  Disconnect coordinates will be captured when your device disconnects. You can also save your current location now.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: borderRadius.sm,
                      marginTop: 10,
                    },
                  ]}
                  onPress={handleManualCaptureLocation}
                  disabled={isCapturingLocation}
                  activeOpacity={0.7}
                >
                  {isCapturingLocation ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
                      📍 Record Current Location
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* CARD 2: "GETTING WARMER" BLE RSSI RADAR METER */}
          <View
            style={[
              styles.toolCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderRadius: borderRadius.xl,
                borderColor: isScanning ? colors.primary : colors.outlineVariant,
                borderWidth: isScanning ? 2 : 1,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.cardEmoji}>📡</Text>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                    Proximity Radar
                  </Text>
                  <Text style={[styles.cardDesc, { color: colors.onSurfaceVariant }]}>
                    BLE RSSI "getting warmer" meter to find nearby lost earbuds
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.radarBody}>
              <View style={styles.radarHeaderRow}>
                <Text style={[styles.proximityCategory, { color: proximity.color }]}>
                  {proximity.label}
                </Text>
                <Text style={[styles.rssiValueText, { color: colors.onSurfaceVariant }]}>
                  {currentRssi !== null ? `${currentRssi} dBm` : '-- dBm'}
                </Text>
              </View>

              <View
                style={[
                  styles.meterTrack,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <View
                  style={[
                    styles.meterFill,
                    {
                      width: `${proximity.percent}%`,
                      backgroundColor: proximity.color,
                      borderRadius: borderRadius.full,
                    },
                  ]}
                />
              </View>

              <Text style={[styles.meterHint, { color: colors.onSurfaceVariant }]}>
                Walk around the room slowly while scanning. As the meter fills and turns red, you are getting closer!
              </Text>

              <TouchableOpacity
                style={[
                  styles.scanBtn,
                  {
                    backgroundColor: isScanning
                      ? colors.error
                      : colors.primary,
                    borderRadius: borderRadius.md,
                  },
                ]}
                onPress={handleToggleRssiScan}
                activeOpacity={0.7}
              >
                <Text style={[styles.scanBtnText, { color: '#ffffff' }]}>
                  {isScanning
                    ? '⏹ Stop Proximity Search'
                    : '🔍 Start Proximity Search'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* CARD 3: DISCONNECT DROP ALERT */}
          <View
            style={[
              styles.toolCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderRadius: borderRadius.xl,
                borderColor: selectedDevice.disconnectAlertEnabled ? colors.primary : colors.outlineVariant,
                borderWidth: selectedDevice.disconnectAlertEnabled ? 2 : 1,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.cardEmoji}>🔔</Text>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                    Disconnect Alert
                  </Text>
                  <Text style={[styles.cardDesc, { color: colors.onSurfaceVariant }]}>
                    Notify immediately if audio drops while phone is in active use
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: borderRadius.full,
                    backgroundColor: selectedDevice.disconnectAlertEnabled ? '#10b981' : colors.surfaceVariant,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: selectedDevice.disconnectAlertEnabled ? '#ffffff' : colors.onSurfaceVariant,
                    }}
                  >
                    {selectedDevice.disconnectAlertEnabled ? 'ON' : 'OFF'}
                  </Text>
                </View>
                <Switch
                  value={selectedDevice.disconnectAlertEnabled}
                  onValueChange={(val) => {
                    if (selectedAddress) {
                      setDisconnectAlert(selectedAddress, val);
                      showToast(val ? '✓ Disconnect Drop Alert Enabled' : 'Disconnect Drop Alert Disabled');
                    }
                  }}
                  thumbColor={selectedDevice.disconnectAlertEnabled ? colors.primary : colors.outline}
                  trackColor={{
                    false: colors.surfaceVariant,
                    true: colors.primaryContainer,
                  }}
                />
              </View>
            </View>

            <View style={styles.alertCardBody}>
              <Text style={[styles.alertNotice, { color: colors.onSurfaceVariant }]}>
                Prevents leaving your earbuds behind in a cafe or gym. If connection drops while your phone screen is active, EarbudKit rings an instant alert.
              </Text>
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.outlineVariant,
                    borderRadius: borderRadius.sm,
                    marginTop: 8,
                  },
                ]}
                onPress={handleTestDisconnectAlert}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
                  🔔 Test Disconnect Alert
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* CARD 4: SLEEP TIMER WITH 10S VOLUME FADE (MEMOIZED) */}
          <SleepTimerCard
            colors={colors}
            borderRadius={borderRadius}
            onToast={showToast}
          />

          {/* CARD 5: EQUALIZER AUDIOFX (MEMOIZED & REACTIVE) */}
          <EqualizerCard
            colors={colors}
            borderRadius={borderRadius}
            selectedAddress={selectedAddress}
            selectedNickname={selectedDevice.nickname || selectedDevice.name}
            onToast={showToast}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  devicePillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    paddingVertical: 2,
  },
  devicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  pillEmoji: {
    fontSize: 18,
  },
  pillText: {
    fontSize: 14,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  toolCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardEmoji: {
    fontSize: 26,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  locationBody: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 12,
  },
  mapMockCard: {
    padding: 16,
    borderWidth: 1,
  },
  mapPinRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  bigPinEmoji: {
    fontSize: 34,
  },
  mapPinDetails: {
    flex: 1,
  },
  locationAddressText: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  locationCoordsText: {
    fontSize: 12,
    marginBottom: 2,
  },
  locationAccuracyText: {
    fontSize: 11,
  },
  navigateBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  navigateBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  noLocationContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  dimEmoji: {
    fontSize: 40,
    opacity: 0.6,
  },
  noLocationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  noLocationDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  radarBody: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 12,
  },
  radarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proximityCategory: {
    fontSize: 14,
    fontWeight: '700',
  },
  rssiValueText: {
    fontSize: 13,
    fontWeight: '600',
  },
  meterTrack: {
    height: 14,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
  },
  meterHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  scanBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  scanBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertCardBody: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 10,
  },
  alertNotice: {
    fontSize: 13,
    lineHeight: 18,
  },
  activeTimerPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeTimerPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerBody: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 12,
  },
  countdownContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  countdownDisplay: {
    fontSize: 48,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  countdownSubtext: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  cancelTimerBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  cancelTimerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputHeading: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  presetsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  presetChipText: {
    fontSize: 13,
  },
  customRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  customLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  stepperText: {
    fontSize: 12,
    fontWeight: '600',
  },
  startCustomBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  startCustomText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickTestTimerBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 6,
  },
  quickTestTimerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  eqBody: {
    padding: 18,
    paddingTop: 8,
  },
  eqUnavailableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  eqUnavailableIcon: {
    fontSize: 24,
  },
  eqUnavailableTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  eqUnavailableBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  eqPresetChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  eqPresetText: {
    fontSize: 12,
  },
  eqBandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    justifyContent: 'space-between',
  },
  eqBandLabelCol: {
    width: 75,
  },
  eqBandFreqText: {
    fontSize: 13,
    fontWeight: '600',
  },
  eqBandDbText: {
    fontSize: 11,
    fontWeight: '500',
  },
  eqBandControls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  eqStepBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eqStepBtnText: {
    fontSize: 18,
    fontWeight: '600',
  },
  eqLevelTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  eqZeroIndicator: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    zIndex: 1,
  },
  eqLevelFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 6,
  },
  card: {
    padding: 24,
    alignItems: 'center',
    marginVertical: 16,
  },
  largeEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
