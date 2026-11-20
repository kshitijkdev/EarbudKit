import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../../theme';

export interface BatteryRingProps {
  battery: number | string | null | undefined;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export function BatteryRing({
  battery,
  size = 80,
  strokeWidth = 7,
  showLabel = true,
}: BatteryRingProps) {
  const { theme } = useTheme();
  const { colors, fonts } = theme;

  const isNumeric =
    typeof battery === 'number' && !isNaN(battery) && battery >= 0 && battery <= 100;

  const numericValue = isNumeric ? (battery as number) : null;
  const isUnavailable = numericValue === null;

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Determine ring color
  const getRingColor = () => {
    if (isUnavailable) {
      return theme.dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(94, 57, 224, 0.15)';
    }
    if (numericValue <= 20) {
      return colors.error;
    }
    return colors.limeNeon;
  };

  const ringColor = getRingColor();
  const progressOffset = isUnavailable
    ? 0
    : circumference - (circumference * numericValue) / 100;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background track circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={
              theme.dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
            }
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Active progress arc */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={
              isUnavailable ? `${circumference / 8} ${circumference / 8}` : `${circumference}`
            }
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>

      {/* Center Readout */}
      <View style={styles.centerContent}>
        {isUnavailable ? (
          <>
            <Text
              style={[
                styles.questionMark,
                { color: colors.outline, fontFamily: fonts.display },
              ]}
            >
              ?
            </Text>
            {showLabel && (
              <Text
                style={[
                  styles.unavailableLabel,
                  { color: colors.onSurfaceVariant, fontFamily: fonts.body },
                ]}
              >
                N/A
              </Text>
            )}
          </>
        ) : (
          <>
            <Text
              style={[
                styles.percentText,
                {
                  color: ringColor,
                  fontFamily: fonts.display,
                  fontSize: size * 0.28,
                },
              ]}
            >
              {numericValue}%
            </Text>
            {showLabel && (
              <Text
                style={[
                  styles.batterySubLabel,
                  { color: colors.onSurfaceVariant, fontFamily: fonts.label },
                ]}
              >
                BATTERY
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    fontWeight: '700',
    lineHeight: 26,
  },
  batterySubLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  questionMark: {
    fontSize: 22,
    fontWeight: '700',
  },
  unavailableLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
