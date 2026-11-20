import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '../../theme';

export interface ToggleProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TRACK_WIDTH = 50;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 22;
const PADDING = 3;
const TRAVEL = TRACK_WIDTH - THUMB_SIZE - PADDING * 2;

export function Toggle({
  value,
  onValueChange,
  disabled = false,
  style,
  testID,
}: ToggleProps) {
  const { theme } = useTheme();
  const { colors, borderRadius } = theme;

  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      friction: 8,
      tension: 70,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const thumbTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [PADDING, PADDING + TRAVEL],
  });

  const trackBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      colors.surfaceContainerHigh,
      colors.primary,
    ],
  });

  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.85}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={[styles.hitTarget, style]}
    >
      <Animated.View
        style={[
          styles.track,
          {
            borderRadius: borderRadius.full,
            backgroundColor: trackBg,
            borderColor: colors.hairline,
            borderWidth: 0.5,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              borderRadius: borderRadius.full,
              backgroundColor: '#FFFFFF',
              transform: [{ translateX: thumbTranslateX }],
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.25,
              shadowRadius: 2,
              elevation: 2,
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hitTarget: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
});
