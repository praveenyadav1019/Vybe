import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Mode } from '../../types';

interface ModeChipProps {
  mode: Mode;
  size?: 'xs' | 'sm' | 'md';
}

const MODE_CONFIG: Record<Mode, { label: string; color: string; emoji: string }> = {
  dating:       { label: 'Dating',     color: '#FF4D6D', emoji: '💕' },
  hook:         { label: 'Hook',       color: '#FF6B35', emoji: '🔥' },
  'co-travel':  { label: 'Co-Travel',  color: '#4CAF50', emoji: '✈️' },
  'night-out':  { label: 'Night Out',  color: '#7C3AED', emoji: '🌙' },
  'club-mates': { label: 'Club Mates', color: '#00E5FF', emoji: '🎵' },
  casual:       { label: 'Casual',     color: '#A1A1AA', emoji: '👋' },
};

export function ModeChip({ mode, size = 'sm' }: ModeChipProps) {
  const cfg = MODE_CONFIG[mode];

  const px = size === 'xs' ? 6 : size === 'sm' ? 10 : 14;
  const py = size === 'xs' ? 2 : size === 'sm' ? 4  : 6;
  const fontSize = size === 'xs' ? 9 : size === 'sm' ? 11 : 13;

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: `${cfg.color}22`,
          borderColor: `${cfg.color}44`,
          paddingHorizontal: px,
          paddingVertical: py,
        },
      ]}
    >
      <Text style={{ fontSize: fontSize - 1 }}>{cfg.emoji}</Text>
      <Text style={[styles.label, { color: cfg.color, fontSize }]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  label: {
    fontWeight: '600',
  },
});
