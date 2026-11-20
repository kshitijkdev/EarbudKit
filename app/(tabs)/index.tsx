import React, { useState, useEffect } from 'react';
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
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../src/theme';
import { useBluetoothDevices } from '../../src/features/devices/useBluetoothDevices';
import { useDeviceStore, TrackedDevice } from '../../src/store';
import { useStatsStore, formatDuration } from '../../src/store/statsStore';
import {
  startDeviceWatcherService,
  stopDeviceWatcherService,
  isDeviceWatcherServiceRunning,
  requestNotificationPermission,
} from '../../modules/earbud-native';
import { FeedbackToast } from '../../src/components/FeedbackToast';
import {
  GlassCard,
  PillButton,
  StatusChip,
  BatteryRing,
} from '../../src/components/ui';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, fonts, borderRadius } = theme;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => setToastMessage(msg);

  // Bluetooth & live events hook
  const { bluetoothEnabled, lastEvent } = useBluetoothDevices();

  // Tracked devices from Zustand persisted store
  const trackedDevicesMap = useDeviceStore((s) => s.trackedDevices);
  const activeDeviceAddress = useDeviceStore((s) => s.activeDeviceAddress);
  const setActiveDevice = useDeviceStore((s) => s.setActiveDevice);
  const addTrackedDevice = useDeviceStore((s) => s.addTrackedDevice);

  const trackedDevices = Object.values(trackedDevicesMap);

  // Stats from Zustand statsStore
  const statsMap = useStatsStore((s) => s.stats);
  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  })();

  let todayListeningSeconds = 0;
  let totalListeningSeconds = 0;
  let totalSessionCount = 0;
  Object.values(statsMap).forEach((st) => {
    todayListeningSeconds += st.dailySeconds?.[todayKey] ?? 0;
    totalListeningSeconds += st.totalSeconds ?? 0;
    totalSessionCount += st.sessionCount ?? 0;
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
        showToast(success ? '✓ Background Watcher active' : 'Failed to start service');
      } else {
        const success = await stopDeviceWatcherService();
        setIsServiceActive(!success);
        showToast(success ? 'Background Watcher stopped' : 'Failed to stop service');
      }
    } catch (e) {
      console.error('[HomeScreen] Error toggling foreground service:', e);
    } finally {
      setIsServiceLoading(false);
    }
  };

  const handleAddPreset = (type: 'noise' | 'realme') => {
    if (type === 'noise') {
      addTrackedDevice({
        name: 'Noise Buds Vector',
        address: '20:74:CF:89:12:01',
        nickname: 'Noise Buds Vector',
        icon: 'earbuds',
        isConnected: true,
        batteryLevel: 85,
        audioCodec: 'LDAC',
      });
      showToast('✓ Added Noise Buds Vector (85%)');
    } else {
      addTrackedDevice({
        name: 'realme TechLife Studio H1',
        address: 'D8:55:75:A4:77:88',
        nickname: 'realme Studio H1',
        icon: 'headphones',
        isConnected: true,
        batteryLevel: null,
        audioCodec: 'AAC',
      });
      showToast('✓ Added realme Studio H1 (Unavailable)');
    }
  };

  const connectedCount = trackedDevices.filter((d) => d.isConnected).length;
  const lowBatteryDevices = trackedDevices.filter(
    (d) => d.batteryLevel !== null && d.batteryLevel <= d.lowBatteryThreshold
  );

  // Active / Hero Device
  const activeDevice =
    trackedDevices.find((d) => d.address === activeDeviceAddress) ||
    trackedDevices.find((d) => d.isConnected) ||
    trackedDevices[0];

  const formatLastSeen = (dev: TrackedDevice) => {
    const ts = dev.lastDisconnectedAt || dev.lastLocation?.timestamp;
    if (!ts) return 'Standby';
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
          <Text style={styles.emptyEmoji}>🍎</Text>
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
      {/* Background Ambient Glow Pods */}
      <View
        pointerEvents="none"
        style={[
          styles.glowOrbTopLeft,
          { backgroundColor: theme.dark ? 'rgba(124, 92, 255, 0.12)' : 'rgba(94, 57, 224, 0.08)' },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glowOrbTopRight,
          { backgroundColor: theme.dark ? 'rgba(255, 79, 216, 0.10)' : 'rgba(175, 0, 147, 0.06)' },
        ]}
      />

      <FeedbackToast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 110,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Minimalist Top App Bar */}
        <View style={styles.topBar}>
          <StatusChip
            label={bluetoothEnabled ? 'BT ONLINE' : 'BT OFFLINE'}
            dotColor={bluetoothEnabled ? 'lime' : 'grey'}
            pulse={bluetoothEnabled}
          />
          <Text style={[styles.topBarTitle, { color: colors.onSurface, fontFamily: fonts.title }]}>
            EarbudKit
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/stats')}
            style={[
              styles.topIconBtn,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <Text style={{ fontSize: 14 }}>📊</Text>
          </TouchableOpacity>
        </View>

        {/* Greeting Row with Background Watcher Toggle Pill */}
        <View style={styles.greetingRow}>
          <View>
            <View style={styles.greetingTitleRow}>
              <Text style={[styles.greetingTitle, { color: colors.onSurface, fontFamily: fonts.display }]}>
                Hey Kshitij
              </Text>
              <Text style={styles.greetingWave}>👋</Text>
            </View>
            <View style={styles.audioEnvRow}>
              <Text style={[styles.greetingSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                {bluetoothEnabled ? 'Audio environment active' : 'Bluetooth radio offline'}
              </Text>
              <View
                style={[
                  styles.microDot,
                  { backgroundColor: bluetoothEnabled ? colors.tertiary : colors.error },
                ]}
              />
            </View>
          </View>

          {/* Interactive Background Watcher Toggle Chip */}
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={isServiceLoading}
            onPress={handleToggleService}
            style={[
              styles.watcherChip,
              {
                backgroundColor: isServiceActive
                  ? theme.dark
                    ? 'rgba(198, 255, 61, 0.18)'
                    : 'rgba(0, 105, 71, 0.12)'
                  : colors.surfaceContainerHigh,
                borderColor: isServiceActive ? colors.tertiary : colors.outlineVariant,
              },
            ]}
          >
            <View
              style={[
                styles.microDot,
                { backgroundColor: isServiceActive ? colors.tertiary : colors.outline },
              ]}
            />
            <Text
              style={[
                styles.watcherChipText,
                {
                  color: isServiceActive ? colors.tertiary : colors.onSurfaceVariant,
                  fontFamily: fonts.label,
                },
              ]}
            >
              WATCHER: {isServiceActive ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Low Battery Warning Banner */}
        {lowBatteryDevices.length > 0 && (
          <GlassCard style={[styles.lowBatteryCard, { borderColor: colors.error }]}>
            <Text style={[styles.lowBatteryText, { color: colors.error, fontFamily: fonts.label }]}>
              🪫 Low Battery: {lowBatteryDevices.map((d) => `${d.nickname} (${d.batteryLevel}%)`).join(', ')}. Charge soon!
            </Text>
          </GlassCard>
        )}

        {/* Live Bluetooth Event Banner */}
        {lastEvent && (
          <View
            style={[
              styles.eventBanner,
              {
                backgroundColor: lastEvent.connected
                  ? theme.dark
                    ? 'rgba(124, 92, 255, 0.20)'
                    : 'rgba(94, 57, 224, 0.12)'
                  : colors.surfaceContainer,
                borderColor: lastEvent.connected ? colors.primary : colors.outlineVariant,
              },
            ]}
          >
            <Text style={[styles.eventBannerText, { color: colors.onSurface, fontFamily: fonts.bodyMedium }]}>
              🔔 Live: {lastEvent.name || lastEvent.address} is {lastEvent.connected ? 'CONNECTED' : 'DISCONNECTED'}
            </Text>
          </View>
        )}

        {/* SECTION: Connected Device Hero Card (Level 2 Bento) */}
        {activeDevice ? (
          <GlassCard
            glow={activeDevice.isConnected}
            style={styles.heroCard}
          >
            {/* Ambient Reactive Highlights inside Hero Card */}
            <View
              pointerEvents="none"
              style={[
                styles.heroGlowOrbRight,
                { backgroundColor: theme.dark ? 'rgba(124, 92, 255, 0.22)' : 'rgba(94, 57, 224, 0.12)' },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.heroGlowOrbLeft,
                { backgroundColor: theme.dark ? 'rgba(255, 79, 216, 0.16)' : 'rgba(175, 0, 147, 0.08)' },
              ]}
            />

            {/* Header: Daily Driver Tag + Connected & Codec Chips */}
            <View style={styles.heroHeader}>
              <View style={styles.heroHeaderLeft}>
                <View style={[styles.tagPill, { backgroundColor: colors.surfaceContainerHighest }]}>
                  <Text style={[styles.tagText, { color: colors.secondary, fontFamily: fonts.label }]}>
                    {activeDevice.icon === 'earbuds' ? 'TWS Earbuds 🎧' : 'Over-Ear Headphones 🎧'}
                  </Text>
                </View>
                <Text style={[styles.heroDeviceName, { color: colors.onSurface, fontFamily: fonts.display }]}>
                  {activeDevice.nickname}
                </Text>
                <Text style={[styles.heroDeviceSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                  {activeDevice.address}
                </Text>
              </View>

              <View style={styles.heroHeaderRight}>
                <StatusChip
                  label={activeDevice.isConnected ? 'CONNECTED' : 'STANDBY'}
                  dotColor={activeDevice.isConnected ? 'lime' : 'grey'}
                  pulse={activeDevice.isConnected}
                />
                <View style={[styles.codecPill, { backgroundColor: colors.surfaceContainerHighest }]}>
                  <Text style={[styles.codecPillText, { color: colors.primary, fontFamily: fonts.label }]}>
                    {activeDevice.isConnected ? (activeDevice.audioCodec || 'Unknown Codec') : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Center Visualizer & Device Silhouette */}
            <View style={styles.heroVisualContainer}>
              <View
                style={[
                  styles.haloRingOuter,
                  {
                    borderColor: activeDevice.isConnected
                      ? theme.dark
                        ? 'rgba(124, 92, 255, 0.45)'
                        : 'rgba(94, 57, 224, 0.35)'
                      : colors.outlineVariant,
                    shadowColor: colors.primary,
                  },
                ]}
              >
                <View style={[styles.haloRingInner, { backgroundColor: colors.surfaceContainerLowest }]}>
                  <Svg style={styles.absoluteFill} viewBox="0 0 100 100">
                    <Circle
                      cx="50"
                      cy="50"
                      r="44"
                      fill="none"
                      stroke={colors.primary}
                      strokeWidth="1.5"
                      strokeDasharray="4 6"
                      opacity={0.4}
                    />
                    <Circle
                      cx="50"
                      cy="50"
                      r="32"
                      fill="none"
                      stroke={colors.secondary}
                      strokeWidth="1"
                      strokeDasharray="3 5"
                      opacity={0.3}
                    />
                  </Svg>
                  <Text style={styles.heroCenterEmoji}>
                    {activeDevice.icon === 'earbuds' ? '🎧' : '🎧'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottom Telemetry Matrix (2 Pods) */}
            <View style={styles.heroTelemetryRow}>
              {/* Battery Cluster */}
              <View style={[styles.telemetryPod, { backgroundColor: colors.surfaceContainerHigh }]}>
                <BatteryRing
                  battery={activeDevice.batteryLevel}
                  size={46}
                />
                <View style={styles.telemetryTextCol}>
                  <View style={styles.telemetryValueRow}>
                    <Text style={[styles.telemetryNumber, { color: colors.onSurface, fontFamily: fonts.display }]}>
                      {activeDevice.batteryLevel !== null ? activeDevice.batteryLevel : '—'}
                    </Text>
                    {activeDevice.batteryLevel !== null && (
                      <Text style={[styles.telemetryUnit, { color: colors.tertiary, fontFamily: fonts.label }]}>
                        %
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.telemetryCaption, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                    {activeDevice.batteryLevel !== null
                      ? activeDevice.batteryLevel <= activeDevice.lowBatteryThreshold
                        ? 'Low Battery'
                        : 'Optimal'
                      : 'Unavailable'}
                  </Text>
                </View>
              </View>

              {/* Audio Stream Pod */}
              <View style={[styles.telemetryPod, { backgroundColor: colors.surfaceContainerHigh }]}>
                <View style={[styles.telemetryIconCircle, { backgroundColor: colors.surfaceContainerHighest }]}>
                  <Text style={{ fontSize: 18 }}>🎛️</Text>
                </View>
                <View style={styles.telemetryTextCol}>
                  <Text
                    numberOfLines={1}
                    style={[styles.telemetryNumberSmall, { color: colors.onSurface, fontFamily: fonts.display }]}
                  >
                    {activeDevice.isConnected ? (activeDevice.audioCodec || 'SBC') : 'Standby'}
                  </Text>
                  <Text style={[styles.telemetryCaption, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                    {activeDevice.isConnected ? 'Active Codec' : 'No Stream'}
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>
        ) : (
          <GlassCard style={styles.emptyHeroCard}>
            <Text style={{ fontSize: 44, marginBottom: 8 }}>🎧</Text>
            <Text style={[styles.emptyHeroTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
              No Tracked Devices
            </Text>
            <Text style={[styles.emptyHeroSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
              Add your wireless earbuds or headphones to start telemetry and auto-actions.
            </Text>
            <View style={styles.presetButtonsRow}>
              <PillButton
                label="+ Noise Buds Vector (85%)"
                variant="primary"
                onPress={() => handleAddPreset('noise')}
              />
              <PillButton
                label="+ realme Studio H1"
                variant="secondary"
                onPress={() => handleAddPreset('realme')}
              />
            </View>
          </GlassCard>
        )}

        {/* SECTION: Registered Fleet Carousel */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWithCount}>
            <Text style={[styles.sectionHeading, { color: colors.onSurface, fontFamily: fonts.title }]}>
              Registered Fleet
            </Text>
            <View style={[styles.countBadge, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Text style={[styles.countBadgeText, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                {trackedDevices.length}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/devices')}
            style={styles.manageLink}
          >
            <Text style={[styles.manageLinkText, { color: colors.primary, fontFamily: fonts.label }]}>
              Manage →
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.fleetCarouselContent}
          style={styles.fleetCarousel}
        >
          {trackedDevices.map((dev) => {
            const isTarget = dev.address === activeDeviceAddress;
            const isOffline = !dev.isConnected;

            return (
              <TouchableOpacity
                key={dev.address}
                activeOpacity={0.8}
                onPress={() => {
                  setActiveDevice(dev.address);
                  showToast(`✓ ${dev.nickname} set as Active Target`);
                }}
              >
                <GlassCard
                  active={isTarget}
                  glow={isTarget}
                  style={[
                    styles.fleetCard,
                    {
                      opacity: isOffline ? 0.75 : 1,
                      borderColor: isTarget ? colors.primary : colors.glassBorder,
                    },
                  ]}
                >
                  <View style={styles.fleetCardTop}>
                    <View style={[styles.fleetIconContainer, { backgroundColor: colors.surfaceContainerHigh }]}>
                      <Text style={{ fontSize: 18 }}>{dev.icon === 'earbuds' ? '🎧' : '🎧'}</Text>
                    </View>
                    <StatusChip
                      label={dev.isConnected ? 'ACTIVE' : 'OFFLINE'}
                      dotColor={dev.isConnected ? 'lime' : 'grey'}
                    />
                  </View>

                  <View style={styles.fleetCardBody}>
                    <Text
                      numberOfLines={1}
                      style={[styles.fleetDeviceName, { color: colors.onSurface, fontFamily: fonts.headline }]}
                    >
                      {dev.nickname}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.fleetDeviceSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}
                    >
                      {dev.isConnected ? 'Connected • Ready' : formatLastSeen(dev)}
                    </Text>
                  </View>

                  <View style={styles.fleetCardFooter}>
                    <View style={styles.fleetBatteryIndicator}>
                      <View
                        style={[
                          styles.fleetDot,
                          {
                            backgroundColor:
                              dev.batteryLevel !== null
                                ? dev.batteryLevel <= dev.lowBatteryThreshold
                                  ? colors.error
                                  : colors.tertiary
                                : colors.outline,
                          },
                        ]}
                      />
                      <Text style={[styles.fleetBatteryText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                        {dev.batteryLevel !== null ? `${dev.batteryLevel}%` : 'Unavailable'}
                      </Text>
                    </View>
                    <Text style={[styles.fleetTargetLabel, { color: isTarget ? colors.primary : colors.outline, fontFamily: fonts.label }]}>
                      {isTarget ? 'Target' : 'Select'}
                    </Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            );
          })}

          {/* Add Kit Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/devices')}
            style={[
              styles.addKitCard,
              {
                backgroundColor: colors.surfaceContainerLow,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <View style={[styles.addKitIconCircle, { backgroundColor: colors.surfaceContainerHighest }]}>
              <Text style={{ fontSize: 20, color: colors.onSurface }}>+</Text>
            </View>
            <Text style={[styles.addKitText, { color: colors.onSurface, fontFamily: fonts.label }]}>
              Add Kit
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* SECTION: Daily Session Load (Listening Stats) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/stats')}
          style={{ marginTop: 20 }}
        >
          <GlassCard style={styles.dailySessionCard}>
            <View style={styles.sessionHeaderRow}>
              <View style={styles.sessionTitleGroup}>
                <Text style={{ fontSize: 16 }}>⏱️</Text>
                <Text style={[styles.sessionSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                  DAILY SESSION LOAD
                </Text>
              </View>
              <View style={[styles.rangePill, { backgroundColor: theme.dark ? 'rgba(198, 255, 61, 0.18)' : 'rgba(0, 105, 71, 0.12)' }]}>
                <Text style={[styles.rangeText, { color: colors.tertiary, fontFamily: fonts.label }]}>
                  Optimal Range
                </Text>
              </View>
            </View>

            <View style={styles.sessionBodyRow}>
              <View>
                <Text style={[styles.sessionBigNumber, { color: colors.onSurface, fontFamily: fonts.display }]}>
                  {formatDuration(todayListeningSeconds)}
                </Text>
                <Text style={[styles.sessionDesc, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                  Total: {formatDuration(totalListeningSeconds)} • {totalSessionCount} sessions
                </Text>
              </View>

              {/* Waveform Graphic Bars */}
              <View style={styles.waveformContainer}>
                <View style={[styles.waveBar, { height: 16, backgroundColor: colors.tertiary }]} />
                <View style={[styles.waveBar, { height: 26, backgroundColor: colors.primary }]} />
                <View style={[styles.waveBar, { height: 34, backgroundColor: colors.secondary }]} />
                <View style={[styles.waveBar, { height: 22, backgroundColor: colors.primary }]} />
                <View style={[styles.waveBar, { height: 30, backgroundColor: colors.tertiary }]} />
                <View style={[styles.waveBar, { height: 18, backgroundColor: colors.primary }]} />
                <View style={[styles.waveBar, { height: 12, backgroundColor: colors.secondary }]} />
              </View>
            </View>
          </GlassCard>
        </TouchableOpacity>

        {/* SECTION: Diagnostics Bento Pods (Bluetooth & Fleet Count) */}
        <View style={styles.bentoRow}>
          {/* Bluetooth Diagnostics */}
          <GlassCard style={styles.bentoPod}>
            <View style={styles.bentoPodTop}>
              <Text style={{ fontSize: 20 }}>📶</Text>
              <View
                style={[
                  styles.statusBadgeSmall,
                  {
                    backgroundColor: bluetoothEnabled
                      ? theme.dark
                        ? 'rgba(198, 255, 61, 0.2)'
                        : 'rgba(0, 105, 71, 0.15)'
                      : colors.surfaceContainerHighest,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeSmallText,
                    {
                      color: bluetoothEnabled ? colors.tertiary : colors.outline,
                      fontFamily: fonts.label,
                    },
                  ]}
                >
                  {bluetoothEnabled ? 'ON' : 'OFF'}
                </Text>
              </View>
            </View>
            <View style={styles.bentoPodBody}>
              <Text style={[styles.bentoTitle, { color: colors.onSurface, fontFamily: fonts.display }]}>
                {bluetoothEnabled ? 'BT Active' : 'BT Disabled'}
              </Text>
              <Text style={[styles.bentoSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                LDAC / SBC / AAC
              </Text>
            </View>
          </GlassCard>

          {/* Fleet Live Count */}
          <GlassCard style={styles.bentoPod}>
            <View style={styles.bentoPodTop}>
              <Text style={{ fontSize: 20 }}>🛰️</Text>
              <View style={styles.liveIndicator}>
                <View style={[styles.microDot, { backgroundColor: colors.tertiary }]} />
                <Text style={[styles.liveText, { color: colors.tertiary, fontFamily: fonts.label }]}>
                  Live
                </Text>
              </View>
            </View>
            <View style={styles.bentoPodBody}>
              <View style={styles.fleetCountRow}>
                <Text style={[styles.bentoTitle, { color: colors.onSurface, fontFamily: fonts.display }]}>
                  {trackedDevices.length}
                </Text>
                <Text style={[styles.fleetKitsLabel, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                  kits
                </Text>
              </View>
              <Text style={[styles.bentoSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                {connectedCount} Active • {trackedDevices.length - connectedCount} Standby
              </Text>
            </View>
          </GlassCard>
        </View>

        {/* SECTION: Rapid Commands */}
        <View style={styles.rapidCommandsSection}>
          <Text style={[styles.rapidCommandsTitle, { color: colors.outline, fontFamily: fonts.label }]}>
            RAPID COMMANDS
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rapidCommandsContent}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/tools')}
              style={[styles.rapidChip, { backgroundColor: colors.surfaceContainerHigh }]}
            >
              <Text style={{ fontSize: 15 }}>🌙</Text>
              <Text style={[styles.rapidChipText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                Sleep Timer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/tools')}
              style={[styles.rapidChip, { backgroundColor: colors.surfaceContainerHigh }]}
            >
              <Text style={{ fontSize: 15 }}>📍</Text>
              <Text style={[styles.rapidChipText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                Find Device
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/tools')}
              style={[styles.rapidChip, { backgroundColor: colors.surfaceContainerHigh }]}
            >
              <Text style={{ fontSize: 15 }}>🎛️</Text>
              <Text style={[styles.rapidChipText, { color: colors.onSurface, fontFamily: fonts.label }]}>
                Equalizer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/auto')}
              style={[
                styles.rapidChip,
                {
                  backgroundColor: theme.dark
                    ? 'rgba(124, 92, 255, 0.20)'
                    : 'rgba(94, 57, 224, 0.12)',
                  borderColor: colors.primary,
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={{ fontSize: 15 }}>⚡</Text>
              <Text style={[styles.rapidChipText, { color: colors.primary, fontFamily: fonts.label }]}>
                Auto Actions
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  glowOrbTopLeft: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  glowOrbTopRight: {
    position: 'absolute',
    top: 80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  topIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  greetingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  greetingWave: {
    fontSize: 22,
  },
  audioEnvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  greetingSubtitle: {
    fontSize: 13,
  },
  microDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  watcherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 1,
  },
  watcherChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  lowBatteryCard: {
    padding: 12,
    marginBottom: 14,
  },
  lowBatteryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  eventBanner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  eventBannerText: {
    fontSize: 13,
  },
  heroCard: {
    padding: 18,
    marginBottom: 18,
    overflow: 'hidden',
  },
  heroGlowOrbRight: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  heroGlowOrbLeft: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroHeaderLeft: {
    flex: 1,
    paddingRight: 8,
  },
  heroHeaderRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  tagPill: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 9999,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroDeviceName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  heroDeviceSubtitle: {
    fontSize: 12,
  },
  codecPill: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 9999,
  },
  codecPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  heroVisualContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  haloRingOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  haloRingInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroCenterEmoji: {
    fontSize: 54,
  },
  heroTelemetryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  telemetryPod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
  },
  telemetryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryTextCol: {
    flex: 1,
  },
  telemetryValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  telemetryNumber: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  telemetryNumberSmall: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  telemetryUnit: {
    fontSize: 12,
    fontWeight: '700',
  },
  telemetryCaption: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyHeroCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyHeroTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyHeroSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
  },
  countBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 9999,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  manageLink: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  manageLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fleetCarousel: {
    marginHorizontal: -16,
  },
  fleetCarouselContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  fleetCard: {
    width: 220,
    padding: 14,
    justifyContent: 'space-between',
  },
  fleetCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fleetIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fleetCardBody: {
    marginVertical: 12,
  },
  fleetDeviceName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  fleetDeviceSubtitle: {
    fontSize: 12,
  },
  fleetCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  fleetBatteryIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fleetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  fleetBatteryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fleetTargetLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  addKitCard: {
    width: 110,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 8,
  },
  addKitIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addKitText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dailySessionCard: {
    padding: 18,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sessionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  rangePill: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 9999,
  },
  rangeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sessionBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sessionBigNumber: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 38,
  },
  sessionDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 36,
    paddingBottom: 2,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  bentoPod: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  bentoPodTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadgeSmall: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  statusBadgeSmallText: {
    fontSize: 10,
    fontWeight: '700',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bentoPodBody: {
    marginTop: 10,
  },
  bentoTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  bentoSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  fleetCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  fleetKitsLabel: {
    fontSize: 12,
  },
  rapidCommandsSection: {
    marginTop: 20,
  },
  rapidCommandsTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  rapidCommandsContent: {
    gap: 10,
  },
  rapidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 9999,
  },
  rapidChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
});
