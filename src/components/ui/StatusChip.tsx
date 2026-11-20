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

export type StatusDotColor = 'lime' | 'violet' | 'pink' | 'grey';

export interface StatusChipProps {
  label: string;
  dotColor?: StatusDotColor;
  pulse?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export function StatusChip({
  label,
  dotColor = 'lime',
  pulse = false,
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
        return colors.limeNeon;
      case 'violet':
        return colors.electricViolet;
      case 'pink':
        return colors.hotPink;
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
          backgroundColor: theme.dark
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(94, 57, 224, 0.06)',
          borderColor: theme.dark
            ? 'rgba(255, 255, 255, 0.10)'
            : 'rgba(94, 57, 224, 0.12)',
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
            color: colors.onSurface,
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
    borderWidth: 1,
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
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
