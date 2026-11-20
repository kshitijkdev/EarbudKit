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
import { useTheme } from '../src/theme';
import { useDeviceStore, TrackedDevice } from '../src/store';
import { useStatsStore, formatDuration } from '../src/store/statsStore';

export default function StatsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { colors, borderRadius } = theme;

  const trackedDevicesMap = useDeviceStore((s) => s.trackedDevices);
  const trackedDevices = Object.values(trackedDevicesMap);

  const getDeviceStats = useStatsStore((s) => s.getDeviceStats);
  const recordListeningDuration = useStatsStore((s) => s.recordListeningDuration);
  const clearStats = useStatsStore((s) => s.clearStats);

  // Live timer tick to update current session duration every 5 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Compute aggregate metrics
  let totalAllSeconds = 0;
  let todayAllSeconds = 0;
  let totalAllSessions = 0;

  trackedDevices.forEach((dev) => {
    const s = getDeviceStats(dev.address);
    totalAllSeconds += s.totalSeconds;
    todayAllSeconds += s.todaySeconds;
    totalAllSessions += s.sessionCount;
  });

  const getCodecExplanation = (codec?: string | null) => {
    if (!codec || codec === 'Unknown') {
      return 'Codec unreadable or device not connected';
    }
    switch (codec.toUpperCase()) {
      case 'LDAC':
        return 'Sony LDAC • High-Res Audio (up to 990 kbps)';
      case 'APTX HD':
        return 'Qualcomm aptX HD • 24-bit 48kHz audio';
      case 'APTX':
        return 'Qualcomm aptX • Low-latency 16-bit audio';
      case 'AAC':
        return 'Advanced Audio Coding • Standard high quality';
      case 'SBC':
        return 'Subband Codec • Standard Bluetooth audio';
      case 'LC3':
        return 'Low Complexity Communication Codec • Bluetooth LE Audio';
      default:
        return `${codec} audio stream`;
    }
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: 16 }]}>
        <View style={[styles.emptyCard, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
          <Text style={styles.emptyEmoji}>🍎</Text>
          <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Not supported on iOS</Text>
          <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
            Listening statistics and Bluetooth audio codec inspection require Android system APIs.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Top Header Row with Back button */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[
            styles.backBtn,
            {
              backgroundColor: colors.surfaceContainer,
              borderRadius: borderRadius.sm,
            },
          ]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backBtnText, { color: colors.onSurface }]}>
            ← Back
          </Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.onSurface }]}>
          Listening Stats
        </Text>
      </View>

      {/* Aggregate Overview Card */}
      <View
        style={[
          styles.overviewCard,
          {
            backgroundColor: colors.primaryContainer,
            borderRadius: borderRadius.lg,
          },
        ]}
      >
        <Text
          style={[
            styles.overviewLabel,
            { color: colors.onPrimaryContainer },
          ]}
        >
          Total Listening Time
        </Text>
        <Text
          style={[
            styles.overviewValue,
            { color: colors.onPrimaryContainer },
          ]}
        >
          {formatDuration(totalAllSeconds)}
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text
              style={[
                styles.metricItemLabel,
                { color: colors.onPrimaryContainer },
              ]}
            >
              Today
            </Text>
            <Text
              style={[
                styles.metricItemValue,
                { color: colors.onPrimaryContainer },
              ]}
            >
              {formatDuration(todayAllSeconds)}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text
              style={[
                styles.metricItemLabel,
                { color: colors.onPrimaryContainer },
              ]}
            >
              Sessions
            </Text>
            <Text
              style={[
                styles.metricItemValue,
                { color: colors.onPrimaryContainer },
              ]}
            >
              {totalAllSessions}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text
              style={[
                styles.metricItemLabel,
                { color: colors.onPrimaryContainer },
              ]}
            >
              Tracked Devices
            </Text>
            <Text
              style={[
                styles.metricItemValue,
                { color: colors.onPrimaryContainer },
              ]}
            >
              {trackedDevices.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Per-Device Breakdown */}
      <Text style={[styles.sectionHeading, { color: colors.onSurfaceVariant }]}>
        Device Breakdown
      </Text>

      {trackedDevices.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
            No devices tracked
          </Text>
          <Text
            style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}
          >
            Add a device in the Devices tab to start recording listening statistics.
          </Text>
        </View>
      ) : (
        trackedDevices.map((dev: TrackedDevice) => {
          const stats = getDeviceStats(dev.address);
          const iconEmoji = dev.icon === 'headphones' ? '🎧' : '👂';
          const codecText = dev.audioCodec || 'Unknown';

          return (
            <View
              key={dev.address}
              style={[
                styles.deviceCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.outlineVariant,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.devNameGroup}>
                  <Text style={styles.devIcon}>{iconEmoji}</Text>
                  <View>
                    <Text
                      style={[styles.devNickname, { color: colors.onSurface }]}
                    >
                      {dev.nickname}
                    </Text>
                    <Text
                      style={[
                        styles.devName,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {dev.name}
                    </Text>
                  </View>
                </View>

                {/* Connection & Live Listening Badge */}
                {dev.isConnected ? (
                  <View
                    style={[
                      styles.liveBadge,
                      {
                        backgroundColor: colors.primaryContainer,
                        borderRadius: borderRadius.full,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.liveBadgeText,
                        { color: colors.onPrimaryContainer },
                      ]}
                    >
                      🟢 Connected
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.offlineBadge,
                      {
                        backgroundColor: colors.surfaceVariant,
                        borderRadius: borderRadius.full,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.offlineBadgeText,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      Disconnected
                    </Text>
                  </View>
                )}
              </View>

              {/* Active Audio Codec Banner */}
              <View
                style={[
                  styles.codecBanner,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderRadius: borderRadius.sm,
                  },
                ]}
              >
                <View style={styles.codecHeader}>
                  <Text style={styles.codecIcon}>🎵</Text>
                  <Text
                    style={[styles.codecLabel, { color: colors.onSurface }]}
                  >
                    Active Codec:
                  </Text>
                  <View
                    style={[
                      styles.codecTag,
                      {
                        backgroundColor:
                          codecText !== 'Unknown'
                            ? colors.primary
                            : colors.outlineVariant,
                        borderRadius: borderRadius.sm,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.codecTagText,
                        {
                          color:
                            codecText !== 'Unknown'
                              ? colors.onPrimary
                              : colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      {codecText}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.codecDescription,
                    { color: colors.onSurfaceVariant },
                  ]}
                >
                  {getCodecExplanation(codecText)}
                </Text>
              </View>

              {/* Stats Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.gridCell}>
                  <Text
                    style={[
                      styles.gridCellLabel,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Total Time
                  </Text>
                  <Text
                    style={[styles.gridCellValue, { color: colors.onSurface }]}
                  >
                    {stats.formattedTotal}
                  </Text>
                </View>

                <View style={styles.gridCell}>
                  <Text
                    style={[
                      styles.gridCellLabel,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Today
                  </Text>
                  <Text
                    style={[styles.gridCellValue, { color: colors.onSurface }]}
                  >
                    {stats.formattedToday}
                  </Text>
                </View>

                <View style={styles.gridCell}>
                  <Text
                    style={[
                      styles.gridCellLabel,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Sessions
                  </Text>
                  <Text
                    style={[styles.gridCellValue, { color: colors.onSurface }]}
                  >
                    {stats.sessionCount}
                  </Text>
                </View>
              </View>

              {/* Quick simulation buttons for testing */}
              <View style={styles.simActionsRow}>
                <TouchableOpacity
                  style={[
                    styles.simBtn,
                    {
                      backgroundColor: colors.surfaceContainer,
                      borderColor: colors.outlineVariant,
                      borderRadius: borderRadius.sm,
                    },
                  ]}
                  onPress={() => recordListeningDuration(dev.address, 1800)} // +30m
                >
                  <Text style={[styles.simBtnText, { color: colors.primary }]}>
                    +30m Test
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.simBtn,
                    {
                      backgroundColor: colors.surfaceContainer,
                      borderColor: colors.outlineVariant,
                      borderRadius: borderRadius.sm,
                    },
                  ]}
                  onPress={() => recordListeningDuration(dev.address, 3600)} // +1h
                >
                  <Text style={[styles.simBtnText, { color: colors.primary }]}>
                    +1h Test
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.simBtn,
                    {
                      backgroundColor: colors.surfaceContainer,
                      borderColor: colors.outlineVariant,
                      borderRadius: borderRadius.sm,
                    },
                  ]}
                  onPress={() => clearStats(dev.address)}
                >
                  <Text style={[styles.simBtnText, { color: colors.error }]}>
                    Reset
                  </Text>
                </TouchableOpacity>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  overviewCard: {
    padding: 20,
    marginBottom: 24,
  },
  overviewLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overviewValue: {
    fontSize: 36,
    fontWeight: '800',
    marginVertical: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricItemLabel: {
    fontSize: 11,
    opacity: 0.85,
  },
  metricItemValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  deviceCard: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  devNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  devIcon: {
    fontSize: 28,
  },
  devNickname: {
    fontSize: 16,
    fontWeight: '700',
  },
  devName: {
    fontSize: 12,
  },
  liveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  offlineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  offlineBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  codecBanner: {
    padding: 10,
    marginBottom: 12,
  },
  codecHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  codecIcon: {
    fontSize: 14,
  },
  codecLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  codecTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  codecTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  codecDescription: {
    fontSize: 11,
    marginLeft: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  gridCell: {
    flex: 1,
    alignItems: 'center',
  },
  gridCellLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  gridCellValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  simActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  simBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  simBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
