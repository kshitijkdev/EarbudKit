import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { useTheme } from '../../theme';

export type PillButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type PillButtonSize = 'sm' | 'md' | 'lg';

export interface PillButtonProps {
  label: string;
  onPress: () => void;
  variant?: PillButtonVariant;
  size?: PillButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function PillButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  labelStyle,
  testID,
}: PillButtonProps) {
  const { theme } = useTheme();
  const { colors, fonts, borderRadius } = theme;

  const getContainerStyle = (): ViewStyle => {
    // Soft Studio heights: md = 50px, sm = 36px, lg = 54px
    const minHeight = size === 'sm' ? 36 : size === 'lg' ? 54 : 50;
    const paddingHorizontal = size === 'sm' ? 14 : size === 'lg' ? 24 : 20;

    let bg = colors.primary;
    let border = 'transparent';
    let borderWidth = 0;

    switch (variant) {
      case 'primary':
        bg = colors.primary;
        border = colors.primary;
        break;
      case 'secondary':
        bg = colors.surfaceContainerHigh;
        border = colors.hairline;
        borderWidth = 0.5;
        break;
      case 'ghost':
        bg = 'transparent';
        border = 'transparent';
        break;
      case 'danger':
        bg = colors.errorContainer;
        border = colors.error;
        borderWidth = 0.5;
        break;
    }

    return {
      minHeight,
      paddingHorizontal,
      backgroundColor: bg,
      borderColor: border,
      borderWidth,
      borderRadius: borderRadius.full,
      opacity: disabled ? 0.45 : 1,
    };
  };

  const getLabelStyle = (): TextStyle => {
    let color = '#FFFFFF';
    const fontSize = size === 'sm' ? 13 : 16;

    switch (variant) {
      case 'primary':
        color = colors.onPrimary;
        break;
      case 'secondary':
        color = colors.onSurface;
        break;
      case 'ghost':
        color = colors.primary;
        break;
      case 'danger':
        color = colors.error;
        break;
    }

    return {
      color,
      fontSize,
      fontFamily: fonts.label,
      fontWeight: '600',
      letterSpacing: -0.2,
    };
  };

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.base, getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.onPrimary : colors.primary}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text style={[getLabelStyle(), labelStyle]}>{label}</Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
