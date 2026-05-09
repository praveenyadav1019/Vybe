import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { vybeonTheme } from "./theme";

export interface ModeChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function ModeChip({ label, active, onPress, style }: ModeChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        active && styles.active,
        pressed && { opacity: 0.9 },
        style,
      ]}
    >
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: vybeonTheme.colors.border,
    backgroundColor: vybeonTheme.colors.card,
  },
  active: {
    borderColor: vybeonTheme.colors.primary,
    backgroundColor: "rgba(124, 58, 237, 0.22)",
    shadowColor: vybeonTheme.colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  text: { color: vybeonTheme.colors.subtext, fontWeight: "600", fontSize: 13 },
  textActive: { color: vybeonTheme.colors.text },
});
