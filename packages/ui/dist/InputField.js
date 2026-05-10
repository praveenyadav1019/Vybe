import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { vybeonTheme } from "./theme";
export function InputField({ label, error, containerStyle, style, ...rest }) {
    return (_jsxs(View, { style: containerStyle, children: [label ? _jsx(Text, { style: styles.label, children: label }) : null, _jsx(TextInput, { placeholderTextColor: vybeonTheme.colors.subtext, style: [styles.input, error && styles.inputError, style], ...rest }), error ? _jsx(Text, { style: styles.error, children: error }) : null] }));
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
