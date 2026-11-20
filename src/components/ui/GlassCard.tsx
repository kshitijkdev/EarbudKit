import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme';

export interface GlassCardProps {
  children: React.ReactNode;
  active?: boolean;
  glow?: boolean;
  glowColor?: string;
  blur?: boolean;
  blurIntensity?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  activeOpacity?: number;
  testID?: string;
}

export function GlassCard({
  children,
  active = false,
  glow = false,
  glowColor,
  blur = false,
  blurIntensity = 20,
  style,
  contentStyle,
  onPress,
  activeOpacity = 0.8,
  testID,
}: GlassCardProps) {
  const { theme } = useTheme();
  const { colors, borderRadius } = theme;

  const resolvedGlowColor = glowColor ?? colors.electricViolet;
  const isGlowing = glow || active;

  const cardStyle: ViewStyle = {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: active
      ? colors.glassActiveBorder
      : colors.glassBorder,
    backgroundColor: active
      ? colors.glassActiveFill
      : colors.glassFill,
    overflow: 'hidden',
    ...(isGlowing
      ? Platform.select({
          ios: {
            shadowColor: resolvedGlowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
          },
          android: {
            elevation: active ? 4 : 2,
          },
        })
      : null),
  };

  const innerContent = (
    <View style={[styles.inner, contentStyle]}>
      {children}
    </View>
  );

  const containerContent = blur && Platform.OS === 'ios' ? (
    <BlurView
      intensity={blurIntensity}
      tint={theme.dark ? 'dark' : 'light'}
      style={StyleSheet.absoluteFill}
    >
      {innerContent}
    </BlurView>
  ) : (
    innerContent
  );

  if (onPress) {
    return (
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        activeOpacity={activeOpacity}
        style={[cardStyle, style]}
      >
        {containerContent}
      </TouchableOpacity>
    );
  }

  return (
    <View testID={testID} style={[cardStyle, style]}>
      {containerContent}
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    padding: 16,
  },
});
