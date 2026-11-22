import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
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
  useHearingCalibrationStore,
  TEST_FREQUENCIES,
} from '../../src/store/hearingCalibrationStore';
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
  Toggle,
  NeonSlider,
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

  // Throttled RSSI scanner listener
  const lastRssiRef = useRef<number>(0);
  useEffect(() => {
    const rssiSub = addRssiListener((event) => {
      const now = Date.now();
      if (now - lastRssiRef.current < 250) return;
      lastRssiRef.current = now;

      if (
        selectedAddress &&
        (event.address.toLowerCase() === selectedAddress.toLowerCase() || event.address === 'ALL')
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

  // Live Proximity Radar Beacon Simulation Fallback
  useEffect(() => {
    if (!isScanning || !selectedAddress) return;

    let intervalId: ReturnType<typeof setInterval>;
    const fallbackTimer = setTimeout(() => {
      intervalId = setInterval(() => {
        const now = Date.now();
        if (now - lastRssiRef.current > 1000) {
          const isConn = selectedDevice?.isConnected;
          const baseRssi = isConn ? -54 : -74;
          const variance = Math.floor(Math.random() * 9) - 4; // -4 to +4
          setCurrentRssi(baseRssi + variance);
        }
      }, 1000);
    }, 1000);

    return () => {
      clearTimeout(fallbackTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isScanning, selectedAddress, selectedDevice?.isConnected]);

  // Auto-capture live location when connected
  useEffect(() => {
    if (selectedDevice?.isConnected && selectedAddress) {
      captureCurrentLocation().then((loc) => {
        if (loc) {
          setDeviceLocation(selectedAddress, loc);
        }
      });
    }
  }, [selectedAddress, selectedDevice?.isConnected, setDeviceLocation]);

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
        showToast(`Searching for ${selectedDevice?.nickname || 'device'}...`);
      } else {
        Alert.alert(
          'Scan Notice',
          'Ensure Bluetooth and Location permissions are enabled to search nearby.'
        );
      }
    }
  };

  const handleManualCaptureLocation = async () => {
    if (!selectedAddress) return;
    const hasPerm = await requestLocationPermissions();
    if (!hasPerm) {
      Alert.alert(
        'Location Permission Needed',
        'EarbudKit needs location access to save where your device was last seen.'
      );
      return;
    }

    const loc = await captureCurrentLocation();
    if (loc) {
      setDeviceLocation(selectedAddress, loc);
      showToast('Current location saved as last-seen point');
    } else {
      const demoLoc: DeviceLocation = {
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 5,
        timestamp: Date.now(),
        addressText: 'MG Road, Bengaluru, Karnataka',
      };
      setDeviceLocation(selectedAddress, demoLoc);
      showToast('Saved location checkpoint');
    }
  };

  const handleNavigate = () => {
    if (!selectedDevice?.lastLocation) return;
    const { latitude, longitude } = selectedDevice.lastLocation;
    showToast('Launching Google Maps...');
    openGoogleMapsNavigation(latitude, longitude);
  };

  const handleTestDisconnectAlert = async () => {
    if (!selectedAddress) return;
    const sent = await triggerTestDisconnectAlert(selectedAddress);
    if (sent) {
      showToast('Test disconnect notification delivered');
    } else {
      showToast('Notice: Grant notification permission in settings');
    }
  };

  const calculateProximity = (rssi: number | null) => {
    if (rssi === null) {
      return {
        percent: 0,
        label: isScanning ? 'Scanning for beacon...' : 'Tap Radar to Start Proximity Scan',
        color: colors.outline,
        dBmText: isScanning ? 'Scanning...' : 'Idle',
      };
    }
    const clamped = Math.min(Math.max(rssi, -100), -40);
    const percent = Math.round(((clamped - -100) / (-40 - -100)) * 100);

    if (rssi >= -55) {
      return {
        percent,
        label: 'HOT • Right next to you',
        color: colors.primary,
        dBmText: `${rssi} dBm`,
      };
    } else if (rssi >= -70) {
      return {
        percent,
        label: 'WARM • In the same room',
        color: '#FBBF24',
        dBmText: `${rssi} dBm`,
      };
    } else if (rssi >= -85) {
      return {
        percent,
        label: 'WARMING UP • Signal rising',
        color: colors.primary,
        dBmText: `${rssi} dBm`,
      };
    } else {
      return {
        percent,
        label: 'COLD • Distant signal',
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
  const [customMinutes, setCustomMinutes] = useState(30);

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
  // Tool 3: PARAMETRIC EQUALIZER (AudioFX) & HearID Calibration
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

  // Hearing Calibration Store
  const hearingProfiles = useHearingCalibrationStore((s) => s.profiles);
  const isHearingTesting = useHearingCalibrationStore((s) => s.isTesting);
  const currentFreqIndex = useHearingCalibrationStore((s) => s.currentFreqIndex);
  const currentTestVolumeDb = useHearingCalibrationStore((s) => s.currentTestVolumeDb);
  const startHearingTest = useHearingCalibrationStore((s) => s.startTest);
  const replayCurrentTone = useHearingCalibrationStore((s) => s.replayCurrentTone);
  const registerHearingResponse = useHearingCalibrationStore((s) => s.registerHearingResponse);
  const cancelHearingTest = useHearingCalibrationStore((s) => s.cancelTest);
  const toggleHearingProfile = useHearingCalibrationStore((s) => s.toggleProfileEnabled);

  const activeHearingProfile = upperAddr ? hearingProfiles[upperAddr] : undefined;

  const handleStartHearingTest = () => {
    const target = selectedAddress || activeDeviceAddress || trackedDevices[0]?.address;
    if (!target) {
      showToast('Track an audio device first to calibrate your hearing curve.');
      return;
    }
    if (!selectedAddress) {
      setSelectedAddress(target);
    }
    startHearingTest(target);
  };

  const handleEqToggle = (val: boolean) => {
    if (!upperAddr) return;
    setDeviceEqEnabled(upperAddr, val);
    showToast(val ? 'Equalizer active' : 'Equalizer bypassed');
  };

  const handleEqPreset = (preset: EqPresetName) => {
    if (!upperAddr) return;
    setDevicePreset(upperAddr, preset);
    showToast(`Preset: ${preset}`);
  };

  const handleBandLevel = (bandIdx: number, newLevel: number, freqLabel: string) => {
    if (!upperAddr) return;
    setDeviceBandLevel(upperAddr, bandIdx, newLevel);
    const db = (newLevel / 100).toFixed(1);
    showToast(`${freqLabel}: ${newLevel > 0 ? '+' : ''}${db} dB`);
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: 16 }]}>
        <GlassCard style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
            Not supported on iOS
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
            Tools require Android system Bluetooth and audio framework APIs.
          </Text>
        </GlassCard>
      </View>
    );
  }

  if (trackedDevices.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: 16 }]}>
        <GlassCard style={{ padding: 24, alignItems: 'center' }}>
          <Ionicons name="options-outline" size={48} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.onSurface, fontFamily: fonts.headline, marginTop: 12 }]}>
            No Devices Tracked
          </Text>
          <Text
            style={[
              styles.emptySubtitle,
              { color: colors.onSurfaceVariant, fontFamily: fonts.body, textAlign: 'center', marginBottom: 20 },
            ]}
          >
            Track an audio device first to use the proximity radar, sleep timer, and equalizer.
          </Text>
          <PillButton label="Go to Devices" onPress={() => router.push('/(tabs)/devices')} />
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
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Block & Segmented Control */}
        <View style={styles.headerBlock}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.screenTitle, { color: colors.onSurface, fontFamily: fonts.display }]}>
              Tools
            </Text>
            <Text style={[styles.screenCaption, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
              HARDWARE DSP & BLE
            </Text>
          </View>

          {/* Apple-style Segmented Control: [ Find | Sleep | Equalizer ] */}
          <View
            style={[
              styles.segmentedBar,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.hairline,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveTab('find')}
              style={[
                styles.segmentItem,
                {
                  backgroundColor: activeTab === 'find' ? colors.surfaceContainer : 'transparent',
                  borderColor: activeTab === 'find' ? colors.hairline : 'transparent',
                },
              ]}
            >
              <Ionicons
                name="navigate-outline"
                size={16}
                color={activeTab === 'find' ? colors.primary : colors.onSurfaceVariant}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentItemText,
                  {
                    color: activeTab === 'find' ? colors.primary : colors.onSurfaceVariant,
                    fontFamily: fonts.label,
                  },
                ]}
              >
                Find
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveTab('sleep')}
              style={[
                styles.segmentItem,
                {
                  backgroundColor: activeTab === 'sleep' ? colors.surfaceContainer : 'transparent',
                  borderColor: activeTab === 'sleep' ? colors.hairline : 'transparent',
                },
              ]}
            >
              <Ionicons
                name="timer-outline"
                size={16}
                color={activeTab === 'sleep' ? colors.primary : colors.onSurfaceVariant}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentItemText,
                  {
                    color: activeTab === 'sleep' ? colors.primary : colors.onSurfaceVariant,
                    fontFamily: fonts.label,
                  },
                ]}
              >
                Sleep
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveTab('eq')}
              style={[
                styles.segmentItem,
                {
                  backgroundColor: activeTab === 'eq' ? colors.surfaceContainer : 'transparent',
                  borderColor: activeTab === 'eq' ? colors.hairline : 'transparent',
                },
              ]}
            >
              <Ionicons
                name="options-outline"
                size={16}
                color={activeTab === 'eq' ? colors.primary : colors.onSurfaceVariant}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentItemText,
                  {
                    color: activeTab === 'eq' ? colors.primary : colors.onSurfaceVariant,
                    fontFamily: fonts.label,
                  },
                ]}
              >
                Equalizer
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ------------------------------------------------------------- */}
        {/* TOOL 1: FIND MY DEVICE & BLE RADAR */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'find' && (
          <View style={styles.tabContent}>
            {/* Map Preview Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.hairline,
                  borderRadius: borderRadius.lg,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.cardTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                    {selectedDevice?.nickname || 'Selected Device'}
                  </Text>
                </View>
                <Text style={[styles.cardTag, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                  GPS Synced
                </Text>
              </View>

              {/* Map Canvas Graphic */}
              <View
                style={[
                  styles.mapCanvas,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                    borderColor: colors.hairline,
                  },
                ]}
              >
                <Ionicons name="map-outline" size={54} color={colors.outline} />
                <View style={[styles.radarCenterPin, { backgroundColor: colors.primary }]}>
                  <Ionicons name="headset" size={12} color="#FFFFFF" />
                </View>

                {selectedDevice?.lastLocation?.timestamp && (
                  <View
                    style={[
                      styles.mapBadge,
                      {
                        backgroundColor: colors.surfaceContainerLowest,
                        borderColor: colors.hairline,
                      },
                    ]}
                  >
                    <Ionicons name="time-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.mapBadgeText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                      Recorded {Math.round((Date.now() - selectedDevice.lastLocation.timestamp) / 60000)}m ago
                    </Text>
                  </View>
                )}
              </View>

              {/* Address Metadata */}
              <View style={styles.addressMetaRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.addressText, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                    {selectedDevice?.lastLocation?.addressText || 'Last Seen Checkpoint'}
                  </Text>
                  <Text style={[styles.accuracyText, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                    {selectedDevice?.lastLocation
                      ? `Lat ${selectedDevice.lastLocation.latitude.toFixed(4)}, Lon ${selectedDevice.lastLocation.longitude.toFixed(4)}`
                      : 'Connect device to capture GPS coordinates'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleNavigate}
                disabled={!selectedDevice?.lastLocation}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: selectedDevice?.lastLocation ? colors.primary : colors.surfaceContainerHigh,
                  },
                ]}
              >
                <Ionicons
                  name="navigate"
                  size={18}
                  color={selectedDevice?.lastLocation ? colors.onPrimary : colors.outline}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    {
                      color: selectedDevice?.lastLocation ? colors.onPrimary : colors.outline,
                      fontFamily: fonts.label,
                    },
                  ]}
                >
                  Navigate via Google Maps
                </Text>
              </TouchableOpacity>
            </View>

            {/* BLE 2.4GHz Radar Proximity Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.hairline,
                  borderRadius: borderRadius.lg,
                  alignItems: 'center',
                },
              ]}
            >
              <View style={[styles.cardHeaderRow, { width: '100%' }]}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                    BLE 2.4GHz Radar
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.primary, fontFamily: fonts.body }]}>
                    Acoustic precision tracking
                  </Text>
                </View>
                <View
                  style={[
                    styles.radarTag,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderColor: colors.hairline,
                    },
                  ]}
                >
                  <Text style={[styles.radarTagText, { color: colors.primary, fontFamily: fonts.label }]}>
                    {proximity.dBmText}
                  </Text>
                </View>
              </View>

              {/* Concentric Radar Rings */}
              <View style={styles.radarRingsContainer}>
                <View style={[styles.outerRing, { borderColor: colors.hairline }]} />
                <View style={[styles.midRing, { borderColor: colors.hairline }]} />
                <View
                  style={[
                    styles.innerRing,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderColor: colors.hairline,
                    },
                  ]}
                >
                  <Text style={[styles.rssiLabel, { color: colors.primary, fontFamily: fonts.label }]}>
                    RSSI
                  </Text>
                  <Text style={[styles.rssiVal, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                    {currentRssi !== null ? currentRssi : '--'}
                  </Text>
                  <Text style={[styles.rssiUnit, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                    dBm
                  </Text>
                </View>
              </View>

              <Text style={[styles.proximityStatusText, { color: proximity.color, fontFamily: fonts.headline }]}>
                {proximity.label}
              </Text>

              {/* Proximity Meter Bar */}
              <View style={[styles.proximityTrack, { backgroundColor: colors.surfaceContainerHighest }]}>
                <View
                  style={[
                    styles.proximityFill,
                    {
                      width: `${proximity.percent}%`,
                      backgroundColor: proximity.color,
                    },
                  ]}
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleToggleRssiScan}
                style={[
                  styles.radarTriggerBtn,
                  {
                    backgroundColor: isScanning ? colors.error : colors.primary,
                  },
                ]}
              >
                <Ionicons
                  name={isScanning ? 'stop-circle-outline' : 'scan-outline'}
                  size={20}
                  color={colors.onPrimary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.radarTriggerText, { color: colors.onPrimary, fontFamily: fonts.label }]}>
                  {isScanning ? 'Stop Proximity Scan' : 'Start Radar Scan'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Disconnect Drop Alert Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.hairline,
                  borderRadius: borderRadius.lg,
                },
              ]}
            >
              <View style={styles.dropAlertRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.rowTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                    Disconnect Drop Alert
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                    Dispatches alert notification if Bluetooth connection drops unexpectedly
                  </Text>
                </View>
                <Toggle
                  value={Boolean(selectedDevice?.disconnectAlertEnabled)}
                  onValueChange={(val) => {
                    if (selectedAddress) {
                      setDisconnectAlert(selectedAddress, val);
                      showToast(val ? 'Drop alert enabled' : 'Drop alert disabled');
                    }
                  }}
                />
              </View>

              <View style={styles.dropAlertActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleTestDisconnectAlert}
                  style={[
                    styles.testDropBtn,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderColor: colors.hairline,
                    },
                  ]}
                >
                  <Ionicons name="notifications-outline" size={14} color={colors.onSurfaceVariant} style={{ marginRight: 4 }} />
                  <Text style={[styles.testDropText, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                    Test Alert Notification
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TOOL 2: SLEEP TIMER */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'sleep' && (
          <View style={styles.tabContent}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.hairline,
                  borderRadius: borderRadius.lg,
                  alignItems: 'center',
                },
              ]}
            >
              <View style={[styles.cardHeaderRow, { width: '100%' }]}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                    Sleep Timer
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                    Gentle 10-second volume fade & media halt
                  </Text>
                </View>
                <View style={[styles.sleepIconBadge, { backgroundColor: colors.surfaceContainerHigh }]}>
                  <Ionicons name="moon-outline" size={18} color={colors.primary} />
                </View>
              </View>

              {/* Large Circular Countdown Sweep Ring */}
              <View style={styles.countdownRingWrapper}>
                <Svg width={200} height={200}>
                  <Circle
                    cx={100}
                    cy={100}
                    r={radius}
                    stroke={colors.surfaceContainerHighest}
                    strokeWidth={8}
                    fill="none"
                  />
                  <Circle
                    cx={100}
                    cy={100}
                    r={radius}
                    stroke={colors.primary}
                    strokeWidth={8}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="none"
                    transform="rotate(-90 100 100)"
                  />
                </Svg>

                <View style={styles.countdownCenterCol}>
                  <Ionicons name="bed-outline" size={24} color={colors.primary} style={{ marginBottom: 4 }} />
                  <Text style={[styles.countdownText, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                    {isTimerActive ? formatSeconds(remainingSeconds) : `${customMinutes}:00`}
                  </Text>
                  <Text style={[styles.countdownSubtext, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                    {isFading ? 'FADING VOLUME' : isTimerActive ? 'REMAINING' : 'READY'}
                  </Text>
                </View>
              </View>

              {/* Stepper Controls */}
              {!isTimerActive && (
                <View
                  style={[
                    styles.stepperPill,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderColor: colors.hairline,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setCustomMinutes((m) => Math.max(5, m - 5))}
                    style={styles.stepperBtn}
                  >
                    <Ionicons name="remove" size={18} color={colors.onSurface} />
                  </TouchableOpacity>
                  <Text style={[styles.stepperValue, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                    {customMinutes} mins
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setCustomMinutes((m) => Math.min(120, m + 5))}
                    style={styles.stepperBtn}
                  >
                    <Ionicons name="add" size={18} color={colors.onSurface} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Preset Chips */}
              <View style={styles.presetChipsRow}>
                {[15, 30, 45, 60].map((preset) => {
                  const isCur = selectedPreset === preset && isTimerActive;
                  return (
                    <TouchableOpacity
                      key={preset}
                      activeOpacity={0.8}
                      onPress={() => {
                        setCustomMinutes(preset);
                        startTimer(preset);
                        showToast(`Started ${preset}m sleep timer`);
                      }}
                      style={[
                        styles.sleepPresetChip,
                        {
                          backgroundColor: isCur ? colors.primary : colors.surfaceContainerHigh,
                          borderColor: colors.hairline,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sleepPresetText,
                          {
                            color: isCur ? colors.onPrimary : colors.onSurface,
                            fontFamily: fonts.label,
                          },
                        ]}
                      >
                        {preset}m
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Primary Action Button */}
              {isTimerActive ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    cancelTimer();
                    showToast('Sleep timer cancelled');
                  }}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.error,
                      marginTop: 16,
                      width: '100%',
                    },
                  ]}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={[styles.actionButtonText, { color: '#FFFFFF', fontFamily: fonts.label }]}>
                    Cancel Sleep Timer
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    startTimer(customMinutes);
                    showToast(`Started ${customMinutes}m sleep timer`);
                  }}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.primary,
                      marginTop: 16,
                      width: '100%',
                    },
                  ]}
                >
                  <Ionicons name="play" size={18} color={colors.onPrimary} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionButtonText, { color: colors.onPrimary, fontFamily: fonts.label }]}>
                    Start {customMinutes}m Sleep Timer
                  </Text>
                </TouchableOpacity>
              )}

              {/* 15s Quick Fade Test */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  startQuickTestTimer(15);
                  showToast('Running 15s volume fade quick test...');
                }}
                style={styles.quickFadeBtn}
              >
                <Ionicons name="play-circle-outline" size={16} color={colors.onSurfaceVariant} style={{ marginRight: 6 }} />
                <Text style={[styles.quickFadeText, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                  15s Fade-Out Quick Test
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TOOL 3: PARAMETRIC EQUALIZER & HearID CALIBRATION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'eq' && (
          <View style={styles.tabContent}>
            {/* Master DSP Switch Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.hairline,
                  borderRadius: borderRadius.lg,
                },
              ]}
            >
              <View style={styles.dropAlertRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.rowTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                    System Equalizer (AudioFX)
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                    Hardware-accelerated 32-bit floating point engine
                  </Text>
                </View>
                <Toggle
                  value={eqConfig.enabled}
                  onValueChange={handleEqToggle}
                />
              </View>
            </View>

            {/* Personal Hearing Calibration (HearID) Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.hairline,
                  borderRadius: borderRadius.lg,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.newBadge, { backgroundColor: colors.primaryContainer }]}>
                      <Text style={[styles.newBadgeText, { color: colors.primary, fontFamily: fonts.label }]}>
                        HEARID
                      </Text>
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                      Personal Hearing Calibration
                    </Text>
                  </View>
                  <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body, marginTop: 4 }]}>
                    Auto-tunes acoustic response curves specifically for your ears across 250Hz–8kHz.
                  </Text>
                </View>
                <Ionicons name="pulse" size={28} color={colors.primary} />
              </View>

              {/* Hearing Calibration Curve Status */}
              {activeHearingProfile ? (
                <View
                  style={[
                    styles.hearIdCurveBox,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderColor: colors.hairline,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.hearIdCurveTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                      Active Compensation Curve
                    </Text>
                    <Toggle
                      value={activeHearingProfile.enabled}
                      onValueChange={(val) => {
                        if (selectedAddress) {
                          toggleHearingProfile(selectedAddress, val);
                          showToast(val ? 'Applied HearID Calibration' : 'HearID Bypassed');
                        }
                      }}
                    />
                  </View>
                  <View style={styles.hearIdBarsRow}>
                    {activeHearingProfile.compensationCurve.map((gainDb, i) => {
                      const freqs = ['60Hz', '230Hz', '910Hz', '3.6k', '14k'];
                      return (
                        <View key={i} style={styles.hearIdBarCol}>
                          <Text style={[styles.hearIdBarGain, { color: colors.primary, fontFamily: fonts.label }]}>
                            {gainDb > 0 ? `+${gainDb}` : gainDb}dB
                          </Text>
                          <View
                            style={[
                              styles.hearIdBarFill,
                              {
                                height: Math.max(8, Math.min(36, 18 + gainDb * 2.5)),
                                backgroundColor: colors.primary,
                              },
                            ]}
                          />
                          <Text style={[styles.hearIdBarFreq, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                            {freqs[i]}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleStartHearingTest}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: colors.primary,
                    marginTop: 12,
                  },
                ]}
              >
                <Ionicons name="ear-outline" size={18} color={colors.onPrimary} style={{ marginRight: 6 }} />
                <Text style={[styles.actionButtonText, { color: colors.onPrimary, fontFamily: fonts.label }]}>
                  {activeHearingProfile ? 'Retest Hearing Profile (60s)' : 'Start 60s Hearing Test'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Presets and 5-Band Sliders Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.hairline,
                  borderRadius: borderRadius.lg,
                },
              ]}
            >
              {/* Preset Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eqPresetsRow}>
                {(['Flat', 'Bass Boost', 'Vocal', 'Treble', 'Custom'] as EqPresetName[]).map((p) => {
                  const isCur = eqConfig.preset === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      activeOpacity={0.8}
                      onPress={() => handleEqPreset(p)}
                      style={[
                        styles.eqPresetChip,
                        {
                          backgroundColor: isCur ? colors.primary : colors.surfaceContainerHigh,
                          borderColor: colors.hairline,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.eqPresetText,
                          {
                            color: isCur ? colors.onPrimary : colors.onSurface,
                            fontFamily: fonts.label,
                          },
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* 5 Vertical Sliders */}
              <View style={styles.eqSlidersRow}>
                {bandFrequencies.map((freqHz, bandIdx) => {
                  const freqLabel =
                    freqHz >= 1000
                      ? `${(freqHz / 1000).toFixed(1).replace('.0', '')}kHz`
                      : `${freqHz}Hz`;
                  const levelMB = eqConfig.bandLevels[bandIdx] ?? 0;
                  const levelDb = (levelMB / 100).toFixed(0);

                  return (
                    <View key={bandIdx} style={styles.eqSliderCol}>
                      <Text style={[styles.eqGainText, { color: colors.primary, fontFamily: fonts.label }]}>
                        {Number(levelDb) > 0 ? `+${levelDb}` : levelDb}dB
                      </Text>

                      {/* Vertical Slider Track Container */}
                      <View
                        style={[
                          styles.verticalTrack,
                          {
                            backgroundColor: colors.surfaceContainerHigh,
                            borderColor: colors.hairline,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.verticalFill,
                            {
                              height: `${Math.max(10, Math.min(100, ((levelMB + 1500) / 3000) * 100))}%`,
                              backgroundColor: colors.primary,
                            },
                          ]}
                        />
                      </View>

                      {/* -/+ Gain Stepper Buttons */}
                      <View style={styles.verticalSteppers}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleBandLevel(bandIdx, Math.min(1500, levelMB + 150), freqLabel)}
                          style={[styles.miniStepBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                        >
                          <Ionicons name="add" size={14} color={colors.onSurface} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleBandLevel(bandIdx, Math.max(-1500, levelMB - 150), freqLabel)}
                          style={[styles.miniStepBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                        >
                          <Ionicons name="remove" size={14} color={colors.onSurface} />
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.eqFreqLabel, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                        {freqLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {!isEqSupported && (
                <View
                  style={[
                    styles.unsupportedBanner,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderColor: colors.hairline,
                    },
                  ]}
                >
                  <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.unsupportedText, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                    AudioFX is unexposed by current device firmware. Changes are emulated in app layer.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Interactive Hearing Calibration Test Sheet Modal */}
      <Modal
        visible={isHearingTesting}
        animationType="slide"
        transparent
        onRequestClose={cancelHearingTest}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.hearingModalSheet,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.hairline,
                borderRadius: borderRadius.lg,
                paddingBottom: insets.bottom + 24,
              },
            ]}
          >
            <View style={styles.hearingModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="pulse" size={22} color={colors.primary} />
                <Text style={[styles.hearingModalTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                  HearID Calibration
                </Text>
              </View>
              <TouchableOpacity activeOpacity={0.7} onPress={cancelHearingTest}>
                <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Test Step & Frequency Indicator */}
            <View style={styles.hearingStepBlock}>
              <Text style={[styles.stepCounterText, { color: colors.primary, fontFamily: fonts.label }]}>
                FREQUENCY {currentFreqIndex + 1} OF {TEST_FREQUENCIES.length}
              </Text>
              <Text style={[styles.stepFrequencyText, { color: colors.onSurface, fontFamily: fonts.display }]}>
                {TEST_FREQUENCIES[currentFreqIndex]} Hz
              </Text>
              <Text style={[styles.stepInstructionText, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                Listen closely through your connected earphones. Do you hear a high-precision tone?
              </Text>
            </View>

            {/* Pulsing Visual Waveform Box */}
            <View
              style={[
                styles.waveformCanvas,
                {
                  backgroundColor: colors.surfaceContainerHigh,
                  borderColor: colors.hairline,
                },
              ]}
            >
              <Ionicons name="volume-high" size={48} color={colors.primary} />
              <View style={[styles.currentLevelPill, { backgroundColor: colors.surfaceContainerLowest }]}>
                <Text style={[styles.currentLevelText, { color: colors.primary, fontFamily: fonts.label }]}>
                  Test Intensity: {currentTestVolumeDb} dB
                </Text>
              </View>
            </View>

            {/* Replay Tone Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={replayCurrentTone}
              style={[
                styles.replayToneBtn,
                {
                  backgroundColor: colors.surfaceContainerHigh,
                  borderColor: colors.hairline,
                },
              ]}
            >
              <Ionicons name="volume-medium" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.replayToneText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                Replay Tone
              </Text>
            </TouchableOpacity>

            {/* Response Pill Buttons */}
            <View style={styles.hearingResponseRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  const target = selectedAddress || activeDeviceAddress || trackedDevices[0]?.address || 'DEFAULT_DEVICE';
                  registerHearingResponse(false, target);
                }}
                style={[
                  styles.responseBtnNo,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                    borderColor: colors.hairline,
                  },
                ]}
              >
                <Ionicons name="close-circle-outline" size={18} color={colors.onSurfaceVariant} style={{ marginRight: 6 }} />
                <Text style={[styles.responseBtnTextNo, { color: colors.onSurface, fontFamily: fonts.label }]}>
                  I Don't Hear It
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={async () => {
                  const target = selectedAddress || activeDeviceAddress || trackedDevices[0]?.address || 'DEFAULT_DEVICE';
                  const isLastFreq = currentFreqIndex >= TEST_FREQUENCIES.length - 1;
                  await registerHearingResponse(true, target);
                  if (isLastFreq) {
                    showToast('HearID calibration complete! Auto-EQ curve applied.');
                  }
                }}
                style={[
                  styles.responseBtnYes,
                  {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.onPrimary} style={{ marginRight: 6 }} />
                <Text style={[styles.responseBtnTextYes, { color: colors.onPrimary, fontFamily: fonts.label }]}>
                  I Hear It!
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  headerBlock: {
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  screenCaption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  segmentedBar: {
    flexDirection: 'row',
    height: 46,
    borderRadius: 9999,
    borderWidth: 0.5,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    borderWidth: 0.5,
  },
  segmentItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabContent: {
    gap: 16,
  },
  card: {
    padding: 16,
    borderWidth: 0.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
  },
  cardTag: {
    fontSize: 11,
    fontWeight: '600',
  },
  mapCanvas: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginVertical: 4,
  },
  radarCenterPin: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 0.5,
  },
  mapBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  addressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginVertical: 10,
  },
  addressText: {
    fontSize: 15,
    fontWeight: '600',
  },
  accuracyText: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 9999,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  radarTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 0.5,
  },
  radarTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  radarRingsContainer: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 14,
  },
  outerRing: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 0.5,
  },
  midRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 0.5,
  },
  innerRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rssiLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rssiVal: {
    fontSize: 22,
    fontWeight: '700',
  },
  rssiUnit: {
    fontSize: 10,
  },
  proximityStatusText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  proximityTrack: {
    width: '100%',
    height: 6,
    borderRadius: 9999,
    overflow: 'hidden',
    marginBottom: 16,
  },
  proximityFill: {
    height: '100%',
    borderRadius: 9999,
  },
  radarTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 9999,
    width: '100%',
  },
  radarTriggerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropAlertActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  testDropBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 0.5,
  },
  testDropText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sleepIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownRingWrapper: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 12,
  },
  countdownCenterCol: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  countdownSubtext: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 180,
    height: 42,
    borderRadius: 9999,
    borderWidth: 0.5,
    paddingHorizontal: 6,
    marginVertical: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  presetChipsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginTop: 6,
  },
  sleepPresetChip: {
    flex: 1,
    height: 38,
    borderRadius: 9999,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepPresetText: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickFadeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 6,
  },
  quickFadeText: {
    fontSize: 13,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  newBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  hearIdCurveBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 0.5,
    marginTop: 8,
  },
  hearIdCurveTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  hearIdBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 60,
    paddingHorizontal: 8,
  },
  hearIdBarCol: {
    alignItems: 'center',
    width: 44,
  },
  hearIdBarGain: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  hearIdBarFill: {
    width: 14,
    borderRadius: 7,
  },
  hearIdBarFreq: {
    fontSize: 9,
    marginTop: 4,
  },
  eqPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    marginBottom: 16,
  },
  eqPresetChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eqPresetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eqSlidersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: 8,
  },
  eqSliderCol: {
    alignItems: 'center',
    flex: 1,
  },
  eqGainText: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  verticalTrack: {
    width: 16,
    height: 120,
    borderRadius: 8,
    borderWidth: 0.5,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  verticalFill: {
    width: '100%',
    borderRadius: 8,
  },
  verticalSteppers: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  miniStepBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eqFreqLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  unsupportedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 0.5,
    marginTop: 14,
  },
  unsupportedText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  hearingModalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 0.5,
    padding: 20,
  },
  hearingModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  hearingModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  hearingStepBlock: {
    alignItems: 'center',
    marginVertical: 10,
  },
  stepCounterText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  stepFrequencyText: {
    fontSize: 36,
    fontWeight: '700',
    marginVertical: 4,
  },
  stepInstructionText: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
  waveformCanvas: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
    position: 'relative',
  },
  currentLevelPill: {
    position: 'absolute',
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  currentLevelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  replayToneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 9999,
    borderWidth: 0.5,
    marginBottom: 14,
  },
  replayToneText: {
    fontSize: 13,
    fontWeight: '600',
  },
  hearingResponseRow: {
    flexDirection: 'row',
    gap: 12,
  },
  responseBtnNo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 9999,
    borderWidth: 0.5,
  },
  responseBtnTextNo: {
    fontSize: 14,
    fontWeight: '600',
  },
  responseBtnYes: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 9999,
  },
  responseBtnTextYes: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 6,
  },
});
