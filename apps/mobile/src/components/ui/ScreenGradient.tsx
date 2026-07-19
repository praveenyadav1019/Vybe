import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Premium ambient background — a layered "aurora mesh" built from several
 * overlapping translucent gradients (no hard-edged circles). Gives frosted
 * glass a rich, blended canvas to read against. Absolutely fills its parent;
 * render it first, then content on top.
 */
export function ScreenGradient({ style }: { style?: ViewStyle }) {
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {/* Base: soft lavender → blush, top-left to bottom-right */}
      <LinearGradient
        colors={['#ECE4FF', '#F3ECFF', '#FBEFF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Violet aurora glowing in from the top-right */}
      <LinearGradient
        colors={['rgba(139,92,246,0.34)', 'rgba(139,92,246,0.08)', 'transparent']}
        locations={[0, 0.35, 0.7]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.1, y: 0.75 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Cool cyan glow rising from the bottom-left */}
      <LinearGradient
        colors={['transparent', 'rgba(56,189,248,0.10)', 'rgba(56,189,248,0.22)']}
        locations={[0.45, 0.8, 1]}
        start={{ x: 0.6, y: 0.35 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Warm rose wash along the bottom for depth */}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(244,114,182,0.16)']}
        locations={[0, 0.62, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle light sheen at the very top */}
      <LinearGradient
        colors={['rgba(255,255,255,0.55)', 'transparent']}
        locations={[0, 0.22]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
