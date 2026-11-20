import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { FloatingPillNav, TabItem } from '../../src/components/ui/FloatingPillNav';

const TABS: TabItem[] = [
  { key: 'index', label: 'Home', icon: '🎧' },
  { key: 'devices', label: 'Devices', icon: '📱' },
  { key: 'auto', label: 'Auto', icon: '⚡' },
  { key: 'tools', label: 'Tools', icon: '🎛️' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

// React Navigation 7 / Expo Router custom tab bar props
interface CustomTabBarProps {
  state: {
    index: number;
    routes: Array<{ name: string; key: string }>;
  };
  navigation?: {
    navigate: (name: string) => void;
  };
  navigateToTab?: (routeKey: string) => void;
}

function CustomTabBar(props: CustomTabBarProps) {
  const { state, navigation, navigateToTab } = props;
  const currentRouteName = state.routes[state.index]?.name || 'index';

  return (
    <FloatingPillNav
      tabs={TABS}
      activeTab={currentRouteName}
      onTabPress={(tabKey) => {
        if (navigation) {
          navigation.navigate(tabKey);
        } else if (navigateToTab) {
          const target = state.routes.find((r) => r.name === tabKey);
          if (target) {
            navigateToTab(target.key);
          }
        }
      }}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBarHidden,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Devices',
        }}
      />
      <Tabs.Screen
        name="auto"
        options={{
          title: 'Auto',
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Tools',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarHidden: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
  },
});
