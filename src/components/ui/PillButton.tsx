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
    const minHeight = size === 'sm' ? 38 : size === 'lg' ? 54 : 48;
    const paddingHorizontal = size === 'sm' ? 14 : size === 'lg' ? 24 : 20;

    let bg = colors.primary;
    let border = 'transparent';
    let borderWidth = 0;

    switch (variant) {
      case 'primary':
        bg = colors.electricViolet;
        border = colors.electricViolet;
        break;
      case 'secondary':
        bg = theme.dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(94, 57, 224, 0.08)';
        border = theme.dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(94, 57, 224, 0.20)';
        borderWidth = 1;
        break;
      case 'ghost':
        bg = 'transparent';
        border = 'transparent';
        break;
      case 'danger':
        bg = theme.dark ? 'rgba(255, 79, 216, 0.10)' : 'rgba(186, 26, 26, 0.10)';
        border = theme.dark ? colors.error : colors.error;
        borderWidth = 1;
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
    let color = colors.onPrimary;
    const fontSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

    switch (variant) {
      case 'primary':
        color = '#FFFFFF';
        break;
      case 'secondary':
        color = colors.onSurface;
        break;
      case 'ghost':
        color = colors.limeNeon;
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
      letterSpacing: 0.3,
    };
  };

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[styles.base, getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#FFFFFF' : colors.primary}
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
