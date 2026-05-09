import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { vybeonTheme } from "./theme";

export type BottomNavKey = "home" | "radar" | "chat" | "places" | "profile";

export interface BottomNavItem {
  key: BottomNavKey;
  label: string;
  icon: string;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  active: BottomNavKey;
  onChange: (key: BottomNavKey) => void;
  style?: ViewStyle;
}

export function BottomNav({ items, active, onChange, style }: BottomNavProps) {
  return (
    <View style={[styles.wrap, style]}>
      <BlurView intensity={40} tint="dark" style={styles.blur}>
        <View style={styles.row}>
          {items.map((item) => {
            const isActive = item.key === active;
            return (
              <Pressable
                key={item.key}
                onPress={() => onChange(item.key)}
                style={styles.item}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.icon, isActive && styles.iconActive]}>{item.icon}</Text>
                <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: vybeonTheme.radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: vybeonTheme.colors.border,
  },
  blur: { paddingVertical: 10, paddingHorizontal: 6 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  item: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 4 },
  icon: { fontSize: 18, opacity: 0.55 },
  iconActive: { opacity: 1, textShadowColor: vybeonTheme.colors.accent, textShadowRadius: 12 },
  label: { color: vybeonTheme.colors.subtext, fontSize: 11, fontWeight: "600" },
  labelActive: { color: vybeonTheme.colors.text },
});
