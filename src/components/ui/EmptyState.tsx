import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../theme';
import { ButtonRow } from './ButtonRow';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionPrimary?: React.ReactNode;
  actionSecondary?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon,
  title,
  description,
  actionPrimary,
  actionSecondary,
  style,
}: EmptyStateProps) {
  const { theme } = useTheme();
  const { colors, fonts } = theme;

  const hasActions = Boolean(actionPrimary || actionSecondary);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>{icon}</View>
      <Text style={[styles.title, { color: colors.onSurface, fontFamily: fonts.headline }]}>
        {title}
      </Text>
      <Text style={[styles.description, { color: colors.onSurfaceVariant, fontFamily: fonts.body }]}>
        {description}
      </Text>
      {hasActions && (
        <View style={styles.actionsContainer}>
          <ButtonRow gap={10} align="center" equal={Boolean(actionPrimary && actionSecondary)}>
            {actionPrimary}
            {actionSecondary}
          </ButtonRow>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  iconContainer: {
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 290,
  },
  actionsContainer: {
    marginTop: 18,
    width: '100%',
  },
});
