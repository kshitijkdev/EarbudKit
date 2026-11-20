import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../src/theme';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
        <Text style={[styles.emoji]}>🎧</Text>
        <Text style={[styles.title, { color: colors.onSurface }]}>EarbudKit</Text>
        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          Your Bluetooth audio companion
        </Text>
        <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>
          Add devices from the Devices tab to get started
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
  card: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
