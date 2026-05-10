import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { vybeonTheme } from "./theme";
export function PlaceCard({ name, category, activeUsers, vibeScore, onPress, style, }) {
    return (_jsx(Pressable, { onPress: onPress, style: ({ pressed }) => [styles.press, pressed && { opacity: 0.92 }, style], children: _jsxs(LinearGradient, { colors: ["rgba(124, 58, 237, 0.18)", "rgba(10, 10, 10, 0.9)"], style: styles.shell, children: [_jsxs(View, { style: styles.top, children: [_jsx(Text, { style: styles.name, children: name }), _jsx(Text, { style: styles.cat, children: category })] }), _jsxs(View, { style: styles.stats, children: [_jsx(Text, { style: styles.statLabel, children: "Live" }), _jsx(Text, { style: styles.statValue, children: activeUsers }), _jsx(View, { style: styles.divider }), _jsx(Text, { style: styles.statLabel, children: "Vibe" }), _jsx(Text, { style: styles.statValue, children: Math.round(vibeScore * 100) })] })] }) }));
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
