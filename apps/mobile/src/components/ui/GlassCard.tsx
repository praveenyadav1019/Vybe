import React from 'react';
import { View, type ViewStyle, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** BlurView intensity (0-100). Default 20. */
  intensity?: number;
  noPadding?: boolean;
}

export function GlassCard({
  children,
  style,
  intensity = 20,
  noPadding = false,
}: GlassCardProps) {
  return (
    <View style={[styles.container, style]}>
      <BlurView intensity={intensity} style={StyleSheet.absoluteFill} />
      <View style={[styles.border, StyleSheet.absoluteFill]} />
      <View style={noPadding ? undefined : styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  border: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  content: {
    padding: 16,
  },
});
