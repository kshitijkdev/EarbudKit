import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../theme';

export interface SectionHeaderProps {
  title: string;
  category?: string;
  subtitle?: string;
  actionText?: string;
  onActionPress?: () => void;
  actionNode?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SectionHeader({
  title,
  category,
  subtitle,
  actionText,
  onActionPress,
  actionNode,
  style,
  testID,
}: SectionHeaderProps) {
  const { theme } = useTheme();
  const { colors, fonts } = theme;

  return (
    <View testID={testID} style={[styles.container, style]}>
      <View style={styles.textContainer}>
        {category ? (
          <Text
            style={[
              styles.category,
              {
                color: colors.primary,
                fontFamily: fonts.label,
              },
            ]}
          >
            {category}
          </Text>
        ) : null}
        <Text
          style={[
            styles.title,
            {
              color: colors.onSurface,
              fontFamily: fonts.headline,
            },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              {
                color: colors.onSurfaceVariant,
                fontFamily: fonts.body,
              },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {actionNode ? (
        actionNode
      ) : actionText && onActionPress ? (
        <TouchableOpacity
          onPress={onActionPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text
            style={[
              styles.actionText,
              {
                color: colors.primary,
                fontFamily: fonts.label,
              },
            ]}
          >
            {actionText}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 6,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  category: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
