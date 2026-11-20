import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

export interface TabItem {
  key: string;
  label: string;
  icon?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  renderIcon?: (isActive: boolean, color: string) => React.ReactNode;
}

export interface FloatingPillNavProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (tabKey: string) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const DEFAULT_ICON_MAP: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  index: { active: 'home', inactive: 'home-outline' },
  devices: { active: 'headset', inactive: 'headset-outline' },
  auto: { active: 'flash', inactive: 'flash-outline' },
  tools: { active: 'options', inactive: 'options-outline' },
  settings: { active: 'settings', inactive: 'settings-outline' },
};

export function FloatingPillNav({
  tabs,
  activeTab,
  onTabPress,
  style,
  testID,
}: FloatingPillNavProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, fonts, borderRadius } = theme;

  const bottomOffset = Math.max(insets.bottom, 12);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          bottom: bottomOffset,
        },
        style,
      ]}
    >
      <View
        testID={testID}
        style={[
          styles.dock,
          {
            borderRadius: borderRadius.full,
            backgroundColor: theme.dark
              ? 'rgba(28, 28, 30, 0.94)'
              : 'rgba(255, 255, 255, 0.96)',
            borderColor: colors.hairline,
            borderWidth: 0.5,
            shadowColor: '#000000',
            shadowOpacity: theme.dark ? 0.35 : 0.1,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const activeColor = colors.primary;
          const inactiveColor = colors.onSurfaceVariant;
          const iconColor = isActive ? activeColor : inactiveColor;

          const defaultMapping = DEFAULT_ICON_MAP[tab.key];
          const iconGlyph = tab.iconName
            ? tab.iconName
            : defaultMapping
            ? (isActive ? defaultMapping.active : defaultMapping.inactive)
            : 'ellipse-outline';

          return (
            <TouchableOpacity
              key={tab.key}
              testID={`tab-${tab.key}`}
              activeOpacity={0.7}
              onPress={() => onTabPress(tab.key)}
              style={[
                styles.tabItem,
                {
                  borderRadius: borderRadius.full,
                  backgroundColor: isActive
                    ? theme.dark
                      ? colors.primaryContainer
                      : colors.primaryContainer
                    : 'transparent',
                },
              ]}
            >
              {tab.renderIcon ? (
                tab.renderIcon(isActive, iconColor)
              ) : (
                <Ionicons
                  name={iconGlyph}
                  size={20}
                  color={iconColor}
                  style={styles.tabIcon}
                />
              )}
              <Text
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? activeColor : inactiveColor,
                    fontFamily: fonts.label,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: '94%',
    maxWidth: 440,
    height: 60,
  },
  tabItem: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    marginHorizontal: 2,
  },
  tabIcon: {
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
