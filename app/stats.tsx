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
import { useTheme } from '../src/theme';
import { useDeviceStore, TrackedDevice } from '../src/store';
import { useStatsStore, formatDuration } from '../src/store/statsStore';
import { FeedbackToast } from '../src/components/FeedbackToast';
import {
  GlassCard,
  PillButton,
  StatusChip,
} from '../src/components/ui';

export default function StatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, fonts, borderRadius } = theme;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => setToastMessage(msg);

  const trackedDevicesMap = useDeviceStore((s) => s.trackedDevices);
  const activeDeviceAddress = useDeviceStore((s) => s.activeDeviceAddress);
  const trackedDevices = Object.values(trackedDevicesMap);

  const getDeviceStats = useStatsStore((s) => s.getDeviceStats);
  const recordListeningDuration = useStatsStore((s) => s.recordListeningDuration);
  const clearStats = useStatsStore((s) => s.clearStats);

  // Live timer tick to update current session duration every 1 second
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute aggregate metrics from real statsStore data
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
        return 'Sony LDAC • High-Res Audio (up to 990 kbps, 24-bit 96kHz)';
      case 'APTX HD':
        return 'Qualcomm aptX HD • High-Definition (24-bit 48kHz audio)';
      case 'APTX':
        return 'Qualcomm aptX • Low-latency 16-bit audio stream';
      case 'AAC':
        return 'Advanced Audio Coding • Standard high-fidelity stream';
      case 'SBC':
        return 'Subband Codec • Standard fallback Bluetooth audio';
      case 'LC3':
        return 'Low Complexity Communication Codec • Bluetooth LE Audio';
      default:
        return `${codec} audio stream`;
    }
  };

  const handleSimulateTime = (seconds: number) => {
    if (!activeDeviceAddress) {
      if (trackedDevices.length > 0) {
        recordListeningDuration(trackedDevices[0].address, seconds);
        showToast(`✓ Added ${formatDuration(seconds)} to ${trackedDevices[0].nickname}`);
      } else {
        showToast('Add a device first');
      }
      return;
    }
    recordListeningDuration(activeDeviceAddress, seconds);
    const dev = trackedDevicesMap[activeDeviceAddress];
    showToast(`✓ Added ${formatDuration(seconds)} to ${dev?.nickname || 'Active Device'}`);
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24 }]}>
        <GlassCard style={styles.platformCard}>
          <Text style={styles.largeEmoji}>🍎</Text>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Not Supported on iOS</Text>
          <Text style={[styles.bodyText, { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }]}>
            Listening statistics and Bluetooth audio codec inspection require Android system APIs.
          </Text>
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
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Row with Back button */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surfaceContainerHigh }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={[styles.backBtnText, { color: colors.onSurface }]}>← Back</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Listening Stats</Text>
            <Text style={[styles.headerSubtitle, { color: colors.onSurfaceVariant }]}>
              Daily session load & codec introspection
            </Text>
          </View>

          <StatusChip
            label="REAL TELEMETRY"
            dotColor="lime"
            pulse
          />
        </View>

        {/* Huge Today's-Total Bento Hero Card */}
        <GlassCard glow style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={[styles.heroSublabel, { color: colors.tertiary }]}>
                TODAY'S AUDIO LOAD
              </Text>
              <Text style={[styles.heroMainNumber, { color: colors.onSurface }]}>
                {formatDuration(todayAllSeconds)}
              </Text>
            </View>

            <View style={[styles.sessionBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.sessionBadgeText, { color: colors.primary }]}>
                {totalAllSessions} SESSIONS
              </Text>
            </View>
          </View>

          <Text style={[styles.totalAllSubtitle, { color: colors.onSurfaceVariant }]}>
            Total Lifetime: <Text style={{ color: colors.primary, fontWeight: '700' }}>{formatDuration(totalAllSeconds)}</Text> across all registered kits.
          </Text>

          {/* Dynamic Audio Waveform Visualizer Bars */}
          <View style={styles.waveformContainer}>
            {[42, 68, 92, 54, 86, 32, 74].map((height, i) => (
              <View
                key={i}
                style={[
                  styles.waveformBar,
                  {
                    height: `${height}%`,
                    backgroundColor: i % 2 === 0 ? colors.primary : colors.tertiary,
                  },
                ]}
              />
            ))}
          </View>
        </GlassCard>

        {/* Per-Device Breakdown Stack */}
        <View style={styles.breakdownSection}>
          <Text style={[styles.sectionHeading, { color: colors.outline }]}>
            DEVICE BREAKDOWN & CODECS
          </Text>

          {trackedDevices.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Text style={{ fontSize: 32 }}>🎧</Text>
              <Text style={[styles.emptyCardTitle, { color: colors.onSurface }]}>
                No Tracked Devices
              </Text>
              <Text style={[styles.bodyText, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
                Connect or track headphones on the Devices screen to record sessions.
              </Text>
            </GlassCard>
          ) : (
            trackedDevices.map((dev) => {
              const devStats = getDeviceStats(dev.address);
              const isActive = dev.address === activeDeviceAddress;
              const ratio = totalAllSeconds > 0
                ? Math.min(100, Math.round((devStats.totalSeconds / totalAllSeconds) * 100))
                : 0;

              return (
                <GlassCard key={dev.address} glow={isActive} style={styles.deviceStatCard}>
                  {/* Device Header */}
                  <View style={styles.devHeaderRow}>
                    <View style={[styles.devAvatar, { backgroundColor: colors.surfaceContainerHigh }]}>
                      <Text style={{ fontSize: 20 }}>
                        {dev.icon === 'headphones' ? '🎧' : '🎧'}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.devTitleRow}>
                        <Text style={[styles.devNickname, { color: colors.onSurface }]}>
                          {dev.nickname}
                        </Text>
                        {isActive && (
                          <View style={[styles.activeTag, { backgroundColor: colors.primary + '30' }]}>
                            <Text style={[styles.activeTagText, { color: colors.primary }]}>
                              ACTIVE
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.devMac, { color: colors.outline }]}>
                        {dev.address}
                      </Text>
                    </View>

                    {dev.audioCodec && (
                      <View style={[styles.codecPill, { backgroundColor: colors.primaryContainer }]}>
                        <Text style={[styles.codecPillText, { color: colors.onPrimaryContainer }]}>
                          {dev.audioCodec}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Device Duration Metrics */}
                  <View style={styles.metricsGrid}>
                    <View style={[styles.metricCell, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
                      <Text style={[styles.metricCellLabel, { color: colors.outline }]}>TODAY</Text>
                      <Text style={[styles.metricCellValue, { color: colors.tertiary }]}>
                        {formatDuration(devStats.todaySeconds)}
                      </Text>
                    </View>

                    <View style={[styles.metricCell, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
                      <Text style={[styles.metricCellLabel, { color: colors.outline }]}>TOTAL</Text>
                      <Text style={[styles.metricCellValue, { color: colors.primary }]}>
                        {formatDuration(devStats.totalSeconds)}
                      </Text>
                    </View>

                    <View style={[styles.metricCell, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
                      <Text style={[styles.metricCellLabel, { color: colors.outline }]}>SESSIONS</Text>
                      <Text style={[styles.metricCellValue, { color: colors.secondary }]}>
                        {devStats.sessionCount}
                      </Text>
                    </View>
                  </View>

                  {/* Load Share Bar */}
                  <View style={styles.loadShareContainer}>
                    <View style={[styles.loadShareTrack, { backgroundColor: colors.surfaceContainerHigh }]}>
                      <View
                        style={[
                          styles.loadShareFill,
                          {
                            width: `${ratio}%`,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.loadShareText, { color: colors.onSurfaceVariant }]}>
                      {ratio}% of total fleet listening
                    </Text>
                  </View>

                  {/* Codec Details Pod */}
                  <View style={[styles.codecPod, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
                    <Text style={{ fontSize: 16 }}>📡</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.codecPodTitle, { color: colors.onSurface }]}>
                        Active Codec: {dev.audioCodec || 'Unknown'}
                      </Text>
                      <Text style={[styles.codecPodDesc, { color: colors.onSurfaceVariant }]}>
                        {getCodecExplanation(dev.audioCodec)}
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              );
            })
          )}
        </View>

        {/* Telemetry Simulator / Verification Controls */}
        <GlassCard style={styles.simulationCard}>
          <Text style={[styles.simTitle, { color: colors.onSurface }]}>
            Telemetry Test Controls
          </Text>
          <Text style={[styles.simDesc, { color: colors.onSurfaceVariant }]}>
            Simulate audio playback time to verify store persistence and live calculation:
          </Text>

          <View style={styles.simButtonsRow}>
            <PillButton
              variant="secondary"
              size="sm"
              label="+15m Test"
              onPress={() => handleSimulateTime(900)}
            />
            <PillButton
              variant="secondary"
              size="sm"
              label="+1h Test"
              onPress={() => handleSimulateTime(3600)}
            />
            <PillButton
              variant="danger"
              size="sm"
              label="Reset Stats"
              onPress={() => {
                clearStats();
                showToast('Cleared listening statistics');
              }}
            />
          </View>
        </GlassCard>
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
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  backBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 20,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 1,
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
    fontSize: 13,
    lineHeight: 18,
  },
  heroCard: {
    padding: 20,
    gap: 12,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroSublabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  heroMainNumber: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 42,
    letterSpacing: -1.5,
    lineHeight: 48,
    marginTop: 4,
  },
  sessionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  sessionBadgeText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  totalAllSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 48,
    paddingTop: 8,
  },
  waveformBar: {
    width: '12%',
    borderRadius: 4,
  },
  breakdownSection: {
    gap: 12,
  },
  sectionHeading: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyCardTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
  },
  deviceStatCard: {
    padding: 16,
    gap: 14,
  },
  devHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  devAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  devNickname: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
  },
  activeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeTagText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  devMac: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  codecPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  codecPillText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCell: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricCellLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  metricCellValue: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    marginTop: 2,
  },
  loadShareContainer: {
    gap: 4,
  },
  loadShareTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  loadShareFill: {
    height: '100%',
    borderRadius: 3,
  },
  loadShareText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    textAlign: 'right',
  },
  codecPod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
  },
  codecPodTitle: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
  },
  codecPodDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  simulationCard: {
    padding: 16,
    gap: 10,
  },
  simTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
  },
  simDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  simButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
});
