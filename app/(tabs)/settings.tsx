import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme';
import { FeedbackToast } from '../../src/components/FeedbackToast';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, themeMode, setThemeMode } = useTheme();
  const { colors, borderRadius, spacing } = theme;
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const themeOptions: Array<{ label: string; value: 'system' | 'light' | 'dark' }> = [
    { label: '🌐 System', value: 'system' },
    { label: '☀️ Light', value: 'light' },
    { label: '🌙 Dark', value: 'dark' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <FeedbackToast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      {/* Theme selection */}
      <View style={[styles.section, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Appearance</Text>
        <View style={styles.themeRow}>
          {themeOptions.map((opt) => {
            const isSelected = themeMode === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.themeButton,
                  {
                    backgroundColor: isSelected ? colors.primaryContainer : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.outlineVariant,
                    borderWidth: isSelected ? 2 : 1,
                    borderRadius: borderRadius.md,
                  },
                ]}
                onPress={() => {
                  setThemeMode(opt.value);
                  setToastMessage(`✓ Switched to ${opt.label} theme`);
                }}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    styles.themeLabel,
                    {
                      color: isSelected
                        ? colors.onPrimaryContainer
                        : colors.onSurfaceVariant,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {isSelected ? '✓ ' : ''}{opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Listening Stats & Codecs */}
      <View style={[styles.section, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Statistics</Text>
        <Text style={[styles.bodyText, { color: colors.onSurfaceVariant, marginBottom: 12 }]}>
          View session listening time, daily breakdown, and active Bluetooth audio codecs (LDAC, aptX, AAC, SBC) for all your paired devices.
        </Text>
        <TouchableOpacity
          style={[
            styles.statsNavButton,
            {
              backgroundColor: colors.primary,
              borderRadius: borderRadius.md,
            },
          ]}
          onPress={() => router.push('/stats')}
          activeOpacity={0.8}
        >
          <Text style={[styles.statsNavText, { color: colors.onPrimary }]}>
            📊 View Listening Stats & Codecs
          </Text>
        </TouchableOpacity>
      </View>

      {/* D1 Design Showcase */}
      <View style={[styles.section, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Design System (D1)</Text>
        <Text style={[styles.bodyText, { color: colors.onSurfaceVariant, marginBottom: 12 }]}>
          Explore the Sonic Neo-Glass design system showcase (GlassCard, PillButton, StatusChip, Toggle, NeonSlider, BatteryRing, FloatingPillNav).
        </Text>
        <TouchableOpacity
          style={[
            styles.statsNavButton,
            {
              backgroundColor: colors.electricViolet,
              borderRadius: borderRadius.md,
            },
          ]}
          onPress={() => router.push('/showcase')}
          activeOpacity={0.8}
        >
          <Text style={[styles.statsNavText, { color: '#FFFFFF' }]}>
            ✨ Open Sonic Neo-Glass Showcase
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Settings Tile */}
      <View style={[styles.section, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Quick Settings Tile</Text>
        <Text style={[styles.bodyText, { color: colors.onSurfaceVariant }]}>
          ⚡ EarbudKit includes a native Android Quick Settings tile. Swipe down from the top of your screen, tap the pencil icon to edit quick tiles, and drag EarbudKit into your active tiles for 1-tap app launch and live connection monitoring.
        </Text>
      </View>

      {/* Privacy note */}
      <View style={[styles.section, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Privacy</Text>
        <Text style={[styles.privacyText, { color: colors.onSurfaceVariant }]}>
          🔒 All data stays on your device. EarbudKit does not collect analytics,
          require accounts, or send data to any server.
        </Text>
      </View>

      {/* App info */}
      <View style={[styles.section, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>About</Text>
        <Text style={[styles.aboutText, { color: colors.onSurfaceVariant }]}>
          EarbudKit v1.0.0
        </Text>
        <Text style={[styles.aboutText, { color: colors.onSurfaceVariant }]}>
          Companion app for Bluetooth audio devices
        </Text>
      </View>
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
    gap: 16,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  statsNavButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  statsNavText: {
    fontSize: 14,
    fontWeight: '700',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  privacyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
