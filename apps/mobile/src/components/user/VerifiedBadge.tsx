import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface VerifiedBadgeProps {
  size?: number;
  /** Use accent colour (cyan) for main badge, or primary (purple) for alternate */
  variant?: 'accent' | 'primary';
}

export function VerifiedBadge({ size = 16, variant = 'accent' }: VerifiedBadgeProps) {
  const bg = variant === 'accent' ? colors.accent : colors.primary;
  const dim = size + 4;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, width: dim, height: dim, borderRadius: dim / 2 },
      ]}
    >
      <Ionicons name="checkmark" size={size - 4} color="#000" />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
