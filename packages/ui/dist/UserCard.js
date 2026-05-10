import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { vybeonTheme } from "./theme";
import { Avatar } from "./Avatar";
function bucketLabel(bucket) {
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
export function UserCard({ name, subtitle, photoUrl, verified, distanceBucket, venueLabel, onPress, style, }) {
    return (_jsx(Pressable, { onPress: onPress, style: ({ pressed }) => [styles.press, pressed && { opacity: 0.92 }, style], children: _jsx(LinearGradient, { colors: ["rgba(124, 58, 237, 0.22)", "rgba(0, 229, 255, 0.12)"], start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, style: styles.glowBorder, children: _jsxs(View, { style: styles.card, children: [_jsx(Avatar, { uri: photoUrl, name: name, verified: verified, size: 56 }), _jsxs(View, { style: styles.meta, children: [_jsx(Text, { style: styles.name, children: name }), subtitle ? _jsx(Text, { style: styles.sub, children: subtitle }) : null, _jsxs(View, { style: styles.row, children: [_jsx(Text, { style: styles.chip, children: bucketLabel(distanceBucket) }), venueLabel ? _jsx(Text, { style: styles.venue, children: venueLabel }) : null] })] })] }) }) }));
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
