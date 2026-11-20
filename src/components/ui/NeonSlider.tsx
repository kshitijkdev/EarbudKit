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
import { LinearGradient } from 'expo-linear-gradient';
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
                color: colors.limeNeon,
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
                backgroundColor: theme.dark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(94, 57, 224, 0.08)',
                borderColor: theme.dark
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(94, 57, 224, 0.15)',
                opacity: disabled || clampedValue <= min ? 0.35 : 1,
              },
            ]}
          >
            <Text style={[styles.stepBtnText, { color: colors.onSurface }]}>
              −
            </Text>
          </TouchableOpacity>
        )}

        <View
          onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
          style={styles.touchArea}
        >
          {/* Background track: 4px */}
          <View
            style={[
              styles.trackBg,
              {
                backgroundColor: theme.dark ? '#1C1C26' : '#E4E1EE',
              },
            ]}
          >
            {/* Active filled track with gradient */}
            <LinearGradient
              colors={[colors.electricViolet, colors.hotPink]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[
                styles.trackFill,
                {
                  width: `${Math.max(percentage * 100, 0)}%`,
                },
              ]}
            />
          </View>

          {/* White thumb with Lime glow */}
          {trackWidth > 0 && (
            <View
              style={[
                styles.thumb,
                {
                  left: Math.max(
                    0,
                    Math.min(percentage * trackWidth - 10, trackWidth - 20)
                  ),
                  borderColor: isInteracting
                    ? colors.limeNeon
                    : 'rgba(255, 255, 255, 0.9)',
                  borderWidth: isInteracting ? 2.5 : 2,
                  shadowColor: isInteracting ? colors.limeNeon : '#000000',
                  shadowOpacity: isInteracting ? 0.6 : 0.25,
                  shadowRadius: isInteracting ? 8 : 3,
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
                backgroundColor: theme.dark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(94, 57, 224, 0.08)',
                borderColor: theme.dark
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(94, 57, 224, 0.15)',
                opacity: disabled || clampedValue >= max ? 0.35 : 1,
              },
            ]}
          >
            <Text style={[styles.stepBtnText, { color: colors.onSurface }]}>
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
    fontSize: 14,
    fontWeight: '600',
  },
  sublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
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
    height: 40,
    justifyContent: 'center',
    marginHorizontal: 10,
    position: 'relative',
  },
  trackBg: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    top: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    elevation: 3,
  },
});
