import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';

export interface ActionStackProps {
  children: React.ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

export function ActionStack({
  children,
  gap = 10,
  style,
}: ActionStackProps) {
  const childArray = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.stack, { gap }, style]}>
      {childArray.map((child, index) => (
        <View key={index} style={styles.item}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: '100%',
    flexDirection: 'column',
  },
  item: {
    width: '100%',
  },
});
