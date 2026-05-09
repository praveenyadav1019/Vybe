import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { vybeonTheme } from "./theme";

export interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function InputField({ label, error, containerStyle, style, ...rest }: InputFieldProps) {
  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={vybeonTheme.colors.subtext}
        style={[styles.input, error && styles.inputError, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: vybeonTheme.colors.subtext,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: vybeonTheme.colors.border,
    backgroundColor: vybeonTheme.colors.card,
    borderRadius: vybeonTheme.radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: vybeonTheme.colors.text,
    fontSize: 16,
  },
  inputError: { borderColor: vybeonTheme.colors.danger },
  error: { color: vybeonTheme.colors.danger, marginTop: 6, fontSize: 12 },
});
