import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../src/theme';

export default function AutoScreen() {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.emptyState, { backgroundColor: colors.surfaceContainer }]}>
        <Text style={styles.emoji}>⚡</Text>
        <Text style={[styles.title, { color: colors.onSurface }]}>Auto-Actions</Text>
        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          Set up actions that run automatically when your devices connect or disconnect
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyState: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
