import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../src/theme';

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { colors, borderRadius, spacing } = theme;

  const themeOptions: Array<{ label: string; value: 'system' | 'light' | 'dark' }> = [
    { label: '🌐 System', value: 'system' },
    { label: '☀️ Light', value: 'light' },
    { label: '🌙 Dark', value: 'dark' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Theme selection */}
      <View style={[styles.section, { backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg }]}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Appearance</Text>
        <View style={styles.themeRow}>
          {themeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.themeButton,
                {
                  backgroundColor:
                    themeMode === opt.value ? colors.primaryContainer : colors.surface,
                  borderRadius: borderRadius.md,
                },
              ]}
              onPress={() => setThemeMode(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.themeLabel,
                  {
                    color:
                      themeMode === opt.value
                        ? colors.onPrimaryContainer
                        : colors.onSurfaceVariant,
                  },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
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
