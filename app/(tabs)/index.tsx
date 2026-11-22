import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { useBluetoothDevices } from '../../src/features/devices/useBluetoothDevices';
import { useDeviceStore, TrackedDevice } from '../../src/store';
import { useStatsStore, formatDuration } from '../../src/store/statsStore';
import { useSleepTimerStore } from '../../src/store/sleepTimerStore';
import { habitStore } from '../../src/store/habitStore';
import {
  startDeviceWatcherService,
  stopDeviceWatcherService,
  isDeviceWatcherServiceRunning,
  requestNotificationPermission,
  pauseMedia,
} from '../../modules/earbud-native';
import { FeedbackToast } from '../../src/components/FeedbackToast';
import { safeLog } from '../../src/utils/security';
import {
  GlassCard,
  PillButton,
  StatusChip,
  BatteryRing,
} from '../../src/components/ui';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, themeMode, setThemeMode } = useTheme();
  const { colors, fonts, borderRadius } = theme;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => setToastMessage(msg);

  // Bluetooth & live events hook
  const { bluetoothEnabled } = useBluetoothDevices();

  // Tracked devices from Zustand store
  const trackedDevicesMap = useDeviceStore((s) => s.trackedDevices);
  const activeDeviceAddress = useDeviceStore((s) => s.activeDeviceAddress);
  const setActiveDevice = useDeviceStore((s) => s.setActiveDevice);
  const addTrackedDevice = useDeviceStore((s) => s.addTrackedDevice);

  const trackedDevices = Object.values(trackedDevicesMap);

  // Stats from Zustand statsStore
  const statsMap = useStatsStore((s) => s.stats);
  const getDeviceStats = useStatsStore((s) => s.getDeviceStats);

  // Sleep Timer store for quick mini-player interaction
  const sleepTimer = useSleepTimerStore();

  // Smart Habit Predictor
  const activeRoutine = habitStore((s) => s.activeRoutine);
  const isRoutineDismissed = habitStore((s) => s.isDismissed);
  const isRoutineApplied = habitStore((s) => s.isApplied);
  const evaluateCurrentRoutine = habitStore((s) => s.evaluateCurrentRoutine);
  const applyRoutineAction = habitStore((s) => s.applyRoutine);
  const dismissRoutineAction = habitStore((s) => s.dismissRoutine);

  // Re-evaluate routine on mount or device switch
  useEffect(() => {
    evaluateCurrentRoutine(activeDeviceAddress || undefined);
  }, [activeDeviceAddress, evaluateCurrentRoutine]);

  // Live timer tick to update current listening duration every 1 second while listening
  const [, setTick] = useState(0);
  const isAnyListening = trackedDevices.some(
    (dev) => statsMap[dev.address.toUpperCase()]?.sessionStartTimestamp !== null
  );

  useEffect(() => {
    if (!isAnyListening) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isAnyListening]);

  let todayListeningSeconds = 0;
  trackedDevices.forEach((dev) => {
    const s = getDeviceStats(dev.address);
    todayListeningSeconds += s.todaySeconds;
  });

  // Foreground Service State
  const [isServiceActive, setIsServiceActive] = useState(false);
  const [isServiceLoading, setIsServiceLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      setIsServiceActive(isDeviceWatcherServiceRunning());
    }
  }, []);

  const handleToggleService = async () => {
    if (Platform.OS !== 'android') return;

    setIsServiceLoading(true);
    try {
      if (!isServiceActive) {
        await requestNotificationPermission();
        const success = await startDeviceWatcherService();
        setIsServiceActive(success);
        showToast(success ? 'Watcher daemon active' : 'Failed to start service');
      } else {
        const success = await stopDeviceWatcherService();
        setIsServiceActive(!success);
        showToast(success ? 'Watcher daemon stopped' : 'Failed to stop service');
      }
    } catch (e) {
      safeLog.error('[HomeScreen] Error toggling foreground service:', e);
    } finally {
      setIsServiceLoading(false);
    }
  };

  const connectedCount = trackedDevices.filter((d) => d.isConnected).length;

  // Active / Hero Device
  const activeDevice =
    trackedDevices.find((d) => d.address === activeDeviceAddress) ||
    trackedDevices.find((d) => d.isConnected) ||
    trackedDevices[0];

  const isConnected = Boolean(activeDevice?.isConnected);

  const formatLastSeen = (dev: TrackedDevice) => {
    if (dev.isConnected) return 'Active Now';
    const ts = dev.lastDisconnectedAt || dev.lastLocation?.timestamp;
    if (!ts) return 'Offline';
    const diffMin = Math.round((Date.now() - ts) / 60000);
    if (diffMin < 1) return 'Seen just now';
    if (diffMin < 60) return `Seen ${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Seen ${diffHours}h ago`;
    return `Seen ${Math.floor(diffHours / 24)}d ago`;
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
            EarbudKit is designed for Android using standard Bluetooth and Audio APIs.
          </Text>
        </GlassCard>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FeedbackToast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + (isConnected ? 140 : 80),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Editorial Header Block */}
        <View style={styles.topHeader}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.onSurface, fontFamily: fonts.display }]}>
              Home
            </Text>
          </View>
          <View style={styles.topHeaderActions}>
            {/* Live Watcher Pill */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleToggleService}
              disabled={isServiceLoading}
              style={[
                styles.watcherPill,
                {
                  backgroundColor: colors.surfaceContainerHigh,
                  borderColor: colors.hairline,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isServiceActive ? '#34C759' : colors.outline,
                  },
                ]}
              />
              <Text style={[styles.watcherText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                {isServiceActive ? 'Watcher: ON' : 'Watcher: OFF'}
              </Text>
            </TouchableOpacity>

            {/* Quick Theme Switch Pill */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setThemeMode(theme.dark ? 'light' : 'dark')}
              style={[
                styles.iconButton,
                {
                  backgroundColor: colors.surfaceContainerHigh,
                  borderColor: colors.hairline,
                },
              ]}
            >
              <Ionicons
                name={theme.dark ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={colors.onSurface}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero "Now Connected" Showcase Card */}
        {activeDevice ? (
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.hairline,
                borderRadius: borderRadius.lg,
              },
            ]}
          >
            {/* Ambient Dynamic Backglow Mesh */}
            <View
              pointerEvents="none"
              style={[
                styles.ambientMeshGlow,
                {
                  backgroundColor: colors.glassGlow,
                },
              ]}
            />

            <View style={styles.heroContent}>
              {/* Top Row: Chips, Titles & Circular Battery Ring */}
              <View style={styles.heroTopRow}>
                <View style={styles.heroTitlesCol}>
                  <View style={styles.badgesRow}>
                    <View
                      style={[
                        styles.connectedChip,
                        {
                          backgroundColor: activeDevice.isConnected
                            ? 'rgba(52, 199, 89, 0.14)'
                            : colors.surfaceContainerHigh,
                          borderColor: activeDevice.isConnected
                            ? '#34C759'
                            : colors.hairline,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.chipDot,
                          {
                            backgroundColor: activeDevice.isConnected
                              ? '#34C759'
                              : colors.outline,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: activeDevice.isConnected
                              ? '#34C759'
                              : colors.onSurfaceVariant,
                            fontFamily: fonts.label,
                          },
                        ]}
                      >
                        {activeDevice.isConnected ? 'Connected' : 'Offline'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.codecChip,
                        {
                          backgroundColor: colors.surfaceContainerHigh,
                          borderColor: colors.hairline,
                        },
                      ]}
                    >
                      <Text style={[styles.codecText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                        {activeDevice.audioCodec || 'AAC'}
                      </Text>
                    </View>
                  </View>

                  <Text
                    numberOfLines={1}
                    style={[styles.heroDeviceName, { color: colors.onSurface, fontFamily: fonts.headline }]}
                  >
                    {activeDevice.nickname || activeDevice.name}
                  </Text>
                  <Text style={[styles.heroMac, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                    {activeDevice.address}
                  </Text>
                </View>

                {/* Battery Gauge Component with centered vector icon */}
                <View style={styles.heroBatteryWrapper}>
                  <BatteryRing
                    battery={activeDevice.batteryLevel}
                    size={64}
                    strokeWidth={6}
                    centerMode="icon"
                  />
                  <Text
                    style={[
                      styles.batteryTextUnder,
                      {
                        color: activeDevice.batteryLevel !== null ? colors.onSurface : colors.outline,
                        fontFamily: fonts.label,
                      },
                    ]}
                  >
                    {activeDevice.batteryLevel !== null ? `${activeDevice.batteryLevel}%` : 'Unavailable'}
                  </Text>
                </View>
              </View>

              {/* Minimalist Acoustic Hardware Centerpiece */}
              <View style={styles.artworkCenterpiece}>
                <View
                  style={[
                    styles.artworkCanvas,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderColor: colors.hairline,
                    },
                  ]}
                >
                  <Ionicons
                    name={activeDevice.icon === 'headphones' ? 'headset' : 'headset-outline'}
                    size={72}
                    color={colors.primary}
                  />
                  <View
                    style={[
                      styles.artworkTag,
                      {
                        backgroundColor: colors.surfaceContainerLowest,
                        borderColor: colors.hairline,
                      },
                    ]}
                  >
                    <Text style={[styles.artworkTagText, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                      {activeDevice.icon === 'headphones' ? 'Over-Ear • High Res' : 'In-Ear TWS • Low Latency'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons inside Hero */}
              <View style={styles.heroActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    useDeviceStore.getState().setConnectionState(
                      activeDevice.address,
                      !activeDevice.isConnected
                    );
                    showToast(activeDevice.isConnected ? 'Device disconnected' : 'Device connected');
                  }}
                  style={[
                    styles.heroSecondaryBtn,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderColor: colors.hairline,
                    },
                  ]}
                >
                  <Ionicons
                    name="power-outline"
                    size={18}
                    color={colors.onSurfaceVariant}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.heroBtnText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                    {activeDevice.isConnected ? 'Disconnect' : 'Connect'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)/tools')}
                  style={[
                    styles.heroPrimaryBtn,
                    {
                      backgroundColor: colors.primary,
                    },
                  ]}
                >
                  <Ionicons
                    name="options-outline"
                    size={18}
                    color={colors.onPrimary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.heroBtnText, { color: colors.onPrimary, fontFamily: fonts.label }]}>
                    Audio Controls
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <GlassCard style={{ padding: 24, alignItems: 'center' }}>
            <Ionicons name="headset-outline" size={44} color={colors.outline} />
            <Text style={[styles.emptyTitle, { color: colors.onSurface, fontFamily: fonts.headline, marginTop: 12 }]}>
              No Tracked Devices
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: colors.onSurfaceVariant, fontFamily: fonts.body, textAlign: 'center', marginBottom: 16 },
              ]}
            >
              Connect your Bluetooth audio gear or scan paired accessories in Devices.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <PillButton label="Go to Devices" size="sm" onPress={() => router.push('/(tabs)/devices' as any)} />
            </View>
          </GlassCard>
        )}

        {/* Smart Routine Capsule (Adaptive Context Engine / Smart Handshake) */}
        {activeRoutine && !isRoutineDismissed && (
          <View
            style={[
              styles.routineCard,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.hairline,
                borderRadius: borderRadius.lg,
              },
            ]}
          >
            <View style={styles.routineHeader}>
              <View style={styles.routineHeaderLeft}>
                <View
                  style={[
                    styles.routineIconBadge,
                    {
                      backgroundColor: colors.primaryContainer,
                    },
                  ]}
                >
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text
                    numberOfLines={1}
                    style={[styles.routineTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}
                  >
                    Smart Routine Detected
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.routineSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}
                  >
                    {activeRoutine.confidenceMatch}% Match • {activeRoutine.title}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.autoIqChip,
                  {
                    backgroundColor: colors.surfaceContainerHighest,
                  },
                ]}
              >
                <Text style={[styles.autoIqText, { color: colors.primary, fontFamily: fonts.label }]}>
                  AUTO-IQ
                </Text>
              </View>
            </View>

            <View style={styles.routineActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => dismissRoutineAction()}
                style={styles.routineDismissBtn}
              >
                <Text style={[styles.routineDismissText, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                  Dismiss
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={async () => {
                  await applyRoutineAction(activeDevice?.address);
                  showToast(`Applied ${activeRoutine.title} (${activeRoutine.targetVolume}% vol)`);
                }}
                disabled={isRoutineApplied}
                style={[
                  styles.routineApplyBtn,
                  {
                    backgroundColor: isRoutineApplied ? '#34C759' : colors.primary,
                  },
                ]}
              >
                <Ionicons
                  name={isRoutineApplied ? 'checkmark' : 'play'}
                  size={14}
                  color="#FFFFFF"
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.routineApplyText, { color: '#FFFFFF', fontFamily: fonts.label }]}>
                  {isRoutineApplied ? 'Applied' : 'Apply Routine'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Command Action Pills Shelf */}
        <View style={styles.quickActionsSection}>
          <Text style={[styles.sectionCaption, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
            QUICK ACTIONS
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPillsShelf}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                sleepTimer.startTimer(30);
                showToast('Started 30m Sleep Timer');
              }}
              style={[
                styles.quickPill,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.hairline,
                },
              ]}
            >
              <Ionicons name="timer-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.quickPillText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                Sleep 30m
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/tools')}
              style={[
                styles.quickPill,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.hairline,
                },
              ]}
            >
              <Ionicons name="options-outline" size={16} color={colors.onSurfaceVariant} style={{ marginRight: 6 }} />
              <Text style={[styles.quickPillText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                Equalizer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/tools')}
              style={[
                styles.quickPill,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.hairline,
                },
              ]}
            >
              <Ionicons name="navigate-outline" size={16} color={colors.onSurfaceVariant} style={{ marginRight: 6 }} />
              <Text style={[styles.quickPillText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                Find Device
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/auto')}
              style={[
                styles.quickPill,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.hairline,
                },
              ]}
            >
              <Ionicons name="flash-outline" size={16} color={colors.onSurfaceVariant} style={{ marginRight: 6 }} />
              <Text style={[styles.quickPillText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                Auto-Actions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/tools')}
              style={[
                styles.quickPill,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.hairline,
                },
              ]}
            >
              <Ionicons name="pulse-outline" size={16} color={colors.onSurfaceVariant} style={{ marginRight: 6 }} />
              <Text style={[styles.quickPillText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                Hearing Test
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Bento Metric Row: 2 Modular Tiles */}
        <View style={styles.bentoRow}>
          {/* Tile 1: Today's Listening */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/stats')}
            style={[
              styles.bentoTile,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.hairline,
                borderRadius: borderRadius.lg,
              },
            ]}
          >
            <View style={styles.bentoTileTop}>
              <View
                style={[
                  styles.bentoIconBadge,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                  },
                ]}
              >
                <Ionicons name="headset" size={15} color={colors.primary} />
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={[styles.bentoTileLabel, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                Today's Session
              </Text>
              <Text style={[styles.bentoTileValue, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                {formatDuration(todayListeningSeconds)}
              </Text>
            </View>

            {/* Sparkline Visualizer Bars */}
            <View style={styles.sparklineRow}>
              {[6, 12, 16, 22, 18, 14, 8].map((h, i) => (
                <View
                  key={i}
                  style={[
                    styles.sparklineBar,
                    {
                      height: h,
                      backgroundColor: i === 3 ? colors.primary : colors.surfaceContainerHighest,
                    },
                  ]}
                />
              ))}
            </View>
          </TouchableOpacity>

          {/* Tile 2: Tracked Devices Fleet */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/devices')}
            style={[
              styles.bentoTile,
              {
                backgroundColor: colors.surfaceContainer,
                borderColor: colors.hairline,
                borderRadius: borderRadius.lg,
              },
            ]}
          >
            <View style={styles.bentoTileTop}>
              <View
                style={[
                  styles.bentoIconBadge,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                  },
                ]}
              >
                <Ionicons name="hardware-chip-outline" size={15} color={colors.onSurfaceVariant} />
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={[styles.bentoTileLabel, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                Tracked Devices
              </Text>
              <Text style={[styles.bentoTileValue, { color: colors.onSurface, fontFamily: fonts.headline }]}>
                {trackedDevices.length} {trackedDevices.length === 1 ? 'Device' : 'Devices'}
              </Text>
            </View>

            <View style={styles.fleetTagsRow}>
              <View style={[styles.fleetTag, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Text style={[styles.fleetTagText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                  {connectedCount} Active
                </Text>
              </View>
              <View style={[styles.fleetTag, { backgroundColor: colors.surfaceContainerLowest }]}>
                <Text style={[styles.fleetTagText, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                  {trackedDevices.length - connectedCount} Paired
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Registered Fleet Shelf */}
        <View style={styles.fleetSection}>
          <View style={styles.fleetHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
              Registered Fleet
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/devices')}
              style={styles.manageLink}
            >
              <Text style={[styles.manageLinkText, { color: colors.primary, fontFamily: fonts.label }]}>
                Manage
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Horizontal Shelf Cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fleetShelf}>
            {trackedDevices.map((dev) => {
              const isItemActive = dev.address === activeDevice?.address;
              return (
                <TouchableOpacity
                  key={dev.address}
                  activeOpacity={0.8}
                  onPress={() => {
                    setActiveDevice(dev.address);
                    showToast(`Selected ${dev.nickname || dev.name}`);
                  }}
                  style={[
                    styles.fleetCard,
                    {
                      backgroundColor: colors.surfaceContainer,
                      borderColor: isItemActive ? colors.primary : colors.hairline,
                      borderRadius: borderRadius.lg,
                      opacity: dev.isConnected ? 1 : 0.75,
                    },
                  ]}
                >
                  <View style={styles.fleetCardTop}>
                    <View
                      style={[
                        styles.fleetStatusBadge,
                        {
                          backgroundColor: dev.isConnected
                            ? 'rgba(52, 199, 89, 0.16)'
                            : colors.surfaceContainerHighest,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.fleetStatusText,
                          {
                            color: dev.isConnected ? '#34C759' : colors.onSurfaceVariant,
                            fontFamily: fonts.label,
                          },
                        ]}
                      >
                        {formatLastSeen(dev)}
                      </Text>
                    </View>

                    <View style={styles.fleetBatteryRow}>
                      <Ionicons
                        name={dev.batteryLevel !== null && dev.batteryLevel <= 20 ? 'battery-dead' : 'battery-full'}
                        size={14}
                        color={dev.batteryLevel !== null && dev.batteryLevel <= 20 ? colors.error : '#34C759'}
                        style={{ marginRight: 2 }}
                      />
                      <Text style={[styles.fleetBatteryText, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                        {dev.batteryLevel !== null ? `${dev.batteryLevel}%` : 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.fleetThumbnail,
                      {
                        backgroundColor: colors.surfaceContainerHigh,
                        borderColor: colors.hairline,
                      },
                    ]}
                  >
                    <Ionicons
                      name={dev.icon === 'headphones' ? 'headset' : 'headset-outline'}
                      size={36}
                      color={isItemActive ? colors.primary : colors.onSurfaceVariant}
                    />
                  </View>

                  <View style={{ marginTop: 6 }}>
                    <Text
                      numberOfLines={1}
                      style={[styles.fleetCardTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}
                    >
                      {dev.nickname || dev.name}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.fleetCardSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}
                    >
                      {dev.icon === 'headphones' ? 'Over-Ear' : 'In-Ear TWS'} • {dev.audioCodec || 'AAC'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Add Device Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/devices')}
              style={[
                styles.addDeviceCard,
                {
                  backgroundColor: colors.surfaceContainerLow,
                  borderColor: colors.hairline,
                  borderRadius: borderRadius.lg,
                },
              ]}
            >
              <View
                style={[
                  styles.addIconCircle,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                  },
                ]}
              >
                <Ionicons name="add" size={24} color={colors.onSurface} />
              </View>
              <Text style={[styles.addCardTitle, { color: colors.onSurface, fontFamily: fonts.label }]}>
                Add Device
              </Text>
              <Text style={[styles.addCardSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                Pair or Scan
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Frosted Floating Mini-Player Bar (Sticky Above Global Bottom Navigation) */}
      {isConnected && activeDevice && (
        <View
          pointerEvents="box-none"
          style={[
            styles.miniPlayerDockWrapper,
            {
              bottom: insets.bottom + 76,
            },
          ]}
        >
          <View
            style={[
              styles.miniPlayerDock,
              {
                backgroundColor: theme.dark
                  ? 'rgba(28, 28, 30, 0.95)'
                  : 'rgba(255, 255, 255, 0.95)',
                borderColor: colors.hairline,
              },
            ]}
          >
            {/* Left: Device Avatar & Specs */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/devices')}
              style={styles.miniPlayerLeft}
            >
              <View
                style={[
                  styles.miniPlayerAvatar,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                  },
                ]}
              >
                <Ionicons
                  name={activeDevice.icon === 'headphones' ? 'headset' : 'headset-outline'}
                  size={18}
                  color={colors.primary}
                />
              </View>

              <View style={styles.miniPlayerTitles}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    numberOfLines={1}
                    style={[styles.miniPlayerDeviceName, { color: colors.onSurface, fontFamily: fonts.headline }]}
                  >
                    {activeDevice.nickname || activeDevice.name}
                  </Text>
                  <View style={styles.miniConnectedDot} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.miniPlayerMeta, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                    {activeDevice.batteryLevel !== null ? `${activeDevice.batteryLevel}%` : 'Unavailable'}
                  </Text>
                  <Text style={{ color: colors.outline, fontSize: 10 }}>•</Text>
                  <Text style={[styles.miniPlayerCodec, { color: colors.primary, fontFamily: fonts.label }]}>
                    {activeDevice.audioCodec || 'AAC'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Right: Quick Sleep Action & Media Controls */}
            <View style={styles.miniPlayerActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (sleepTimer.isActive) {
                    sleepTimer.cancelTimer();
                    showToast('Sleep timer cancelled');
                  } else {
                    sleepTimer.startTimer(30);
                    showToast('Sleep timer set for 30m');
                  }
                }}
                style={[
                  styles.miniTimerBtn,
                  {
                    backgroundColor: sleepTimer.isActive ? colors.primaryContainer : colors.surfaceContainerHigh,
                    borderColor: sleepTimer.isActive ? colors.primary : colors.hairline,
                  },
                ]}
              >
                <Ionicons
                  name="timer-outline"
                  size={14}
                  color={sleepTimer.isActive ? colors.primary : colors.onSurfaceVariant}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.miniTimerText,
                    {
                      color: sleepTimer.isActive ? colors.primary : colors.onSurface,
                      fontFamily: fonts.label,
                    },
                  ]}
                >
                  {sleepTimer.isActive ? `${Math.ceil(sleepTimer.remainingSeconds / 60)}m` : '30m'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  pauseMedia();
                  showToast('Playback paused');
                }}
                style={[
                  styles.miniMuteBtn,
                  {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Ionicons name="pause" size={16} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  topHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  watcherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 0.5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  watcherText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 20,
    borderWidth: 0.5,
    marginBottom: 16,
  },
  ambientMeshGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.25,
  },
  heroContent: {
    zIndex: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTitlesCol: {
    flex: 1,
    marginRight: 16,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  connectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 0.5,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  codecChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 0.5,
  },
  codecText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroDeviceName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heroMac: {
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  heroBatteryWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  batteryTextUnder: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  artworkCenterpiece: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  artworkCanvas: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  artworkTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  artworkTagText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  heroSecondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 9999,
    borderWidth: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPrimaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  heroBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  routineCard: {
    padding: 16,
    borderWidth: 0.5,
    marginBottom: 16,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routineIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  routineTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  routineSubtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  autoIqChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  autoIqText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  routineActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  routineDismissBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  routineDismissText: {
    fontSize: 14,
  },
  routineApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 9999,
  },
  routineApplyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickActionsSection: {
    marginBottom: 16,
  },
  sectionCaption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  quickPillsShelf: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 0.5,
  },
  quickPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  bentoTile: {
    flex: 1,
    padding: 16,
    borderWidth: 0.5,
    justifyContent: 'space-between',
    minHeight: 130,
  },
  bentoTileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bentoIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoTileLabel: {
    fontSize: 12,
  },
  bentoTileValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 24,
    marginTop: 10,
  },
  sparklineBar: {
    flex: 1,
    borderRadius: 2,
  },
  fleetTagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  fleetTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  fleetTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  fleetSection: {
    marginBottom: 24,
  },
  fleetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  manageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  manageLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fleetShelf: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  fleetCard: {
    width: 170,
    padding: 14,
    borderWidth: 0.5,
    justifyContent: 'space-between',
  },
  fleetCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fleetStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  fleetStatusText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  fleetBatteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fleetBatteryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fleetThumbnail: {
    height: 72,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  fleetCardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  fleetCardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  addDeviceCard: {
    width: 140,
    padding: 14,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  addCardTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  addCardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  miniPlayerDockWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 900,
  },
  miniPlayerDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '94%',
    maxWidth: 440,
    height: 54,
    borderRadius: 9999,
    borderWidth: 0.5,
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  miniPlayerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  miniPlayerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  miniPlayerTitles: {
    flex: 1,
  },
  miniPlayerDeviceName: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 120,
  },
  miniConnectedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#34C759',
    marginLeft: 5,
  },
  miniPlayerMeta: {
    fontSize: 11,
  },
  miniPlayerCodec: {
    fontSize: 11,
    fontWeight: '700',
  },
  miniPlayerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniTimerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 9999,
    borderWidth: 0.5,
  },
  miniTimerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  miniMuteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
