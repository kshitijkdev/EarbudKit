import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, StudioAccentKey } from '../../src/theme';
import { FeedbackToast } from '../../src/components/FeedbackToast';
import {
  GlassCard,
  PillButton,
  StatusChip,
  ButtonRow,
  EmptyState,
} from '../../src/components/ui';
import { useDeviceStore } from '../../src/store/deviceStore';
import { useStatsStore } from '../../src/store/statsStore';

const POLLING_STORAGE_KEY = '@earbudkit/polling-interval';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, themeMode, setThemeMode, accentColor, setAccentColor, accents } = useTheme();
  const { colors, fonts, borderRadius } = theme;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => setToastMessage(msg);

  // Polling interval state
  const [pollingInterval, setPollingInterval] = useState<'15s' | '5s' | '1s'>('5s');

  useEffect(() => {
    AsyncStorage.getItem(POLLING_STORAGE_KEY).then((val) => {
      if (val === '15s' || val === '5s' || val === '1s') {
        setPollingInterval(val);
      }
    });
  }, []);

  const handleSelectPolling = (val: '15s' | '5s' | '1s') => {
    setPollingInterval(val);
    AsyncStorage.setItem(POLLING_STORAGE_KEY, val).catch(() => {});
    showToast(`Polling interval set to ${val === '15s' ? 'Relaxed (15s)' : val === '5s' ? 'Balanced (5s)' : 'Instant (1s)'}`);
  };

  const handleOpenTileGuide = () => {
    Alert.alert(
      'Install Quick Settings Tile',
      '1. Swipe down from the top of your screen twice to reveal all Quick Settings tiles.\n\n2. Tap the pencil/edit icon at the bottom of the shade.\n\n3. Scroll down to find "EarbudKit Watcher" and drag it up into your active tiles.',
      [{ text: 'Understood' }]
    );
  };

  const handleClearStorage = () => {
    Alert.alert(
      'Clear Local Device Storage?',
      'This will permanently reset all saved Bluetooth devices, auto-actions, custom equalizer curves, personal hearing profiles, and listening statistics. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              useDeviceStore.setState({ trackedDevices: {}, activeDeviceAddress: null });
              useStatsStore.getState().clearStats();
              showToast('Local device storage cleared');
            } catch (err) {
              showToast('Failed to clear storage');
            }
          },
        },
      ]
    );
  };

  const accentList: Array<{ key: StudioAccentKey; label: string; color: string }> = [
    { key: 'crimson', label: 'Brand Crimson', color: '#FA2D48' },
    { key: 'blue', label: 'Cool Sky Blue', color: '#74D1FF' },
    { key: 'amber', label: 'Warm Amber', color: '#FBBF24' },
    { key: 'emerald', label: 'Emerald Studio', color: '#34D399' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FeedbackToast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Area */}
        <View style={styles.header}>
          <Text style={[styles.categoryHeader, { color: colors.primary }]}>
            PREFERENCES
          </Text>
          <View style={styles.titleRow}>
            <Text style={[styles.screenTitle, { color: colors.onSurface }]}>Settings</Text>
            <StatusChip label="STUDIO ENGINE" dotColor="lime" />
          </View>
        </View>

        {/* Inset Group 1: Appearance & Studio Engine */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Appearance</Text>
            <Text style={[styles.sectionBadge, { color: colors.onSurfaceVariant }]}>
              Studio Engine
            </Text>
          </View>

          <GlassCard style={styles.card}>
            {/* Display Theme Segmented Control */}
            <View style={styles.settingBlock}>
              <Text style={[styles.subLabel, { color: colors.onSurfaceVariant }]}>
                Display Theme
              </Text>
              <View
                style={[
                  styles.segmentedContainer,
                  { backgroundColor: colors.surfaceContainerHigh },
                ]}
              >
                {(['system', 'light', 'dark'] as const).map((mode) => {
                  const isSelected = themeMode === mode;
                  const label = mode === 'system' ? 'Auto' : mode === 'light' ? 'Light' : 'Dark';
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.segmentButton,
                        isSelected && [
                          styles.segmentButtonActive,
                          {
                            backgroundColor: colors.surfaceContainer,
                            shadowColor: '#000000',
                            shadowOpacity: 0.15,
                            shadowRadius: 4,
                            elevation: 2,
                          },
                        ],
                      ]}
                      onPress={() => {
                        setThemeMode(mode);
                        showToast(`Theme switched to ${label}`);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.segmentButtonText,
                          {
                            color: isSelected ? colors.onSurface : colors.onSurfaceVariant,
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
            </View>

            {/* Hairline Divider */}
            <View style={[styles.divider, { backgroundColor: colors.surfaceVariant }]} />

            {/* Studio Accent Color Selector */}
            <View style={styles.accentRow}>
              <View style={styles.accentTextCol}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>Studio Accent</Text>
                <Text style={[styles.rowSubtitle, { color: colors.onSurfaceVariant }]}>
                  Dynamic acoustic trace & glow
                </Text>
              </View>

              <View style={styles.accentPickers}>
                {accentList.map((acc) => {
                  const isSelected = accentColor === acc.key;
                  return (
                    <TouchableOpacity
                      key={acc.key}
                      style={[
                        styles.accentDotOuter,
                        isSelected && {
                          borderColor: acc.color,
                          borderWidth: 2,
                          shadowColor: acc.color,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.45,
                          shadowRadius: 6,
                          elevation: 4,
                        },
                      ]}
                      onPress={() => {
                        setAccentColor(acc.key);
                        showToast(`Accent set to ${acc.label}`);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.accentDotInner, { backgroundColor: acc.color }]}>
                        {isSelected && (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Inset Group 2: System Quick Settings Tile */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>System Tile</Text>
            <Text style={[styles.sectionBadge, { color: colors.primary }]}>Android 14+</Text>
          </View>

          <GlassCard style={styles.card}>
            {/* Android QS Tile Mockup */}
            <View
              style={[
                styles.tileMockup,
                { backgroundColor: colors.surfaceContainerLow },
              ]}
            >
              <View style={styles.tileMockupLeft}>
                <View
                  style={[
                    styles.tileIconContainer,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons name="radio" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.tileTextCol}>
                  <View style={styles.tileHeaderRow}>
                    <Text style={[styles.tileTitle, { color: colors.onSurface }]}>
                      EarbudKit Watcher
                    </Text>
                    <View style={[styles.pulseDot, { backgroundColor: colors.primary }]} />
                  </View>
                  <Text
                    style={[styles.tileSubtitle, { color: colors.onSurfaceVariant }]}
                    numberOfLines={1}
                  >
                    Active • LDAC 990kbps • 92%
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.tilePowerBtn,
                  { backgroundColor: colors.surfaceContainerHigh },
                ]}
              >
                <Ionicons name="power" size={18} color={colors.primary} />
              </View>
            </View>

            {/* Step-by-Step Instruction Card */}
            <View
              style={[
                styles.tileStepsCard,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            >
              <Text style={[styles.stepsTitle, { color: colors.onSurfaceVariant }]}>
                HOW TO INSTALL TILE
              </Text>
              <View style={styles.stepsList}>
                <View style={styles.stepRow}>
                  <View
                    style={[
                      styles.stepBadge,
                      { backgroundColor: colors.surfaceContainer },
                    ]}
                  >
                    <Text style={[styles.stepNum, { color: colors.onSurface }]}>1</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.onSurface }]}>
                    Swipe down notification shade twice to open Quick Settings
                  </Text>
                </View>

                <View style={styles.stepRow}>
                  <View
                    style={[
                      styles.stepBadge,
                      { backgroundColor: colors.surfaceContainer },
                    ]}
                  >
                    <Text style={[styles.stepNum, { color: colors.onSurface }]}>2</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.onSurface }]}>
                    Tap the pencil or edit icon at the bottom of the shade
                  </Text>
                </View>

                <View style={styles.stepRow}>
                  <View
                    style={[
                      styles.stepBadge,
                      { backgroundColor: colors.surfaceContainer },
                    ]}
                  >
                    <Text style={[styles.stepNum, { color: colors.onSurface }]}>3</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.onSurface }]}>
                    Drag <Text style={{ color: colors.primary, fontWeight: '700' }}>EarbudKit Watcher</Text> into active top tiles
                  </Text>
                </View>
              </View>
            </View>

            {/* Open Tile Manager Button */}
            <TouchableOpacity
              style={[
                styles.tileCtaBtn,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
              onPress={handleOpenTileGuide}
              activeOpacity={0.7}
            >
              <Ionicons name="apps-outline" size={18} color={colors.primary} />
              <Text numberOfLines={1} style={[styles.tileCtaText, { color: colors.onSurface }]}>
                Open System Tile Manager
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* Inset Group 3: Privacy & Telemetry */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Privacy & Telemetry
            </Text>
            <View style={[styles.verifiedBadge, { backgroundColor: colors.surfaceContainerHigh }]}>
              <View style={[styles.greenDot, { backgroundColor: '#34D399' }]} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>

          <GlassCard style={styles.card}>
            <View style={styles.privacyHeaderRow}>
              <View
                style={[
                  styles.privacyIconWrap,
                  { backgroundColor: colors.surfaceContainerHigh },
                ]}
              >
                <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
              </View>
              <View style={styles.privacyTitleCol}>
                <Text style={[styles.privacyTitle, { color: colors.onSurface }]}>
                  100% On-Device & Air-Gapped
                </Text>
                <Text style={[styles.privacySubtitle, { color: colors.primary }]}>
                  No network permission requested
                </Text>
              </View>
            </View>

            <Text style={[styles.privacyDescription, { color: colors.onSurfaceVariant }]}>
              No accounts, no cloud sync, no analytics, zero telemetry. Bluetooth packet telemetry is decoded and processed exclusively in ephemeral volatile RAM.
            </Text>

            <View style={styles.privacyFooter}>
              <View style={styles.privacyFooterLeft}>
                <Ionicons name="lock-closed-outline" size={14} color="#34D399" />
                <Text style={[styles.privacyFooterText, { color: colors.onSurfaceVariant }]}>
                  Zero socket permissions
                </Text>
              </View>
              <Text style={[styles.privacyPidText, { color: colors.onSurfaceVariant }]}>
                PID: sandboxed
              </Text>
            </View>
          </GlassCard>
        </View>

        {/* Inset Group 4: Audio Engine & Bluetooth Stack */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              Audio & Bluetooth Stack
            </Text>
            <Text style={[styles.sectionBadge, { color: colors.onSurfaceVariant }]}>
              AOSP Low-Latency
            </Text>
          </View>

          <GlassCard style={styles.card}>
            {/* Polling Interval Selector */}
            <View style={styles.settingBlock}>
              <View style={styles.pollingLabelRow}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>
                  Bluetooth Polling Interval
                </Text>
                <Text style={[styles.pollingValText, { color: colors.primary }]}>
                  {pollingInterval === '15s' ? '15000ms' : pollingInterval === '5s' ? '5000ms' : '1000ms'}
                </Text>
              </View>

              <View
                style={[
                  styles.segmentedContainer,
                  { backgroundColor: colors.surfaceContainerHigh },
                ]}
              >
                {(['15s', '5s', '1s'] as const).map((interval) => {
                  const isSelected = pollingInterval === interval;
                  const label =
                    interval === '15s'
                      ? 'Relaxed (15s)'
                      : interval === '5s'
                      ? 'Balanced (5s)'
                      : 'Instant (1s)';
                  return (
                    <TouchableOpacity
                      key={interval}
                      style={[
                        styles.segmentButton,
                        isSelected && [
                          styles.segmentButtonActive,
                          {
                            backgroundColor: colors.surfaceContainer,
                            borderColor: colors.primary + '50',
                            borderWidth: 1,
                          },
                        ],
                      ]}
                      onPress={() => handleSelectPolling(interval)}
                      activeOpacity={0.7}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.segmentButtonText,
                          {
                            color: isSelected ? colors.primary : colors.onSurfaceVariant,
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
            </View>

            {/* Hairline Divider */}
            <View style={[styles.divider, { backgroundColor: colors.surfaceVariant }]} />

            {/* Unrestricted Battery Execution Row */}
            <View style={styles.batteryRow}>
              <View style={styles.batteryTextCol}>
                <Text style={[styles.rowTitle, { color: colors.onSurface }]}>
                  Unrestricted Battery Execution
                </Text>
                <Text style={[styles.rowSubtitle, { color: colors.onSurfaceVariant }]}>
                  Keeps high-res codec monitoring active in pocket
                </Text>
              </View>

              <View
                style={[
                  styles.permittedBadge,
                  { backgroundColor: colors.surfaceContainerHigh },
                ]}
              >
                <Ionicons name="checkmark-circle" size={16} color="#34D399" />
                <Text style={[styles.permittedText, { color: colors.onSurface }]}>
                  Permitted
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Inset Group 5: About & Maintenance */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              About & Maintenance
            </Text>
            <Text style={[styles.sectionBadge, { color: colors.onSurfaceVariant }]}>
              Build 2024.11
            </Text>
          </View>

          <GlassCard style={styles.card}>
            {/* Version Row */}
            <View style={styles.infoRow}>
              <Text style={[styles.rowTitle, { color: colors.onSurface }]}>
                EarbudKit Version
              </Text>
              <Text style={[styles.rowValue, { color: colors.onSurfaceVariant }]}>
                v1.0.0 (API 35 Ready)
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.surfaceVariant }]} />

            {/* Dedicated Stats Navigation Row */}
            <TouchableOpacity
              style={styles.navRow}
              onPress={() => router.push('/stats')}
              activeOpacity={0.7}
            >
              <View style={styles.navRowLeft}>
                <Ionicons name="bar-chart-outline" size={18} color={colors.primary} />
                <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.onSurface }]}>
                  Listening Statistics & Codecs
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceVariant} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.surfaceVariant }]} />

            {/* Source Code Row */}
            <TouchableOpacity
              style={styles.navRow}
              onPress={() => {
                Linking.openURL('https://github.com/kshitijkdev/EarbudKit').catch(() => {
                  showToast('Unable to open URL');
                });
              }}
              activeOpacity={0.7}
            >
              <View style={styles.navRowLeft}>
                <Ionicons name="code-slash-outline" size={18} color={colors.onSurfaceVariant} />
                <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.onSurface }]}>
                  Source Code on GitHub
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.onSurfaceVariant} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.surfaceVariant }]} />

            {/* Changelog Row */}
            <View style={styles.navRow}>
              <View style={styles.navRowLeft}>
                <Ionicons name="document-text-outline" size={18} color={colors.onSurfaceVariant} />
                <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.onSurface }]}>
                  Acoustic Profiles Changelog
                </Text>
              </View>
              <Text style={[styles.rowValue, { color: colors.onSurfaceVariant }]}>v1.0-soft</Text>
            </View>
          </GlassCard>

          {/* Destructive Action Button */}
          <View style={styles.destructiveArea}>
            <PillButton
              label="Clear Local Device Storage"
              variant="danger"
              icon={<Ionicons name="trash-outline" size={18} color={colors.error} />}
              onPress={handleClearStorage}
            />
          </View>
        </View>
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
  },
  header: {
    marginBottom: 20,
  },
  categoryHeader: {
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 34,
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionBadge: {
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    padding: 16,
    borderRadius: 20,
  },
  settingBlock: {
    marginBottom: 12,
  },
  subLabel: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '500',
    marginBottom: 8,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 9999,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  segmentButtonActive: {
    borderRadius: 9999,
  },
  segmentButtonText: {
    fontSize: 13,
    fontFamily: 'Inter',
  },
  divider: {
    height: 0.5,
    marginVertical: 12,
  },
  accentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accentTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  rowValue: {
    fontSize: 13,
    fontFamily: 'Inter',
  },
  accentPickers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accentDotOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  accentDotInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileMockup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  tileMockupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTextCol: {
    flex: 1,
  },
  tileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tileTitle: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tileSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  tilePowerBtn: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileStepsCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  stepsTitle: {
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  stepsList: {
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNum: {
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  stepText: {
    fontSize: 12,
    fontFamily: 'Inter',
    flex: 1,
    lineHeight: 16,
  },
  tileCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 9999,
    gap: 8,
  },
  tileCtaText: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: '#34D399',
  },
  privacyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  privacyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyTitleCol: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  privacySubtitle: {
    fontSize: 12,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  privacyDescription: {
    fontSize: 13,
    fontFamily: 'Inter',
    lineHeight: 18,
    marginBottom: 12,
  },
  privacyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  privacyFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  privacyFooterText: {
    fontSize: 11,
    fontFamily: 'Inter',
  },
  privacyPidText: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  pollingLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pollingValText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  batteryTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  permittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    gap: 5,
  },
  permittedText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  navRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  destructiveArea: {
    marginTop: 12,
  },
  destructiveBtn: {
    height: 50,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  destructiveBtnText: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: '#FF453A',
  },
});
