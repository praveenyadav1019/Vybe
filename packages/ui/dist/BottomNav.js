import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { vybeonTheme } from "./theme";
export function BottomNav({ items, active, onChange, style }) {
    return (_jsx(View, { style: [styles.wrap, style], children: _jsx(BlurView, { intensity: 40, tint: "dark", style: styles.blur, children: _jsx(View, { style: styles.row, children: items.map((item) => {
                    const isActive = item.key === active;
                    return (_jsxs(Pressable, { onPress: () => onChange(item.key), style: styles.item, accessibilityRole: "tab", accessibilityState: { selected: isActive }, children: [_jsx(Text, { style: [styles.icon, isActive && styles.iconActive], children: item.icon }), _jsx(Text, { style: [styles.label, isActive && styles.labelActive], children: item.label })] }, item.key));
                }) }) }) }));
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
