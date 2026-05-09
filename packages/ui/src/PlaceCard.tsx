import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { vybeonTheme } from "./theme";

export interface PlaceCardProps {
  name: string;
  category: string;
  activeUsers: number;
  vibeScore: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export function PlaceCard({
  name,
  category,
  activeUsers,
  vibeScore,
  onPress,
  style,
}: PlaceCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.press, pressed && { opacity: 0.92 }, style]}>
      <LinearGradient
        colors={["rgba(124, 58, 237, 0.18)", "rgba(10, 10, 10, 0.9)"]}
        style={styles.shell}
      >
        <View style={styles.top}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.cat}>{category}</Text>
        </View>
        <View style={styles.stats}>
          <Text style={styles.statLabel}>Live</Text>
          <Text style={styles.statValue}>{activeUsers}</Text>
          <View style={styles.divider} />
          <Text style={styles.statLabel}>Vibe</Text>
          <Text style={styles.statValue}>{Math.round(vibeScore * 100)}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { borderRadius: vybeonTheme.radii.xl },
  shell: {
    borderRadius: vybeonTheme.radii.xl,
    padding: vybeonTheme.space(4),
    borderWidth: 1,
    borderColor: vybeonTheme.colors.border,
    gap: vybeonTheme.space(3),
  },
  top: { gap: 4 },
  name: { color: vybeonTheme.colors.text, fontSize: 18, fontWeight: "800" },
  cat: { color: vybeonTheme.colors.subtext, fontSize: 13 },
  stats: { flexDirection: "row", alignItems: "center", gap: 10 },
  statLabel: { color: vybeonTheme.colors.subtext, fontSize: 12 },
  statValue: { color: vybeonTheme.colors.accent, fontSize: 16, fontWeight: "800" },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: vybeonTheme.colors.border,
    marginHorizontal: 4,
  },
});
