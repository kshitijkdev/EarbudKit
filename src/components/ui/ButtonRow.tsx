import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';

export interface ButtonRowProps {
  children: React.ReactNode;
  gap?: number;
  align?: 'center' | 'start' | 'stretch';
  equal?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ButtonRow({
  children,
  gap = 10,
  align = 'center',
  equal = false,
  style,
}: ButtonRowProps) {
  const getJustifyContent = (): ViewStyle['justifyContent'] => {
    switch (align) {
      case 'start':
        return 'flex-start';
      case 'stretch':
        return 'space-between';
      case 'center':
      default:
        return 'center';
    }
  };

  const childArray = React.Children.toArray(children).filter(Boolean);

  return (
    <View
      style={[
        styles.row,
        {
          gap,
          justifyContent: getJustifyContent(),
          alignItems: 'center',
        },
        style,
      ]}
    >
      {childArray.map((child, index) => (
        <View
          key={index}
          style={[
            equal ? styles.equalItem : styles.item,
            align === 'stretch' && styles.stretchItem,
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  item: {
    flexShrink: 1,
  },
  equalItem: {
    flex: 1,
    minWidth: 120,
  },
  stretchItem: {
    flex: 1,
  },
});
