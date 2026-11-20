import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { useBluetoothDevices } from '../../src/features/devices/useBluetoothDevices';
import { useDeviceStore, TrackedDevice } from '../../src/store';
import {
  startDeviceWatcherService,
  stopDeviceWatcherService,
  isDeviceWatcherServiceRunning,
  requestNotificationPermission,
} from '../../modules/earbud-native';

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { colors, borderRadius } = theme;

  // Bluetooth & live events hook
  const { bluetoothEnabled, lastEvent } = useBluetoothDevices();

  // Tracked devices from Zustand persisted store
  const trackedDevicesMap = useDeviceStore((s) => s.trackedDevices);
  const activeDeviceAddress = useDeviceStore((s) => s.activeDeviceAddress);
  const setActiveDevice = useDeviceStore((s) => s.setActiveDevice);
  const addTrackedDevice = useDeviceStore((s) => s.addTrackedDevice);

  const trackedDevices = Object.values(trackedDevicesMap);

  // Foreground Service State
  const [isServiceActive, setIsServiceActive] = useState(false);
  const [isServiceLoading, setIsServiceLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      setIsServiceActive(isDeviceWatcherServiceRunning());
    }
  }, []);

  const handleToggleService = async (value: boolean) => {
    if (Platform.OS !== 'android') return;

    setIsServiceLoading(true);
    try {
      if (value) {
        await requestNotificationPermission();
        const success = await startDeviceWatcherService();
        setIsServiceActive(success);
      } else {
        const success = await stopDeviceWatcherService();
        setIsServiceActive(!success);
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
        batteryLevel: 85, // 85% battery
        audioCodec: 'LDAC',
      });
    } else {
      addTrackedDevice({
        name: 'realme TechLife Studio H1',
        address: 'D8:55:75:A4:77:88',
        nickname: 'realme Studio H1',
        icon: 'headphones',
        isConnected: true,
        batteryLevel: null, // Shows "Unavailable" to verify null handling
        audioCodec: 'AAC',
      });
    }
  };

  const connectedCount = trackedDevices.filter((d) => d.isConnected).length;
  const lowBatteryDevices = trackedDevices.filter(
    (d) => d.batteryLevel !== null && d.batteryLevel <= d.lowBatteryThreshold
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Background Watcher Banner (Foreground Service) */}
      <View
        style={[
          styles.serviceCard,
          {
            backgroundColor: isServiceActive
              ? colors.primaryContainer
              : colors.surfaceContainer,
            borderRadius: borderRadius.lg,
            borderColor: isServiceActive ? colors.primary : colors.outlineVariant,
            borderWidth: 1,
          },
        ]}
      >
        <View style={styles.serviceRow}>
          <Text style={styles.serviceIcon}>{isServiceActive ? '🛡️' : '💤'}</Text>
          <View style={styles.serviceTextContainer}>
            <Text
              style={[
                styles.serviceTitle,
                {
                  color: isServiceActive
                    ? colors.onPrimaryContainer
                    : colors.onSurface,
                },
              ]}
            >
              Background Device Watcher
            </Text>
            <Text
              style={[
                styles.serviceDesc,
                {
                  color: isServiceActive
                    ? colors.onPrimaryContainer
                    : colors.onSurfaceVariant,
                },
              ]}
            >
              {isServiceActive
                ? 'Persistent notification active • Listening for connect/disconnect with screen off'
                : 'Keep EarbudKit active in background to trigger auto-actions'}
            </Text>
          </View>
          <Switch
            value={isServiceActive}
            onValueChange={handleToggleService}
            disabled={isServiceLoading || Platform.OS !== 'android'}
            thumbColor={isServiceActive ? colors.primary : colors.outline}
            trackColor={{
              false: colors.surfaceVariant,
              true: colors.primaryContainer,
            }}
          />
        </View>
      </View>

      {/* Low Battery Warning Banner */}
      {lowBatteryDevices.length > 0 && (
        <View
          style={[
            styles.eventBanner,
            {
              backgroundColor: colors.errorContainer,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text style={[styles.eventBannerText, { color: colors.onError }]}>
            🪫 Low Battery Alert: {lowBatteryDevices.map((d) => `${d.nickname} (${d.batteryLevel}%)`).join(', ')}. Please charge soon!
          </Text>
        </View>
      )}

      {/* Live Event Indicator */}
      {lastEvent && (
        <View
          style={[
            styles.eventBanner,
            {
              backgroundColor: lastEvent.connected
                ? colors.primaryContainer
                : colors.surfaceVariant,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text
            style={[
              styles.eventBannerText,
              {
                color: lastEvent.connected
                  ? colors.onPrimaryContainer
                  : colors.onSurfaceVariant,
              },
            ]}
          >
            🔔 Live: {lastEvent.name || lastEvent.address} is now{' '}
            {lastEvent.connected ? 'CONNECTED' : 'DISCONNECTED'}
          </Text>
        </View>
      )}

      {/* Overview Stats */}
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text style={[styles.statNumber, { color: colors.primary }]}>
            {connectedCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
            Connected Now
          </Text>
        </View>

        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text style={[styles.statNumber, { color: colors.onSurface }]}>
            {trackedDevices.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
            Total Tracked
          </Text>
        </View>

        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text
            style={[
              styles.statNumber,
              { color: bluetoothEnabled ? colors.success : colors.error },
            ]}
          >
            {bluetoothEnabled ? 'ON' : 'OFF'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
            Bluetooth
          </Text>
        </View>
      </View>

      {/* SECTION: Tracked Devices Cards */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
          Your Audio Devices
        </Text>
        <View style={styles.headerLinksRow}>
          <TouchableOpacity onPress={() => router.push('/stats')}>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              📊 Stats
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/devices')}>
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Manage →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {trackedDevices.length === 0 ? (
        <View
          style={[
            styles.emptyStateCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderRadius: borderRadius.lg,
            },
          ]}
        >
          <Text style={styles.emptyEmoji}>🎧</Text>
          <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
            No Devices Added Yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
            Pair your earbuds or headphones to configure auto-actions, sleep timers, and battery alerts.
          </Text>

          <View style={styles.presetButtonsRow}>
            <TouchableOpacity
              style={[
                styles.presetBtn,
                {
                  backgroundColor: colors.primaryContainer,
                  borderRadius: borderRadius.sm,
                },
              ]}
              onPress={() => handleAddPreset('noise')}
            >
              <Text style={[styles.presetBtnText, { color: colors.onPrimaryContainer }]}>
                + Noise Buds Vector (85%)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.presetBtn,
                {
                  backgroundColor: colors.secondaryContainer,
                  borderRadius: borderRadius.sm,
                },
              ]}
              onPress={() => handleAddPreset('realme')}
            >
              <Text style={[styles.presetBtnText, { color: colors.onSecondaryContainer }]}>
                + realme Studio H1 (Unavailable)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        trackedDevices.map((dev: TrackedDevice) => {
          const isActive = dev.address === activeDeviceAddress;
          const isLowBattery =
            dev.batteryLevel !== null && dev.batteryLevel <= dev.lowBatteryThreshold;

          return (
            <View
              key={dev.address}
              style={[
                styles.deviceCard,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderRadius: borderRadius.xl,
                  borderColor: dev.isConnected
                    ? colors.primary
                    : colors.outlineVariant,
                  borderWidth: dev.isConnected ? 2 : 1,
                },
              ]}
            >
              {/* Device Card Top */}
              <View style={styles.deviceCardTop}>
                <View style={styles.deviceHeaderLeft}>
                  <Text style={styles.deviceIcon}>
                    {dev.icon === 'earbuds' ? '🎧' : '🎧'}
                  </Text>
                  <View style={styles.deviceTitleGroup}>
                    <View style={styles.titleWithActiveBadge}>
                      <Text
                        style={[styles.deviceName, { color: colors.onSurface }]}
                      >
                        {dev.nickname}
                      </Text>
                      {isActive && (
                        <View
                          style={[
                            styles.activeBadge,
                            { backgroundColor: colors.primaryContainer },
                          ]}
                        >
                          <Text
                            style={[
                              styles.activeBadgeText,
                              { color: colors.onPrimaryContainer },
                            ]}
                          >
                            ACTIVE
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.deviceSubtitle,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {dev.name !== dev.nickname ? `${dev.name} • ` : ''}
                      {dev.address}
                    </Text>
                  </View>
                </View>

                {/* Connection Status Badge */}
                <View
                  style={[
                    styles.connectionBadge,
                    {
                      backgroundColor: dev.isConnected
                        ? colors.primaryContainer
                        : colors.surfaceVariant,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: dev.isConnected
                          ? colors.primary
                          : colors.outline,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.connectionBadgeText,
                      {
                        color: dev.isConnected
                          ? colors.onPrimaryContainer
                          : colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {dev.isConnected ? 'Connected' : 'Disconnected'}
                  </Text>
                </View>
              </View>

              {/* Device Quick Stats Row */}
              <View
                style={[
                  styles.deviceStatsRow,
                  { borderTopColor: colors.outlineVariant },
                ]}
              >
                {/* Battery Status */}
                <View style={styles.metricItem}>
                  <Text style={styles.metricEmoji}>
                    {isLowBattery
                      ? '🪫'
                      : dev.batteryLevel !== null
                      ? '🔋'
                      : '❓'}
                  </Text>
                  <View>
                    <Text
                      style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}
                    >
                      Battery
                    </Text>
                    {dev.batteryLevel !== null ? (
                      <View style={styles.batteryValueRow}>
                        <Text
                          style={[
                            styles.metricValue,
                            {
                              color: isLowBattery
                                ? colors.error
                                : colors.onSurface,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {dev.batteryLevel}%
                        </Text>
                        {isLowBattery && (
                          <Text style={[styles.lowBatteryWarn, { color: colors.error }]}>
                            Low
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.metricValue,
                          {
                            color: colors.onSurfaceVariant,
                            fontStyle: 'italic',
                          },
                        ]}
                      >
                        Unavailable
                      </Text>
                    )}
                  </View>
                </View>

                {/* Device Type */}
                <View style={styles.metricItem}>
                  <Text style={styles.metricEmoji}>
                    {dev.icon === 'earbuds' ? '👂' : '🎧'}
                  </Text>
                  <View>
                    <Text
                      style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}
                    >
                      Style
                    </Text>
                    <Text style={[styles.metricValue, { color: colors.onSurface }]}>
                      {dev.icon === 'earbuds' ? 'TWS Earbuds' : 'Over-Ear'}
                    </Text>
                  </View>
                </View>

                {/* Active Audio Codec */}
                <View style={styles.metricItem}>
                  <Text style={styles.metricEmoji}>🎵</Text>
                  <View>
                    <Text
                      style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}
                    >
                      Codec
                    </Text>
                    <Text
                      style={[
                        styles.metricValue,
                        {
                          color:
                            dev.audioCodec && dev.audioCodec !== 'Unknown'
                              ? colors.primary
                              : colors.onSurface,
                          fontWeight:
                            dev.audioCodec && dev.audioCodec !== 'Unknown'
                              ? '700'
                              : '500',
                        },
                      ]}
                    >
                      {dev.isConnected ? (dev.audioCodec || 'Unknown') : '—'}
                    </Text>
                  </View>
                </View>

                {/* Status action */}
                {!isActive ? (
                  <TouchableOpacity
                    style={[
                      styles.cardActionBtn,
                      { backgroundColor: colors.surface, borderRadius: borderRadius.sm },
                    ]}
                    onPress={() => setActiveDevice(dev.address)}
                  >
                    <Text
                      style={[styles.cardActionText, { color: colors.primary }]}
                    >
                      ★ Set Active
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[
                      styles.cardActiveIndicator,
                      { backgroundColor: colors.surface, borderRadius: borderRadius.sm },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cardActiveText,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      ✓ Selected Target
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })
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
  serviceCard: {
    padding: 16,
    marginBottom: 16,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceIcon: {
    fontSize: 28,
  },
  serviceTextContainer: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  serviceDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  eventBanner: {
    padding: 12,
    marginBottom: 14,
  },
  eventBannerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyStateCard: {
    padding: 28,
    alignItems: 'center',
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
  presetButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  presetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  presetBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deviceCard: {
    marginBottom: 14,
    overflow: 'hidden',
  },
  deviceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  deviceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceIcon: {
    fontSize: 34,
    marginRight: 12,
  },
  deviceTitleGroup: {
    flex: 1,
  },
  titleWithActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  deviceName: {
    fontSize: 17,
    fontWeight: '700',
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deviceSubtitle: {
    fontSize: 12,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deviceStatsRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricEmoji: {
    fontSize: 18,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  batteryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  lowBatteryWarn: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardActiveIndicator: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cardActiveText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
