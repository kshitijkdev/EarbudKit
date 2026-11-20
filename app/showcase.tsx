import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme';
import {
  GlassCard,
  PillButton,
  StatusChip,
  Toggle,
  NeonSlider,
  BatteryRing,
  SectionHeader,
  FloatingPillNav,
  TabItem,
} from '../src/components/ui';

export default function ShowcaseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, setThemeMode, themeMode } = useTheme();
  const { colors, fonts } = theme;

  const [activeCard, setActiveCard] = useState(false);
  const [toggleVal, setToggleVal] = useState(true);
  const [sliderVal, setSliderVal] = useState(4.0);
  const [selectedTab, setSelectedTab] = useState('home');

  const tabs: TabItem[] = [
    { key: 'home', label: 'Home', icon: '🏠' },
    { key: 'devices', label: 'Devices', icon: '🎧' },
    { key: 'auto', label: 'Auto', icon: '⚡' },
    { key: 'tools', label: 'Tools', icon: '🔧' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const toggleTheme = () => {
    setThemeMode(theme.dark ? 'light' : 'dark');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.onSurface, fontFamily: fonts.display }]}>
            Sonic Neo-Glass
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
            D1 Design System Foundation Showcase
          </Text>
        </View>
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themeBtn, { borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainer }]}
        >
          <Text style={{ fontSize: 16 }}>{theme.dark ? '☀️ Light' : '🌙 Dark'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: GlassCard */}
        <SectionHeader
          title="1. GlassCard"
          subtitle="Translucent fill, 1px border, 24px radius, optional active glow"
          actionText={activeCard ? "Make Inactive" : "Make Active"}
          onActionPress={() => setActiveCard(!activeCard)}
        />
        <GlassCard active={activeCard} glow={activeCard} style={styles.cardSpacing}>
          <Text style={[styles.cardTitle, { color: colors.onSurface, fontFamily: fonts.headline }]}>
            {activeCard ? "Active GlassCard (Neon Glow)" : "Standard GlassCard"}
          </Text>
          <Text style={[styles.cardBody, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
            Frosted surface with ultra-fine border. Tapping 'Make Active' activates electric violet tint and neon halo.
          </Text>
        </GlassCard>

        {/* Section 2: PillButton */}
        <SectionHeader
          title="2. PillButton"
          subtitle="48px touch targets, full pill morphology, 4 variants"
        />
        <View style={styles.btnRow}>
          <PillButton label="Primary Violet" variant="primary" onPress={() => {}} style={styles.btnFlex} />
          <PillButton label="Secondary Glass" variant="secondary" onPress={() => {}} style={styles.btnFlex} />
        </View>
        <View style={[styles.btnRow, { marginTop: 8 }]}>
          <PillButton label="Ghost Lime" variant="ghost" onPress={() => {}} style={styles.btnFlex} />
          <PillButton label="Danger Red" variant="danger" onPress={() => {}} style={styles.btnFlex} />
        </View>

        {/* Section 3: StatusChip */}
        <SectionHeader
          title="3. StatusChip"
          subtitle="Metadata pills with colored pulsing micro-dots"
        />
        <View style={styles.chipRow}>
          <StatusChip label="Connected" dotColor="lime" pulse />
          <StatusChip label="Searching..." dotColor="violet" pulse />
          <StatusChip label="Low Latency" dotColor="pink" />
          <StatusChip label="Offline" dotColor="grey" />
        </View>

        {/* Section 4: Toggle */}
        <SectionHeader
          title="4. Toggle"
          subtitle="Chunky 50x28 pill with animated sliding circular thumb"
        />
        <GlassCard style={styles.cardSpacing}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.settingLabel, { color: colors.onSurface, fontFamily: fonts.title }]}>
                Background Watcher
              </Text>
              <Text style={[styles.settingDesc, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
                State: {toggleVal ? 'LIME ACTIVE' : 'MUTED OFF'}
              </Text>
            </View>
            <Toggle value={toggleVal} onValueChange={setToggleVal} />
          </View>
        </GlassCard>

        {/* Section 5: NeonSlider */}
        <SectionHeader
          title="5. NeonSlider"
          subtitle="4px track, violet-to-pink gradient, white thumb with lime rim"
        />
        <GlassCard style={styles.cardSpacing}>
          <NeonSlider
            label="Bass Frequency (60 Hz)"
            sublabel="Hardware Equalizer Band Gain"
            value={sliderVal}
            min={-15}
            max={15}
            step={0.5}
            onValueChange={setSliderVal}
            formatValue={(v) => (v > 0 ? `+${v.toFixed(1)} dB` : `${v.toFixed(1)} dB`)}
          />
        </GlassCard>

        {/* Section 6: BatteryRing */}
        <SectionHeader
          title="6. BatteryRing"
          subtitle="SVG ring: lime above 20%, error warning, friendly 'Unavailable' fallback"
        />
        <GlassCard style={styles.cardSpacing}>
          <View style={styles.batteryRow}>
            <View style={styles.batteryCol}>
              <BatteryRing battery={85} size={76} />
              <Text style={[styles.batteryCaption, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                Normal (85%)
              </Text>
            </View>
            <View style={styles.batteryCol}>
              <BatteryRing battery={15} size={76} />
              <Text style={[styles.batteryCaption, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                Low (15%)
              </Text>
            </View>
            <View style={styles.batteryCol}>
              <BatteryRing battery="Unavailable" size={76} />
              <Text style={[styles.batteryCaption, { color: colors.onSurfaceVariant, fontFamily: fonts.label }]}>
                Unavailable
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Section 7: FloatingPillNav preview */}
        <SectionHeader
          title="7. FloatingPillNav Dock"
          subtitle="Floating glass dock with active violet glow and pink micro-dot"
        />
        <View style={{ height: 80, justifyContent: 'center' }}>
          <FloatingPillNav
            tabs={tabs}
            activeTab={selectedTab}
            onTabPress={setSelectedTab}
            style={{ position: 'relative', left: 0, right: 0, bottom: 0 }}
          />
        </View>

        {/* Close Button */}
        <PillButton
          label="← Return to EarbudKit"
          variant="secondary"
          onPress={() => router.back()}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  themeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cardSpacing: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  btnFlex: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  batteryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  batteryCol: {
    alignItems: 'center',
  },
  batteryCaption: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
});
