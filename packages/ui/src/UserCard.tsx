import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { vybeonTheme } from "./theme";
import { Avatar } from "./Avatar";
import type { DistanceBucket } from "@vybeon/types";

export interface UserCardProps {
  name: string;
  subtitle?: string;
  photoUrl?: string;
  verified?: boolean;
  distanceBucket?: DistanceBucket;
  venueLabel?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

function bucketLabel(bucket?: DistanceBucket) {
  switch (bucket) {
    case "same_place":
      return "Same place";
    case "under_100m":
      return "< 100m";
    case "nearby":
      return "Nearby";
    default:
      return "Around you";
  }
}

export function UserCard({
  name,
  subtitle,
  photoUrl,
  verified,
  distanceBucket,
  venueLabel,
  onPress,
  style,
}: UserCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.press, pressed && { opacity: 0.92 }, style]}>
      <LinearGradient
        colors={["rgba(124, 58, 237, 0.22)", "rgba(0, 229, 255, 0.12)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glowBorder}
      >
        <View style={styles.card}>
          <Avatar uri={photoUrl} name={name} verified={verified} size={56} />
          <View style={styles.meta}>
            <Text style={styles.name}>{name}</Text>
            {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
            <View style={styles.row}>
              <Text style={styles.chip}>{bucketLabel(distanceBucket)}</Text>
              {venueLabel ? <Text style={styles.venue}>{venueLabel}</Text> : null}
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { borderRadius: vybeonTheme.radii.xl },
  glowBorder: {
    borderRadius: vybeonTheme.radii.xl,
    padding: 1,
  },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: vybeonTheme.space(4),
    borderRadius: vybeonTheme.radii.xl - 1,
    backgroundColor: vybeonTheme.colors.glass,
    borderWidth: 1,
    borderColor: vybeonTheme.colors.border,
  },
  meta: { flex: 1, gap: 4, justifyContent: "center" },
  name: { color: vybeonTheme.colors.text, fontSize: 17, fontWeight: "700" },
  sub: { color: vybeonTheme.colors.subtext, fontSize: 13 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    color: vybeonTheme.colors.accent,
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0, 229, 255, 0.12)",
    overflow: "hidden",
  },
  venue: {
    color: vybeonTheme.colors.subtext,
    fontSize: 12,
    flexShrink: 1,
  },
});
