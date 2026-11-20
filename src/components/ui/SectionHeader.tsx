import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../theme';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onActionPress?: () => void;
  actionNode?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SectionHeader({
  title,
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
                color: colors.electricViolet,
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
    paddingVertical: 8,
    marginBottom: 6,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
