import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  StyleSheet,
  ViewStyle,
  StyleProp,
  LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '../../theme';

export interface NeonSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (val: number) => void;
  formatValue?: (val: number) => string;
  label?: string;
  sublabel?: string;
  showSteppers?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function NeonSlider({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  formatValue,
  label,
  sublabel,
  showSteppers = true,
  disabled = false,
  style,
  testID,
}: NeonSliderProps) {
  const { theme } = useTheme();
  const { colors, fonts } = theme;

  const [trackWidth, setTrackWidth] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

  const range = max - min;
  const clampedValue = Math.min(Math.max(value, min), max);
  const percentage = range > 0 ? (clampedValue - min) / range : 0;

  const updateFromLocalX = (localX: number) => {
    if (trackWidth > 0 && range > 0) {
      const touchX = Math.max(0, Math.min(localX, trackWidth));
      const ratio = touchX / trackWidth;
      let rawVal = min + ratio * range;
      if (step > 0) {
        rawVal = Math.round(rawVal / step) * step;
      }
      const newVal = Math.min(Math.max(rawVal, min), max);
      onValueChange(newVal);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (evt) => {
        setIsInteracting(true);
        updateFromLocalX(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        updateFromLocalX(evt.nativeEvent.locationX);
      },
      onPanResponderRelease: () => {
        setIsInteracting(false);
      },
      onPanResponderTerminate: () => {
        setIsInteracting(false);
      },
    })
  ).current;

  const handleStep = (delta: number) => {
    if (disabled) return;
    const nextVal = Math.min(Math.max(clampedValue + delta, min), max);
    onValueChange(nextVal);
  };

  const formatted = formatValue ? formatValue(clampedValue) : `${clampedValue}`;

  return (
    <View testID={testID} style={[styles.container, style]}>
      {(label || sublabel || formatted) && (
        <View style={styles.headerRow}>
          <View style={styles.labelCol}>
            {label && (
              <Text
                style={[
                  styles.label,
                  { color: colors.onSurface, fontFamily: fonts.title },
                ]}
              >
                {label}
              </Text>
            )}
            {sublabel && (
              <Text
                style={[
                  styles.sublabel,
                  { color: colors.onSurfaceVariant, fontFamily: fonts.body },
                ]}
              >
                {sublabel}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.valueText,
              {
                color: colors.primary,
                fontFamily: fonts.headline,
              },
            ]}
          >
            {formatted}
          </Text>
        </View>
      )}

      <View style={styles.controlsRow}>
        {showSteppers && (
          <TouchableOpacity
            disabled={disabled || clampedValue <= min}
            onPress={() => handleStep(-step)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.stepBtn,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.hairline,
                opacity: disabled || clampedValue <= min ? 0.35 : 1,
              },
            ]}
          >
            <Text numberOfLines={1} style={[styles.stepBtnText, { color: colors.onSurface }]}>
              −
            </Text>
          </TouchableOpacity>
        )}

        <View
          onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
          style={styles.touchArea}
        >
          {/* Background track: 8px Soft Studio pill */}
          <View
            style={[
              styles.trackBg,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.hairline,
                borderWidth: 0.5,
              },
            ]}
          >
            {/* Active filled track with active accent */}
            <View
              style={[
                styles.trackFill,
                {
                  backgroundColor: colors.primary,
                  width: `${Math.max(percentage * 100, 0)}%`,
                },
              ]}
            />
          </View>

          {/* 28px circular thumb with pure #FFFFFF and 0.5px hairline */}
          {trackWidth > 0 && (
            <View
              style={[
                styles.thumb,
                {
                  left: Math.max(
                    0,
                    Math.min(percentage * trackWidth - 14, trackWidth - 28)
                  ),
                  borderColor: isInteracting
                    ? colors.primary
                    : 'rgba(0, 0, 0, 0.15)',
                  borderWidth: 0.5,
                  shadowColor: '#000000',
                  shadowOpacity: isInteracting ? 0.35 : 0.2,
                  shadowRadius: isInteracting ? 6 : 3,
                },
              ]}
            />
          )}
        </View>

        {showSteppers && (
          <TouchableOpacity
            disabled={disabled || clampedValue >= max}
            onPress={() => handleStep(step)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.stepBtn,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.hairline,
                opacity: disabled || clampedValue >= max ? 0.35 : 1,
              },
            ]}
          >
            <Text numberOfLines={1} style={[styles.stepBtnText, { color: colors.onSurface }]}>
              +
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelCol: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  sublabel: {
    fontSize: 13,
    marginTop: 2,
  },
  valueText: {
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  stepBtn: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  touchArea: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    marginHorizontal: 10,
    position: 'relative',
  },
  trackBg: {
    height: 8,
    borderRadius: 9999,
    width: '100%',
    overflow: 'hidden',
  },
  trackFill: {
    height: 8,
    borderRadius: 9999,
  },
  thumb: {
    position: 'absolute',
    top: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    elevation: 3,
  },
});
