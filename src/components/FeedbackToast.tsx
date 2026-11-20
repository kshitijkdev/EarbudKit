import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme';

interface FeedbackToastProps {
  message: string | null;
  onDismiss?: () => void;
  duration?: number;
}

export function FeedbackToast({ message, onDismiss, duration = 2200 }: FeedbackToastProps) {
  const { theme } = useTheme();
  const { colors, borderRadius } = theme;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    if (message) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -8,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss?.();
        });
      }, duration);

      return () => clearTimeout(timer);
    } else {
      opacity.setValue(0);
      translateY.setValue(-12);
    }
  }, [message, duration, onDismiss, opacity, translateY]);

  if (!message) return null;

  const isSuccess = message.startsWith('✓');
  const isWarning = message.startsWith('⚠️') || message.includes('cancelled') || message.includes('disabled');

  const bgColor = isSuccess
    ? colors.primaryContainer
    : isWarning
    ? colors.surfaceVariant
    : colors.secondaryContainer;

  const textColor = isSuccess
    ? colors.onPrimaryContainer
    : isWarning
    ? colors.onSurface
    : colors.onSecondaryContainer;

  const borderColor = isSuccess ? colors.primary : colors.outlineVariant;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toastContainer,
        {
          backgroundColor: bgColor,
          borderColor,
          borderRadius: borderRadius.full,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={[styles.toastText, { color: textColor }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    marginHorizontal: 16,
    marginVertical: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
