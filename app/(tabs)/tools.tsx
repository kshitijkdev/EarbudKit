import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
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
import {
  GlassCard,
  PillButton,
  StatusChip,
  Toggle,
  NeonSlider,
  SectionHeader,
} from '../../src/components/ui';

type ToolTab = 'find' | 'sleep' | 'eq';

export default function ToolsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, fonts, borderRadius } = theme;

  const [activeTab, setActiveTab] = useState<ToolTab>('find');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const trackedDevicesMap = useDeviceStore((s) => s.trackedDevices);
  const activeDeviceAddress = useDeviceStore((s) => s.activeDeviceAddress);
  const trackedDevices = Object.values(trackedDevicesMap);

  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

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

  // -------------------------------------------------------------
  // Tool 1: FIND MY DEVICE & RSSI RADAR
  // -------------------------------------------------------------
  const [isScanning, setIsScanning] = useState(false);
  const [currentRssi, setCurrentRssi] = useState<number | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  // Throttled RSSI scanner listener
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
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 5,
          timestamp: Date.now(),
          addressText: 'MG Road, Bengaluru, Karnataka',
        };
        setDeviceLocation(selectedAddress, demoLoc);
        showToast('✓ Saved location checkpoint for testing!');
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
    } else {
      showToast('Notice: Grant notification permission in settings');
    }
  };

  const calculateProximity = (rssi: number | null) => {
    if (rssi === null) {
      return {
        percent: 0,
        label: isScanning ? 'Searching for BLE beacon...' : 'Tap Radar to Start Proximity Scan',
        color: colors.outline,
        dBmText: isScanning ? 'Scanning...' : 'Idle',
      };
    }
    const clamped = Math.min(Math.max(rssi, -100), -40);
    const percent = Math.round(((clamped - -100) / (-40 - -100)) * 100);

    if (rssi >= -55) {
      return {
        percent,
        label: 'HOT 🔥 Right next to you',
        color: colors.secondary,
        dBmText: `${rssi} dBm`,
      };
    } else if (rssi >= -70) {
      return {
        percent,
        label: 'WARM ♨️ In the same room',
        color: '#FF8800',
        dBmText: `${rssi} dBm`,
      };
    } else if (rssi >= -85) {
      return {
        percent,
        label: 'WARMING UP 🌤️ Signal rising',
        color: colors.primary,
        dBmText: `${rssi} dBm`,
      };
    } else {
      return {
        percent,
        label: 'COLD ❄️ Distant signal',
        color: colors.outline,
        dBmText: `${rssi} dBm`,
      };
    }
  };

  const proximity = calculateProximity(currentRssi);

  // -------------------------------------------------------------
  // Tool 2: SLEEP TIMER
  // -------------------------------------------------------------
  const isTimerActive = useSleepTimerStore((s) => s.isActive);
  const remainingSeconds = useSleepTimerStore((s) => s.remainingSeconds);
  const totalTimerSeconds = useSleepTimerStore((s) => s.totalSeconds);
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

  const timerProgress = totalTimerSeconds > 0
    ? Math.max(0, Math.min(1, remainingSeconds / totalTimerSeconds))
    : 0;
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - timerProgress);

  // -------------------------------------------------------------
  // Tool 3: PARAMETRIC EQUALIZER (AudioFX)
  // -------------------------------------------------------------
  const configs = useEqualizerStore((s) => s.configs);
  const isEqSupported = useEqualizerStore((s) => s.isSupported);
  const bandFrequencies = useEqualizerStore((s) => s.bandFrequencies);
  const setDeviceEqEnabled = useEqualizerStore((s) => s.setDeviceEqEnabled);
  const setDevicePreset = useEqualizerStore((s) => s.setDevicePreset);
  const setDeviceBandLevel = useEqualizerStore((s) => s.setDeviceBandLevel);
  const getDeviceConfig = useEqualizerStore((s) => s.getDeviceConfig);
  const hasCheckedEq = useEqualizerStore((s) => s.hasCheckedSupport);
  const checkEqSupport = useEqualizerStore((s) => s.checkEqualizerSupport);

  useEffect(() => {
    if (!hasCheckedEq) {
      checkEqSupport();
    }
  }, [hasCheckedEq, checkEqSupport]);

  const upperAddr = selectedAddress ? selectedAddress.toUpperCase() : '';
  const eqConfig = upperAddr && configs[upperAddr]
    ? configs[upperAddr]
    : (upperAddr ? getDeviceConfig(upperAddr) : DEFAULT_DEVICE_EQ);

  const handleEqToggle = (val: boolean) => {
    if (!upperAddr) return;
    setDeviceEqEnabled(upperAddr, val);
    showToast(val ? '✓ Equalizer Turned ON' : 'Equalizer Turned OFF');
  };

  const handleEqPreset = (preset: EqPresetName) => {
    if (!upperAddr) return;
    setDevicePreset(upperAddr, preset);
    showToast(`✓ EQ Preset Applied: ${preset}`);
  };

  const handleBandLevel = (bandIdx: number, newLevel: number, freqLabel: string) => {
    if (!upperAddr) return;
    setDeviceBandLevel(upperAddr, bandIdx, newLevel);
    const db = (newLevel / 100).toFixed(1);
    showToast(`✓ ${freqLabel}: ${newLevel > 0 ? '+' : ''}${db} dB`);
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24 }]}>
        <GlassCard style={styles.platformCard}>
          <Text style={styles.largeEmoji}>🍎</Text>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>iOS Not Supported</Text>
          <Text style={[styles.bodyText, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }]}>
            Tools (Find My Device radar, Sleep Timer volume fade, and AudioFX Equalizer) require Android system APIs.
          </Text>
        </GlassCard>
      </View>
    );
  }

  if (trackedDevices.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24 }]}>
        <GlassCard style={styles.platformCard}>
          <Text style={styles.largeEmoji}>🎛️</Text>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>No Devices Tracked</Text>
          <Text style={[styles.bodyText, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }]}>
            Add a device first to use the proximity radar, sleep timer, and hardware equalizer.
          </Text>
          <View style={{ marginTop: 20 }}>
            <PillButton
              variant="primary"
              size="md"
              label="Go to Devices Screen"
              onPress={() => router.push('/devices')}
            />
          </View>
        </GlassCard>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FeedbackToast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Acoustic Tools</Text>
            <Text style={[styles.headerSubtitle, { color: colors.onSurfaceVariant }]}>
              Radar tracking, volume dimmer & parametric DSP.
            </Text>
          </View>

          <StatusChip
            label={activeTab.toUpperCase()}
            dotColor={activeTab === 'find' ? 'pink' : activeTab === 'sleep' ? 'violet' : 'lime'}
            pulse
          />
        </View>

        {/* Device Selector Horizontal Pills */}
        <View style={styles.selectorSection}>
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
                        ? colors.primary
                        : colors.surfaceContainerHigh,
                      borderColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    setSelectedAddress(dev.address);
                    showToast(`✓ Target: ${dev.nickname}`);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 16 }}>
                    {dev.icon === 'headphones' ? '🎧' : '🎧'}
                  </Text>
                  <Text
                    style={[
                      styles.devicePillText,
                      {
                        color: isSelected ? colors.onPrimary : colors.onSurface,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {dev.nickname}
                  </Text>
                  {dev.isConnected && (
                    <View style={[styles.onlineDot, { backgroundColor: colors.tertiary }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Segmented Top Filter Tabs (Find / Sleep / EQ) */}
        <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceContainerLowest + '90' }]}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'find' && {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 4,
              },
            ]}
            onPress={() => setActiveTab('find')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>📡</Text>
            <Text
              style={[
                styles.segmentLabel,
                {
                  color: activeTab === 'find' ? colors.onPrimary : colors.onSurfaceVariant,
                  fontWeight: activeTab === 'find' ? '700' : '600',
                },
              ]}
            >
              FIND RADAR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'sleep' && {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 4,
              },
            ]}
            onPress={() => setActiveTab('sleep')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>⏰</Text>
            <Text
              style={[
                styles.segmentLabel,
                {
                  color: activeTab === 'sleep' ? colors.onPrimary : colors.onSurfaceVariant,
                  fontWeight: activeTab === 'sleep' ? '700' : '600',
                },
              ]}
            >
              SLEEP TIMER
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'eq' && {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 4,
              },
            ]}
            onPress={() => setActiveTab('eq')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>🎚️</Text>
            <Text
              style={[
                styles.segmentLabel,
                {
                  color: activeTab === 'eq' ? colors.onPrimary : colors.onSurfaceVariant,
                  fontWeight: activeTab === 'eq' ? '700' : '600',
                },
              ]}
            >
              EQUALIZER
            </Text>
          </TouchableOpacity>
        </View>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: FIND MY DEVICE (PROXIMITY RADAR)                     */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'find' && (
          <View style={styles.toolSectionStack}>
            {/* Radar Console Glass Card */}
            <GlassCard glow={isScanning} style={styles.radarCard}>
              <View style={styles.radarCardHeader}>
                <View style={styles.headerLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: colors.secondary + '25' }]}>
                    <Text style={{ fontSize: 20 }}>📡</Text>
                  </View>
                  <View>
                    <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                      Proximity Radar
                    </Text>
                    <Text style={[styles.cardSublabel, { color: colors.secondary }]}>
                      BLE 2.4GHZ BEACON LOOP
                    </Text>
                  </View>
                </View>

                <PillButton
                  variant={isScanning ? 'danger' : 'primary'}
                  size="sm"
                  label={isScanning ? 'Stop Scan' : 'Start Radar'}
                  onPress={handleToggleRssiScan}
                />
              </View>

              {/* Concentric Radar Animation Screen */}
              <TouchableOpacity
                style={[styles.radarConsole, { backgroundColor: colors.surfaceContainerLowest }]}
                activeOpacity={0.9}
                onPress={handleToggleRssiScan}
              >
                {/* Concentric Distance Rings */}
                <View style={[styles.radarRing1, { borderColor: colors.primary + '25' }]} />
                <View style={[styles.radarRing2, { borderColor: colors.primary + '35' }]} />
                <View style={[styles.radarRing3, { borderColor: colors.primary + '45' }]} />

                {/* Center Phone Node */}
                <View style={[styles.centerPhoneNode, { backgroundColor: colors.surfaceContainerHigh }]}>
                  <Text style={{ fontSize: 16 }}>📱</Text>
                </View>

                {/* Target Blip Node */}
                <View
                  style={[
                    styles.blipNode,
                    {
                      backgroundColor: proximity.color,
                      shadowColor: proximity.color,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.9,
                      shadowRadius: 12,
                      elevation: 6,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 14 }}>🎧</Text>
                </View>

                {/* Distance Scale Labels */}
                <View style={styles.radarScaleRow}>
                  <Text style={[styles.scaleText, { color: colors.outline }]}>0.5m • 1.5m • 3.0m</Text>
                  <Text style={[styles.scaleText, { color: proximity.color, fontWeight: '700' }]}>
                    {isScanning ? 'SCANNING BEACON' : 'STANDBY'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Telemetry Readout Grid */}
              <View style={styles.telemetryGrid}>
                <View style={[styles.telemetryCell, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
                  <Text style={[styles.telemetryCellLabel, { color: colors.outline }]}>
                    PROXIMITY STATUS
                  </Text>
                  <Text style={[styles.telemetryStatusText, { color: proximity.color }]}>
                    {proximity.label}
                  </Text>
                </View>

                <View style={[styles.telemetryCell, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
                  <Text style={[styles.telemetryCellLabel, { color: colors.outline }]}>
                    BLE RSSI POWER
                  </Text>
                  <Text style={[styles.telemetryPowerText, { color: colors.tertiary }]}>
                    {proximity.dBmText}
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Last Known Location Glass Card */}
            <GlassCard style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={{ fontSize: 20 }}>📍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                    Last Seen Location
                  </Text>
                  <Text style={[styles.locationAddressText, { color: colors.onSurfaceVariant }]}>
                    {selectedDevice?.lastLocation?.addressText ||
                      (selectedDevice?.lastLocation
                        ? `${selectedDevice.lastLocation.latitude.toFixed(4)}, ${selectedDevice.lastLocation.longitude.toFixed(4)}`
                        : 'No disconnect location recorded yet.')}
                  </Text>
                  {selectedDevice?.lastLocation?.timestamp && (
                    <Text style={[styles.locationTimestamp, { color: colors.outline }]}>
                      Recorded {new Date(selectedDevice.lastLocation.timestamp).toLocaleTimeString()}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.locationActionRow}>
                <PillButton
                  variant="primary"
                  size="sm"
                  label="🧭 Navigate (Maps)"
                  onPress={handleNavigate}
                  disabled={!selectedDevice?.lastLocation}
                  style={{ flex: 1 }}
                />
                <PillButton
                  variant="secondary"
                  size="sm"
                  label={isCapturingLocation ? 'Saving...' : '📌 Mark Here'}
                  onPress={() => { handleManualCaptureLocation(); }}
                  loading={isCapturingLocation}
                />
              </View>
            </GlassCard>

            {/* Disconnect Drop Alert Card */}
            <GlassCard style={styles.dropAlertCard}>
              <View style={styles.dropAlertRow}>
                <View style={[styles.iconCircle, { backgroundColor: colors.tertiary + '20' }]}>
                  <Text style={{ fontSize: 20 }}>🔔</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                    Disconnect Drop Alert
                  </Text>
                  <Text style={[styles.cardSublabel, { color: colors.onSurfaceVariant, marginTop: 2 }]}>
                    Alerts you if device disconnects while phone screen is in use
                  </Text>
                </View>

                <Toggle
                  value={selectedDevice?.disconnectAlertEnabled ?? true}
                  onValueChange={(val) => {
                    if (selectedAddress) {
                      setDisconnectAlert(selectedAddress, val);
                      showToast(val ? '✓ Disconnect drop alert enabled' : 'Disconnect drop alert disabled');
                    }
                  }}
                />
              </View>

              <View style={{ alignItems: 'flex-end', paddingTop: 6 }}>
                <PillButton
                  variant="ghost"
                  size="sm"
                  label="🔔 Test Disconnect Notification"
                  onPress={() => { handleTestDisconnectAlert(); }}
                />
              </View>
            </GlassCard>
          </View>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: SMART SLEEP TIMER                                    */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'sleep' && (
          <View style={styles.toolSectionStack}>
            <GlassCard glow={isTimerActive} style={styles.sleepCard}>
              <View style={styles.sleepCardHeader}>
                <View style={styles.headerLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: colors.primary + '25' }]}>
                    <Text style={{ fontSize: 20 }}>⏰</Text>
                  </View>
                  <View>
                    <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                      Smart Sleep Timer
                    </Text>
                    <Text style={[styles.cardSublabel, { color: colors.primary }]}>
                      10S SMOOTH VOLUME FADE
                    </Text>
                  </View>
                </View>

                {isTimerActive && (
                  <StatusChip
                    label={isFading ? 'FADING OUT' : 'RUNNING'}
                    dotColor={isFading ? 'pink' : 'lime'}
                    pulse
                  />
                )}
              </View>

              {/* Circular Countdown Ring Visualizer */}
              <View style={styles.timerRingContainer}>
                <Svg width={180} height={180} style={{ transform: [{ rotate: '-90deg' }] }}>
                  <Defs>
                    <SvgLinearGradient id="sleepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor={colors.primary} />
                      <Stop offset="60%" stopColor={colors.secondary} />
                      <Stop offset="100%" stopColor={colors.tertiary} />
                    </SvgLinearGradient>
                  </Defs>
                  {/* Background Track */}
                  <Circle
                    cx={90}
                    cy={90}
                    r={radius}
                    stroke={colors.surfaceContainerHigh}
                    strokeWidth={8}
                    fill="transparent"
                  />
                  {/* Dynamic Progress Stroke */}
                  <Circle
                    cx={90}
                    cy={90}
                    r={radius}
                    stroke="url(#sleepGrad)"
                    strokeWidth={8}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={isTimerActive ? strokeDashoffset : 0}
                    strokeLinecap="round"
                  />
                </Svg>

                {/* Interior Countdown Text */}
                <View style={styles.ringInnerContent}>
                  <Text style={[styles.ringSublabel, { color: colors.outline }]}>
                    REMAINING
                  </Text>
                  <Text
                    style={[
                      styles.ringCountdownText,
                      { color: isFading ? colors.secondary : colors.onSurface },
                    ]}
                  >
                    {isTimerActive ? formatSeconds(remainingSeconds) : `${customMinutes}:00`}
                  </Text>
                  <Text style={[styles.ringTargetPill, { color: colors.primary }]}>
                    Target: {selectedPreset ? `${selectedPreset}m` : `${customMinutes}m`}
                  </Text>
                </View>
              </View>

              {/* Gentle Dimming Notice Pod */}
              <View style={[styles.fadeNoticePod, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
                <Text style={{ fontSize: 16 }}>🎧</Text>
                <Text style={[styles.fadeNoticeText, { color: colors.onSurfaceVariant }]}>
                  Media volume smoothly attenuates over the final 10 seconds before pausing playback.
                </Text>
              </View>

              {/* Preset Chips */}
              <View style={styles.presetsRow}>
                {[15, 30, 45, 60].map((mins) => {
                  const isPicked = selectedPreset === mins && isTimerActive;
                  return (
                    <TouchableOpacity
                      key={mins}
                      style={[
                        styles.timerPresetPill,
                        {
                          backgroundColor: isPicked
                            ? colors.primary
                            : colors.surfaceContainerHigh,
                          borderColor: isPicked ? colors.primary : 'transparent',
                        },
                      ]}
                      onPress={() => {
                        startTimer(mins);
                        showToast(`✓ Sleep timer started for ${mins} minutes`);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.timerPresetText,
                          {
                            color: isPicked ? colors.onPrimary : colors.onSurface,
                            fontWeight: isPicked ? '700' : '600',
                          },
                        ]}
                      >
                        {mins}m
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Minutes Stepper */}
              <View style={[styles.customStepperRow, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
                <Text style={[styles.stepperLabel, { color: colors.onSurface }]}>
                  Custom: {customMinutes} min
                </Text>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                    onPress={() => setCustomMinutes((m) => Math.max(5, m - 5))}
                  >
                    <Text style={[styles.stepperBtnText, { color: colors.onSurface }]}>-5m</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                    onPress={() => setCustomMinutes((m) => m + 5)}
                  >
                    <Text style={[styles.stepperBtnText, { color: colors.onSurface }]}>+5m</Text>
                  </TouchableOpacity>
                  <PillButton
                    variant="primary"
                    size="sm"
                    label={`Start ${customMinutes}m`}
                    onPress={() => {
                      startTimer(customMinutes);
                      showToast(`✓ Sleep timer started for ${customMinutes} minutes`);
                    }}
                  />
                </View>
              </View>

              {/* Action Buttons: 15s Test & Cancel */}
              <View style={styles.timerActionsRow}>
                <PillButton
                  variant="ghost"
                  size="sm"
                  label="⚡ 15s Quick Fade Test"
                  onPress={() => {
                    startQuickTestTimer(15);
                    showToast('⚡ 15s fade test started');
                  }}
                />
                {isTimerActive && (
                  <PillButton
                    variant="danger"
                    size="sm"
                    label="✕ Cancel Timer"
                    onPress={() => {
                      cancelTimer();
                      showToast('Sleep timer cancelled');
                    }}
                  />
                )}
              </View>
            </GlassCard>
          </View>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: PARAMETRIC EQUALIZER (AudioFX)                       */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'eq' && (
          <View style={styles.toolSectionStack}>
            <GlassCard glow={eqConfig.enabled} style={styles.eqCard}>
              <View style={styles.eqCardHeader}>
                <View style={styles.headerLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: colors.tertiary + '25' }]}>
                    <Text style={{ fontSize: 20 }}>🎚️</Text>
                  </View>
                  <View>
                    <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                      Parametric Equalizer
                    </Text>
                    <Text style={[styles.cardSublabel, { color: colors.tertiary }]}>
                      5-BAND LOW-LATENCY AUDIOFX
                    </Text>
                  </View>
                </View>

                {isEqSupported && (
                  <Toggle
                    value={eqConfig.enabled}
                    onValueChange={handleEqToggle}
                  />
                )}
              </View>

              {/* Degradation Banner when unsupported */}
              {!isEqSupported ? (
                <View style={[styles.eqUnavailablePod, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
                  <Text style={{ fontSize: 24 }}>⚠️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.unavailableTitle, { color: colors.onSurface }]}>
                      EQ unavailable on this device
                    </Text>
                    <Text style={[styles.unavailableDesc, { color: colors.onSurfaceVariant }]}>
                      Hardware Android AudioFX Equalizer engine is not supported on this specific device/session. Standard Bluetooth audio playback is unaffected.
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={{ opacity: eqConfig.enabled ? 1 : 0.45, gap: 16 }}>
                  {/* Presets Chips */}
                  <View>
                    <Text style={[styles.eqSectionTitle, { color: colors.outline }]}>
                      EQ PRESETS
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.eqPresetsRow}
                    >
                      {(['Flat', 'Bass Boost', 'Vocal', 'Treble', 'Custom'] as EqPresetName[]).map(
                        (preset) => {
                          const isPicked = eqConfig.preset === preset;
                          return (
                            <TouchableOpacity
                              key={preset}
                              style={[
                                styles.eqPresetPill,
                                {
                                  backgroundColor: isPicked
                                    ? colors.secondary
                                    : colors.surfaceContainerHigh,
                                  borderColor: isPicked ? colors.secondary : 'transparent',
                                },
                              ]}
                              disabled={!eqConfig.enabled}
                              onPress={() => handleEqPreset(preset)}
                              activeOpacity={0.8}
                            >
                              <Text
                                style={[
                                  styles.eqPresetText,
                                  {
                                    color: isPicked ? colors.onSecondary : colors.onSurface,
                                    fontWeight: isPicked ? '700' : '600',
                                  },
                                ]}
                              >
                                {isPicked ? '✓ ' : ''}{preset}
                              </Text>
                            </TouchableOpacity>
                          );
                        }
                      )}
                    </ScrollView>
                  </View>

                  {/* 5 Frequency Bands NeonSliders */}
                  <View style={styles.bandsContainer}>
                    <Text style={[styles.eqSectionTitle, { color: colors.outline }]}>
                      FREQUENCY BANDS (-15dB to +15dB)
                    </Text>

                    {bandFrequencies.map((freq, idx) => {
                      const levelMB = eqConfig.bandLevels[idx] ?? 0;
                      const levelDB = (levelMB / 100).toFixed(1);
                      const formattedFreq =
                        freq >= 1000 ? `${(freq / 1000).toFixed(1)} kHz` : `${freq} Hz`;

                      return (
                        <View
                          key={idx}
                          style={[styles.bandItemCard, { backgroundColor: colors.surfaceContainerLowest + '80' }]}
                        >
                          <View style={styles.bandItemHeader}>
                            <Text style={[styles.bandFreqText, { color: colors.onSurface }]}>
                              {formattedFreq}
                            </Text>
                            <Text
                              style={[
                                styles.bandDbText,
                                {
                                  color:
                                    levelMB > 0
                                      ? colors.tertiary
                                      : levelMB < 0
                                      ? colors.secondary
                                      : colors.outline,
                                },
                              ]}
                            >
                              {levelMB > 0 ? `+${levelDB}` : levelDB} dB
                            </Text>
                          </View>

                          <NeonSlider
                            value={levelMB}
                            min={-1500}
                            max={1500}
                            step={100}
                            disabled={!eqConfig.enabled}
                            onValueChange={(val) => handleBandLevel(idx, val, formattedFreq)}
                            formatValue={(v) => `${(v / 100).toFixed(1)} dB`}
                            showSteppers={true}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </GlassCard>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  platformCard: {
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  largeEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  bodyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  selectorSection: {
    gap: 8,
  },
  devicePillsRow: {
    gap: 8,
  },
  devicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
  },
  devicePillText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 9999,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9999,
    gap: 6,
  },
  segmentLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  toolSectionStack: {
    gap: 16,
  },
  radarCard: {
    padding: 18,
    gap: 14,
  },
  radarCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    letterSpacing: -0.3,
  },
  cardSublabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 1,
  },
  radarConsole: {
    height: 200,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  radarRing1: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1.5,
  },
  radarRing2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
  },
  radarRing3: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1.5,
  },
  centerPhoneNode: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  blipNode: {
    position: 'absolute',
    top: 36,
    right: 50,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  radarScaleRow: {
    position: 'absolute',
    bottom: 10,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scaleText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  telemetryCell: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    gap: 4,
  },
  telemetryCellLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  telemetryStatusText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
  },
  telemetryPowerText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
  },
  locationCard: {
    padding: 18,
    gap: 14,
  },
  locationHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  locationAddressText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  locationTimestamp: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 11,
    marginTop: 4,
  },
  locationActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dropAlertCard: {
    padding: 18,
    gap: 10,
  },
  dropAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sleepCard: {
    padding: 18,
    gap: 16,
  },
  sleepCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 190,
    position: 'relative',
    marginVertical: 4,
  },
  ringInnerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSublabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  ringCountdownText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 34,
    letterSpacing: -1,
    marginVertical: 2,
  },
  ringTargetPill: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12,
  },
  fadeNoticePod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
  },
  fadeNoticeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timerPresetPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerPresetText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
  },
  customStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
  },
  stepperLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stepperBtnText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12,
  },
  timerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  eqCard: {
    padding: 18,
    gap: 16,
  },
  eqCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eqUnavailablePod: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
  },
  unavailableTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
  },
  unavailableDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  eqSectionTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  eqPresetsRow: {
    gap: 8,
  },
  eqPresetPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1.5,
  },
  eqPresetText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
  },
  bandsContainer: {
    gap: 12,
  },
  bandItemCard: {
    padding: 14,
    borderRadius: 16,
    gap: 8,
  },
  bandItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bandFreqText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
  },
  bandDbText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
  },
});
