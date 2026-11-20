import { Tabs } from 'expo-router';
import { useTheme } from '../../src/theme';
import { Platform, Text, StyleSheet } from 'react-native';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: '🏠',
    devices: '🎧',
    auto: '⚡',
    tools: '🔧',
    settings: '⚙️',
  };

  return (
    <Text style={[styles.icon, { opacity: focused ? 1 : 0.6 }]}>
      {icons[name] ?? '📱'}
    </Text>
  );
}

export default function TabLayout() {
  const { theme } = useTheme();
  const { colors, borderRadius } = theme;

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.onSurface,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: theme.typography.titleMedium,
        },
        tabBarStyle: {
          backgroundColor: colors.surfaceContainer,
          borderTopColor: colors.outlineVariant,
          borderTopWidth: 0.5,
          height: Platform.OS === 'android' ? 64 : 84,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'android' ? 10 : 28,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarLabelStyle: {
          fontSize: theme.typography.labelSmall,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Devices',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="devices" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="auto"
        options={{
          title: 'Auto',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="auto" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Tools',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="tools" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="settings" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 20,
  },
});
