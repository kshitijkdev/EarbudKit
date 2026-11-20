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
import { useTheme } from '../../theme';

export interface TabItem {
  key: string;
  label: string;
  icon: string;
}

export interface FloatingPillNavProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (tabKey: string) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

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
              ? 'rgba(18, 18, 24, 0.88)'
              : 'rgba(255, 255, 255, 0.92)',
            borderColor: theme.dark
              ? 'rgba(255, 255, 255, 0.12)'
              : 'rgba(94, 57, 224, 0.15)',
            shadowColor: theme.dark ? colors.electricViolet : '#000000',
            shadowOpacity: theme.dark ? 0.3 : 0.1,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
          },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;

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
                      ? 'rgba(124, 92, 255, 0.18)'
                      : 'rgba(94, 57, 224, 0.12)'
                    : 'transparent',
                  borderColor: isActive
                    ? colors.electricViolet
                    : 'transparent',
                  borderWidth: isActive ? 1 : 0,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabIcon,
                  {
                    opacity: isActive ? 1 : 0.65,
                    transform: [{ scale: isActive ? 1.05 : 0.95 }],
                  },
                ]}
              >
                {tab.icon}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? colors.onSurface : colors.outline,
                    fontFamily: fonts.label,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>
              {isActive && (
                <View
                  style={[
                    styles.activeDot,
                    {
                      backgroundColor: colors.hotPink,
                    },
                  ]}
                />
              )}
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
    left: 16,
    right: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    maxWidth: 520,
    width: '100%',
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    position: 'relative',
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
