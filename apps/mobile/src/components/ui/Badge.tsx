import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface BadgeProps {
  count?: number;
  variant?: 'primary' | 'danger' | 'success' | 'accent';
  size?: 'sm' | 'md';
}

const BG_MAP: Record<NonNullable<BadgeProps['variant']>, string> = {
  primary: colors.primary,
  danger: colors.danger,
  success: colors.success,
  accent: colors.accent,
};

export function Badge({ count, variant = 'danger', size = 'md' }: BadgeProps) {
  if (!count || count === 0) return null;

  const bg = BG_MAP[variant];
  const dim = size === 'sm' ? 16 : 20;
  const fontSize = size === 'sm' ? 9 : 11;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, minWidth: dim, height: dim },
      ]}
    >
      <Text style={[styles.text, { fontSize }]}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 100,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFF',
    fontWeight: '700',
  },
});
