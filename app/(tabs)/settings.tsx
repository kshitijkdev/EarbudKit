import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme';
import { FeedbackToast } from '../../src/components/FeedbackToast';
import {
  GlassCard,
  PillButton,
  StatusChip,
} from '../../src/components/ui';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, themeMode, setThemeMode } = useTheme();
  const { colors, fonts, borderRadius } = theme;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => setToastMessage(msg);

  const themeOptions: Array<{ label: string; value: 'system' | 'light' | 'dark'; icon: string }> = [
    { label: 'Auto', value: 'system', icon: '🌐' },
    { label: 'Light', value: 'light', icon: '☀️' },
    { label: 'Dark', value: 'dark', icon: '🌙' },
  ];

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
        {/* Header Area */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Settings</Text>
            <Text style={[styles.headerSubtitle, { color: colors.onSurfaceVariant }]}>
              Companion config, hardware diagnostics & telemetry controls.
            </Text>
          </View>

          <StatusChip
            label="ENGINE V1.4"
            dotColor="lime"
            pulse
          />
        </View>

        {/* Section 1: Appearance & Theme Switcher */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
              <Text style={{ fontSize: 20 }}>🎨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                Appearance & Interface
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}>
                Display mode & dynamic color aura
              </Text>
            </View>
          </View>

          {/* Segmented Theme Pill Selector */}
          <View style={[styles.themePillsContainer, { backgroundColor: colors.surfaceContainerLowest + '90' }]}>
            {themeOptions.map((opt) => {
              const isSelected = themeMode === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.themePill,
                    isSelected && {
                      backgroundColor: colors.primary,
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.35,
                      shadowRadius: 8,
                      elevation: 4,
                    },
                  ]}
                  onPress={() => {
                    setThemeMode(opt.value);
                    showToast(`✓ Switched to ${opt.label} theme`);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 15 }}>{opt.icon}</Text>
                  <Text
                    style={[
                      styles.themePillText,
                      {
                        color: isSelected ? colors.onPrimary : colors.onSurfaceVariant,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Active Palette Glow Indicator */}
          <View style={[styles.palettePod, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
            <View style={styles.spectrumDots}>
              <View style={[styles.spectrumDot, { backgroundColor: colors.primary }]} />
              <View style={[styles.spectrumDot, { backgroundColor: colors.secondary }]} />
              <View style={[styles.spectrumDot, { backgroundColor: colors.tertiary }]} />
              <Text style={[styles.paletteLabel, { color: colors.onSurface }]}>
                Sonic Neo-Spectrum
              </Text>
            </View>
            <Text style={[styles.paletteActiveText, { color: colors.tertiary }]}>
              {themeMode.toUpperCase()} ACTIVE
            </Text>
          </View>
        </GlassCard>

        {/* Section 2: Listening Statistics Navigation Tile */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.secondary + '20' }]}>
              <Text style={{ fontSize: 20 }}>📊</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                Telemetry & Listening Stats
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}>
                Hardware audio codecs & listening duration
              </Text>
            </View>
          </View>

          <Text style={[styles.cardBodyText, { color: colors.onSurfaceVariant }]}>
            Inspect today's listening session load, total audio hours across all tracked devices, and active Bluetooth codecs (LDAC, aptX HD, AAC, SBC).
          </Text>

          <View style={{ marginTop: 12 }}>
            <PillButton
              variant="primary"
              size="md"
              label="📊 View Listening Stats & Codecs"
              onPress={() => router.push('/stats')}
            />
          </View>
        </GlassCard>

        {/* Section 3: Quick Settings Tile Integration */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.tertiary + '20' }]}>
              <Text style={{ fontSize: 20 }}>⚡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                  Quick Settings Tile
                </Text>
                <View style={[styles.miniChip, { backgroundColor: colors.secondary + '30' }]}>
                  <Text style={[styles.miniChipText, { color: colors.secondary }]}>QS API</Text>
                </View>
              </View>
              <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}>
                Android notification shade integration
              </Text>
            </View>
          </View>

          <Text style={[styles.cardBodyText, { color: colors.onSurfaceVariant }]}>
            Instantly toggle background watcher polling, check battery levels, and jump to tools straight from your phone's notification pull-down shade.
          </Text>

          {/* Mock Android QS Tile Display */}
          <View style={[styles.mockTilePod, { backgroundColor: colors.surfaceContainerLowest + '90' }]}>
            <View style={styles.mockTileLeft}>
              <View style={[styles.mockTileIcon, { backgroundColor: colors.primary }]}>
                <Text style={{ fontSize: 20, color: colors.onPrimary }}>🎧</Text>
              </View>
              <View>
                <Text style={[styles.mockTileName, { color: colors.onSurface }]}>
                  EarbudKit Watcher
                </Text>
                <View style={styles.mockTileStatus}>
                  <View style={[styles.microDot, { backgroundColor: colors.tertiary }]} />
                  <Text style={[styles.mockTileStatusText, { color: colors.tertiary }]}>
                    ACTIVE · System Tile Ready
                  </Text>
                </View>
              </View>
            </View>
            <Text style={{ fontSize: 16 }}>👆</Text>
          </View>

          <View style={{ marginTop: 4 }}>
            <PillButton
              variant="secondary"
              size="sm"
              label="ℹ️ How to Add: Swipe down shade & tap ✏️"
              onPress={() => {
                Alert.alert(
                  'Adding EarbudKit Tile',
                  '1. Swipe down from the top of your screen to open Quick Settings.\n2. Tap the Pencil icon (Edit Tiles).\n3. Find "EarbudKit" and drag it into your active tiles!'
                );
              }}
            />
          </View>
        </GlassCard>

        {/* Section 4: Privacy & Zero Telemetry */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.tertiary + '20' }]}>
              <Text style={{ fontSize: 20 }}>🛡️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                  100% On-Device & Private
                </Text>
              </View>
              <Text style={[styles.cardSublabel, { color: colors.tertiary }]}>
                AIR-GAPPED OPERATION
              </Text>
            </View>
          </View>

          <Text style={[styles.cardBodyText, { color: colors.onSurfaceVariant }]}>
            No accounts, no remote trackers, no analytics servers. All Bluetooth MAC caches, battery curves, and automated DSP rules never leave your hardware.
          </Text>

          <View style={styles.privacyTagsRow}>
            <View style={[styles.privacyTag, { backgroundColor: colors.surfaceContainerLowest }]}>
              <Text style={{ fontSize: 14 }}>✓</Text>
              <Text style={[styles.privacyTagText, { color: colors.tertiary }]}>
                Local Sandbox Verified
              </Text>
            </View>
            <View style={[styles.privacyTag, { backgroundColor: colors.surfaceContainerLowest }]}>
              <Text style={{ fontSize: 14 }}>🔒</Text>
              <Text style={[styles.privacyTagText, { color: colors.primary }]}>
                Zero Network Requests
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Section 5: Design System Showcase (D1) */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
              <Text style={{ fontSize: 20 }}>✨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                Sonic Neo-Glass Showcase
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}>
                Reusable UI components preview (D1)
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <PillButton
              variant="ghost"
              size="sm"
              label="✨ Open Component Showcase"
              onPress={() => router.push('/showcase')}
            />
          </View>
        </GlassCard>

        {/* Section 6: About & Build Specs */}
        <GlassCard style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
              <Text style={{ fontSize: 20 }}>🎧</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                  EarbudKit
                </Text>
                <View style={[styles.miniChip, { backgroundColor: colors.surfaceContainerHigh }]}>
                  <Text style={[styles.miniChipText, { color: colors.primary }]}>v1.0.0-core</Text>
                </View>
              </View>
              <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}>
                Crafted for third-party & unbranded Bluetooth audio
              </Text>
            </View>
          </View>

          <View style={styles.aboutLinksStack}>
            <View style={[styles.aboutItem, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
              <Text style={[styles.aboutItemTitle, { color: colors.onSurface }]}>Platform</Text>
              <Text style={[styles.aboutItemValue, { color: colors.outline }]}>
                Android Native (API 26–35)
              </Text>
            </View>
            <View style={[styles.aboutItem, { backgroundColor: colors.surfaceContainerLowest + '80' }]}>
              <Text style={[styles.aboutItemTitle, { color: colors.onSurface }]}>Audio Targets</Text>
              <Text style={[styles.aboutItemValue, { color: colors.outline }]}>
                Noise Buds Vector & realme Studio H1
              </Text>
            </View>
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
  sectionCard: {
    padding: 18,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  cardSublabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 2,
  },
  cardBodyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  themePillsContainer: {
    flexDirection: 'row',
    borderRadius: 9999,
    padding: 4,
    gap: 4,
  },
  themePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9999,
    gap: 6,
  },
  themePillText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
  },
  palettePod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
  },
  spectrumDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spectrumDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  paletteLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 12,
    marginLeft: 4,
  },
  paletteActiveText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  miniChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniChipText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  mockTilePod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
  },
  mockTileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mockTileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockTileName: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
  },
  mockTileStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  microDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mockTileStatusText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 11,
  },
  privacyTagsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  privacyTag: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
  },
  privacyTagText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 11,
  },
  aboutLinksStack: {
    gap: 8,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  aboutItemTitle: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 13,
  },
  aboutItemValue: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 12,
  },
});
