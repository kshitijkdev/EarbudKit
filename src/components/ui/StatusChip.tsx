import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../theme';

export type StatusDotColor = 'lime' | 'violet' | 'pink' | 'grey' | 'accent';

export interface StatusChipProps {
  label: string;
  dotColor?: StatusDotColor;
  pulse?: boolean;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export function StatusChip({
  label,
  dotColor = 'lime',
  pulse = false,
  active = false,
  style,
  labelStyle,
  icon,
}: StatusChipProps) {
  const { theme } = useTheme();
  const { colors, fonts, borderRadius } = theme;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();

    return () => anim.stop();
  }, [pulse, pulseAnim]);

  const resolveDotColor = (): string => {
    switch (dotColor) {
      case 'lime':
        return colors.limeNeon; // #34C759
      case 'violet':
      case 'pink':
      case 'accent':
        return colors.primary;
      case 'grey':
      default:
        return colors.outline;
    }
  };

  const dotBg = resolveDotColor();

  return (
    <View
      style={[
        styles.chip,
        {
          borderRadius: borderRadius.full,
          backgroundColor: active
            ? colors.primaryContainer
            : colors.surfaceContainerHigh,
          borderColor: active
            ? colors.primary
            : colors.hairline,
        },
        style,
      ]}
    >
      {icon ? (
        <View style={styles.iconContainer}>{icon}</View>
      ) : (
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor: dotBg,
              opacity: pulse ? pulseAnim : 1,
            },
          ]}
        />
      )}
      <Text
        style={[
          styles.label,
          {
            color: active ? colors.primary : colors.onSurface,
            fontFamily: fonts.label,
          },
          labelStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    height: 28,
    borderWidth: 0.5,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  iconContainer: {
    marginRight: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
