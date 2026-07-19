import React from 'react';
import { View, type ViewStyle, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** BlurView intensity (0-100). Default 20. */
  intensity?: number;
  noPadding?: boolean;
  /**
   * Glass tint. 'dark' (default) = subtle white-on-dark frost (legacy screens).
   * 'light' = bright frosted glass for the light gradient theme.
   */
  tint?: 'light' | 'dark';
  /** Corner radius. Default 20. */
  radius?: number;
}

export function GlassCard({
  children,
  style,
  intensity,
  noPadding = false,
  tint = 'dark',
  radius = 20,
}: GlassCardProps) {
  const light = tint === 'light';
  return (
    <View style={[styles.container, { borderRadius: radius }, light && styles.lightBg, style]}>
      <BlurView
        intensity={intensity ?? (light ? 40 : 20)}
        tint={light ? 'light' : 'default'}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius, borderWidth: 1 },
          light ? styles.lightBorder : styles.darkBorder,
        ]}
      />
      <View style={noPadding ? undefined : styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  lightBg: { backgroundColor: 'rgba(255,255,255,0.55)' },
  darkBorder: { borderColor: 'rgba(255,255,255,0.08)' },
  lightBorder: { borderColor: 'rgba(255,255,255,0.7)' },
  content: {
    padding: 16,
  },
});
