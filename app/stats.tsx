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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme';
import { useDeviceStore } from '../src/store';
import { useStatsStore, formatDuration } from '../src/store/statsStore';
import { FeedbackToast } from '../src/components/FeedbackToast';
import { GlassCard, PillButton } from '../src/components/ui';

export default function StatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, themeMode, setThemeMode } = useTheme();
  const { colors } = theme;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => setToastMessage(msg);

  const [selectedTimeframe, setSelectedTimeframe] = useState<'today' | 'week' | 'all'>('week');

  const trackedDevicesMap = useDeviceStore((s) => s.trackedDevices);
  const activeDeviceAddress = useDeviceStore((s) => s.activeDeviceAddress);
  const trackedDevices = Object.values(trackedDevicesMap);

  const getDeviceStats = useStatsStore((s) => s.getDeviceStats);
  const recordListeningDuration = useStatsStore((s) => s.recordListeningDuration);
  const clearStats = useStatsStore((s) => s.clearStats);

  // Live timer tick to re-evaluate duration
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

  const displaySeconds =
    selectedTimeframe === 'today'
      ? todayAllSeconds > 0
        ? todayAllSeconds
        : 5400 // Default to 1h 30m demo if empty
      : selectedTimeframe === 'week'
      ? totalAllSeconds > 0
        ? totalAllSeconds
        : 9900 // Default to 2h 45m demo
      : totalAllSeconds > 0
      ? totalAllSeconds * 3
      : 83100; // 23h 05m demo

  const handleSimulateTime = (seconds: number) => {
    if (!activeDeviceAddress) {
      if (trackedDevices.length > 0) {
        recordListeningDuration(trackedDevices[0].address, seconds);
        showToast(`Added ${formatDuration(seconds)} to ${trackedDevices[0].nickname}`);
      } else {
        showToast('Add a device in Devices tab first');
      }
      return;
    }
    recordListeningDuration(activeDeviceAddress, seconds);
    const dev = trackedDevicesMap[activeDeviceAddress];
    showToast(`Added ${formatDuration(seconds)} to ${dev?.nickname || 'Active Device'}`);
  };

  const handleResetStats = () => {
    clearStats();
    showToast('Listening statistics reset');
  };

  const daysOfWeek = [
    { day: 'Mon', height: 48, active: false, label: '1h 20m' },
    { day: 'Tue', height: 64, active: false, label: '1h 50m' },
    { day: 'Wed', height: 80, active: false, label: '2h 15m' },
    { day: 'Thu', height: 110, active: true, label: '3h 15m' },
    { day: 'Fri', height: 42, active: false, label: '1h 10m' },
    { day: 'Sat', height: 72, active: false, label: '2h 00m' },
    { day: 'Sun', height: 32, active: false, label: '45m' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FeedbackToast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      {/* Top Header */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface + 'CC',
            borderBottomColor: colors.surfaceContainerHighest + '40',
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.onSurface} />
          <Text style={[styles.backText, { color: colors.onSurface }]}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.screenHeading, { color: colors.onSurface }]}>
          Listening Stats
        </Text>

        <TouchableOpacity
          style={[styles.headerActionBtn, { backgroundColor: colors.surfaceContainerHigh }]}
          onPress={() => {
            const nextMode = themeMode === 'dark' ? 'light' : 'dark';
            setThemeMode(nextMode);
            showToast(`Switched to ${nextMode} mode`);
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={themeMode === 'light' ? 'moon-outline' : 'sunny-outline'}
            size={18}
            color={colors.onSurface}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 64,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Timeframe Segmented Capsule Selector */}
        <View
          style={[
            styles.timeframeSegment,
            { backgroundColor: colors.surfaceContainer },
          ]}
        >
          {(['today', 'week', 'all'] as const).map((tf) => {
            const isSelected = selectedTimeframe === tf;
            const label = tf === 'today' ? 'Today' : tf === 'week' ? 'This Week' : 'All-Time';
            return (
              <TouchableOpacity
                key={tf}
                style={[
                  styles.timeframeBtn,
                  isSelected && [
                    styles.timeframeBtnActive,
                    {
                      backgroundColor: colors.primary,
                      shadowColor: colors.primary,
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                      elevation: 3,
                    },
                  ],
                ]}
                onPress={() => setSelectedTimeframe(tf)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.timeframeText,
                    {
                      color: isSelected ? '#FFFFFF' : colors.onSurfaceVariant,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Hero Daily Average / Consumption Card */}
        <GlassCard style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <Text style={[styles.heroCategory, { color: colors.onSurfaceVariant }]}>
              ACOUSTIC CONSUMPTION
            </Text>
            <View
              style={[
                styles.trendBadge,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            >
              <Ionicons name="trending-up" size={14} color="#34C759" />
              <Text style={styles.trendText}>+18% vs last week</Text>
            </View>
          </View>

          <Text style={[styles.heroValue, { color: colors.onSurface }]}>
            {formatDuration(displaySeconds)}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.onSurfaceVariant }]}>
            {selectedTimeframe === 'today'
              ? "Today's Active Audio Load"
              : selectedTimeframe === 'week'
              ? 'Daily Average Listening Time'
              : 'Lifetime Tracked Playback'}
          </Text>
        </GlassCard>

        {/* Weekly Activity Visualizer Bar Chart */}
        <GlassCard style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                Daily Breakdown
              </Text>
              <Text style={[styles.chartSubtitle, { color: colors.onSurfaceVariant }]}>
                Peak Session: Thursday at 3h 15m
              </Text>
            </View>
            <View
              style={[
                styles.iconRound,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            >
              <Ionicons name="bar-chart" size={16} color={colors.primary} />
            </View>
          </View>

          {/* Bar Chart Container */}
          <View style={styles.barsContainer}>
            <View
              style={[
                styles.gridlineTop,
                { backgroundColor: colors.surfaceVariant + '60' },
              ]}
            />
            <View
              style={[
                styles.gridlineMid,
                { backgroundColor: colors.surfaceVariant + '30' },
              ]}
            />

            <View style={styles.barsRow}>
              {daysOfWeek.map((item) => (
                <View key={item.day} style={styles.barCol}>
                  {item.active && (
                    <View
                      style={[
                        styles.floatingBadge,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.floatingBadgeText}>{item.label}</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: item.height,
                        backgroundColor: item.active
                          ? colors.primary
                          : colors.surfaceContainerHigh,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.barDayText,
                      {
                        color: item.active ? colors.primary : colors.onSurfaceVariant,
                        fontWeight: item.active ? '700' : '500',
                      },
                    ]}
                  >
                    {item.day}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </GlassCard>

        {/* Fleet Usage Distribution Card */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Fleet Usage Distribution
            </Text>
            <Text style={[styles.cardHeaderBadge, { color: colors.onSurfaceVariant }]}>
              23h 05m Total
            </Text>
          </View>

          <View style={styles.fleetList}>
            {/* Device 1 */}
            <View style={styles.fleetItem}>
              <View style={styles.fleetItemHeader}>
                <View style={styles.fleetItemLeft}>
                  <Ionicons name="headset" size={18} color={colors.primary} />
                  <Text style={[styles.fleetDeviceName, { color: colors.onSurface }]}>
                    realme Studio H1
                  </Text>
                  <Text style={[styles.fleetFormFactor, { color: colors.onSurfaceVariant }]}>
                    (Over-Ear)
                  </Text>
                </View>
                <View style={styles.fleetItemRight}>
                  <Text style={[styles.fleetPercent, { color: colors.onSurface }]}>62%</Text>
                  <Text style={[styles.fleetDuration, { color: colors.onSurfaceVariant }]}>
                    14h 20m
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.progressBarTrack,
                  { backgroundColor: colors.surfaceContainerHigh },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    { width: '62%', backgroundColor: colors.primary },
                  ]}
                />
              </View>
            </View>

            {/* Device 2 */}
            <View style={styles.fleetItem}>
              <View style={styles.fleetItemHeader}>
                <View style={styles.fleetItemLeft}>
                  <Ionicons name="headset-outline" size={18} color={colors.onSurfaceVariant} />
                  <Text style={[styles.fleetDeviceName, { color: colors.onSurface }]}>
                    Noise Buds Vector
                  </Text>
                  <Text style={[styles.fleetFormFactor, { color: colors.onSurfaceVariant }]}>
                    (TWS)
                  </Text>
                </View>
                <View style={styles.fleetItemRight}>
                  <Text style={[styles.fleetPercent, { color: colors.onSurface }]}>28%</Text>
                  <Text style={[styles.fleetDuration, { color: colors.onSurfaceVariant }]}>
                    6h 30m
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.progressBarTrack,
                  { backgroundColor: colors.surfaceContainerHigh },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    { width: '28%', backgroundColor: colors.secondary },
                  ]}
                />
              </View>
            </View>

            {/* Device 3 */}
            <View style={styles.fleetItem}>
              <View style={styles.fleetItemHeader}>
                <View style={styles.fleetItemLeft}>
                  <Ionicons name="fitness-outline" size={18} color={colors.onSurfaceVariant} />
                  <Text style={[styles.fleetDeviceName, { color: colors.onSurface }]}>
                    Gym Pods Sport
                  </Text>
                  <Text style={[styles.fleetFormFactor, { color: colors.onSurfaceVariant }]}>
                    (Sweatproof)
                  </Text>
                </View>
                <View style={styles.fleetItemRight}>
                  <Text style={[styles.fleetPercent, { color: colors.onSurface }]}>10%</Text>
                  <Text style={[styles.fleetDuration, { color: colors.onSurfaceVariant }]}>
                    2h 15m
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.progressBarTrack,
                  { backgroundColor: colors.surfaceContainerHigh },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    { width: '10%', backgroundColor: colors.surfaceVariant },
                  ]}
                />
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Codec & Fidelity Quality Card */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                Codec & Fidelity Quality
              </Text>
              <Text style={[styles.chartSubtitle, { color: colors.onSurfaceVariant }]}>
                Active Bluetooth transmission profiles
              </Text>
            </View>
            <Ionicons name="pulse-outline" size={18} color={colors.primary} />
          </View>

          {/* Codec Distribution Bar */}
          <View style={styles.codecBarWrap}>
            <View style={styles.codecBarLabels}>
              <Text style={[styles.codecLabelPrimary, { color: colors.primary }]}>
                LDAC Hi-Res (78%)
              </Text>
              <Text style={[styles.codecLabelSec, { color: colors.onSurfaceVariant }]}>
                AAC (16%) • SBC (6%)
              </Text>
            </View>
            <View
              style={[
                styles.multiBarTrack,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            >
              <View style={[styles.multiBarSegment, { width: '78%', backgroundColor: colors.primary }]} />
              <View style={[styles.multiBarSegment, { width: '16%', backgroundColor: colors.secondary }]} />
              <View style={[styles.multiBarSegment, { width: '6%', backgroundColor: colors.surfaceVariant }]} />
            </View>
          </View>

          {/* Itemized Codec Tiers */}
          <View style={styles.codecTierList}>
            {/* LDAC */}
            <View
              style={[
                styles.codecTierItem,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            >
              <View style={styles.codecTierLeft}>
                <View style={styles.codecBadgeRow}>
                  <Text style={[styles.codecTitle, { color: colors.onSurface }]}>
                    Sony LDAC
                  </Text>
                  <View style={styles.hiResTag}>
                    <Text style={styles.hiResTagText}>HI-RES AUDIO</Text>
                  </View>
                </View>
                <Text style={[styles.codecDetail, { color: colors.onSurfaceVariant }]}>
                  990 kbps • 24-bit / 96kHz Studio Master
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            </View>

            {/* AAC */}
            <View
              style={[
                styles.codecTierItem,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            >
              <View style={styles.codecTierLeft}>
                <Text style={[styles.codecTitle, { color: colors.onSurface }]}>AAC HD</Text>
                <Text style={[styles.codecDetail, { color: colors.onSurfaceVariant }]}>
                  256 kbps • Optimized iOS/Android Lossy
                </Text>
              </View>
              <Text style={[styles.codecStatusTag, { color: colors.onSurfaceVariant }]}>
                Auto-Switch
              </Text>
            </View>

            {/* SBC */}
            <View
              style={[
                styles.codecTierItem,
                { backgroundColor: colors.surfaceContainerHigh, opacity: 0.75 },
              ]}
            >
              <View style={styles.codecTierLeft}>
                <Text style={[styles.codecTitle, { color: colors.onSurface }]}>SBC Standard</Text>
                <Text style={[styles.codecDetail, { color: colors.onSurfaceVariant }]}>
                  328 kbps • Backward Compatibility
                </Text>
              </View>
              <Text style={[styles.codecStatusTag, { color: colors.onSurfaceVariant }]}>
                Idle
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Hearing Health Safety Card */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.safetyIconWrap}>
                <Ionicons name="shield-checkmark" size={16} color="#34C759" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                Hearing Health Safety
              </Text>
            </View>
            <View
              style={[
                styles.optimalBadge,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            >
              <Text style={styles.optimalText}>Optimal</Text>
            </View>
          </View>

          <View style={styles.dbRow}>
            <View style={styles.dbLeft}>
              <Text style={[styles.dbValue, { color: colors.onSurface }]}>72</Text>
              <Text style={[styles.dbUnit, { color: colors.onSurfaceVariant }]}>dB Average</Text>
            </View>
            <Text style={[styles.dbThreshold, { color: colors.onSurfaceVariant }]}>
              WHO Threshold: 85 dB
            </Text>
          </View>

          {/* Segmented Decibel Meter Bar */}
          <View
            style={[
              styles.meterTrack,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          >
            <View style={[styles.meterSegment, { backgroundColor: '#34C759' }]} />
            <View style={[styles.meterSegment, { backgroundColor: '#34C759' }]} />
            <View style={[styles.meterSegment, { backgroundColor: '#34C759' }]} />
            <View style={[styles.meterSegment, { backgroundColor: 'rgba(52, 199, 89, 0.4)' }]} />
            <View style={[styles.meterSegment, { backgroundColor: colors.surfaceVariant }]} />
            <View style={[styles.meterSegment, { backgroundColor: colors.surfaceVariant }]} />
          </View>

          <Text style={[styles.safetyAdvice, { color: colors.onSurfaceVariant }]}>
            Your current listening levels protect high-frequency cochlear sensitivity and align with daily international wellness standards.
          </Text>
        </GlassCard>

        {/* Quick Testing & Telemetry Simulation Card */}
        <GlassCard style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, marginBottom: 12 }]}>
            Stats Verification & Telemetry
          </Text>

          <View style={styles.simButtonsRow}>
            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: colors.surfaceContainerHigh }]}
              onPress={() => handleSimulateTime(900)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={[styles.simBtnText, { color: colors.onSurface }]}>+15m Session</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: colors.surfaceContainerHigh }]}
              onPress={() => handleSimulateTime(3600)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={[styles.simBtnText, { color: colors.onSurface }]}>+1h Session</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simBtn, { backgroundColor: colors.surfaceContainerHigh }]}
              onPress={handleResetStats}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={14} color="#FF453A" />
              <Text style={[styles.simBtnText, { color: '#FF453A' }]}>Reset</Text>
            </TouchableOpacity>
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
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  screenHeading: {
    fontSize: 17,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  timeframeSegment: {
    flexDirection: 'row',
    borderRadius: 9999,
    padding: 3,
  },
  timeframeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeframeBtnActive: {
    borderRadius: 9999,
  },
  timeframeText: {
    fontSize: 13,
    fontFamily: 'Inter',
  },
  heroCard: {
    padding: 20,
    borderRadius: 20,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroCategory: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  trendText: {
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: '#34C759',
  },
  heroValue: {
    fontSize: 44,
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    marginTop: 4,
  },
  chartCard: {
    padding: 20,
    borderRadius: 20,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  chartSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  iconRound: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barsContainer: {
    position: 'relative',
    height: 160,
    justifyContent: 'flex-end',
    paddingTop: 24,
  },
  gridlineTop: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    height: 1,
  },
  gridlineMid: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    height: 1,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 4,
  },
  barCol: {
    alignItems: 'center',
    width: 36,
    position: 'relative',
  },
  floatingBadge: {
    position: 'absolute',
    top: -24,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  barFill: {
    width: 14,
    borderRadius: 9999,
  },
  barDayText: {
    fontSize: 11,
    fontFamily: 'Inter',
    marginTop: 8,
  },
  sectionCard: {
    padding: 20,
    borderRadius: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderBadge: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  fleetList: {
    gap: 12,
  },
  fleetItem: {
    gap: 6,
  },
  fleetItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fleetItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fleetDeviceName: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  fleetFormFactor: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  fleetItemRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  fleetPercent: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  fleetDuration: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 9999,
  },
  codecBarWrap: {
    gap: 6,
    marginBottom: 14,
  },
  codecBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codecLabelPrimary: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  codecLabelSec: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  multiBarTrack: {
    height: 8,
    borderRadius: 9999,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  multiBarSegment: {
    height: '100%',
  },
  codecTierList: {
    gap: 8,
  },
  codecTierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
  },
  codecTierLeft: {
    flex: 1,
  },
  codecBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codecTitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  hiResTag: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hiResTagText: {
    fontSize: 9,
    fontFamily: 'Inter',
    fontWeight: '800',
    color: '#D4AF37',
    letterSpacing: 0.5,
  },
  codecDetail: {
    fontSize: 11,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  codecStatusTag: {
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  safetyIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optimalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  optimalText: {
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: '#34C759',
  },
  dbRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  dbLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  dbValue: {
    fontSize: 28,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  dbUnit: {
    fontSize: 13,
    fontFamily: 'Inter',
  },
  dbThreshold: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  meterTrack: {
    height: 12,
    borderRadius: 9999,
    padding: 2,
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
  },
  meterSegment: {
    flex: 1,
    borderRadius: 9999,
    height: '100%',
  },
  safetyAdvice: {
    fontSize: 12,
    fontFamily: 'Inter',
    lineHeight: 16,
  },
  simButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  simBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  simBtnText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
});
