import React from "react";
import { Image, StyleSheet, Text, View, ViewStyle } from "react-native";
import { vybeonTheme } from "./theme";

export interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  verified?: boolean;
  style?: ViewStyle;
}

export function Avatar({ uri, name, size = 48, verified, style }: AvatarProps) {
  const initials = (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.fallbackText, { fontSize: size * 0.35 }]}>{initials}</Text>
        </View>
      )}
      {verified ? (
        <View style={[styles.badge, { right: size * 0.02, bottom: size * 0.02 }]}>
          <Text style={styles.badgeText}>✓</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    borderWidth: 1,
    borderColor: vybeonTheme.colors.border,
    overflow: "hidden",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: vybeonTheme.colors.card,
  },
  fallbackText: {
    color: vybeonTheme.colors.text,
    fontWeight: "700",
  },
  badge: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: vybeonTheme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: vybeonTheme.colors.background,
  },
  badgeText: {
    color: vybeonTheme.colors.background,
    fontSize: 10,
    fontWeight: "900",
    marginTop: -1,
  },
});
