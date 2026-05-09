import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from "react-native";
import { vybeonTheme } from "./theme";

type Variant = "primary" | "outline" | "ghost";

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "outline" && styles.outline,
        variant === "ghost" && styles.ghost,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? vybeonTheme.colors.text : vybeonTheme.colors.primary}
        />
      ) : (
        <Text
          style={[
            styles.text,
            variant === "primary" && styles.textPrimary,
            variant === "outline" && styles.textOutline,
            variant === "ghost" && styles.textGhost,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: vybeonTheme.space(5),
    borderRadius: vybeonTheme.radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: vybeonTheme.colors.primary,
    shadowColor: vybeonTheme.colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  outline: {
    borderWidth: 1,
    borderColor: vybeonTheme.colors.border,
    backgroundColor: "transparent",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
  textPrimary: { color: vybeonTheme.colors.text },
  textOutline: { color: vybeonTheme.colors.text },
  textGhost: { color: vybeonTheme.colors.accent },
});
