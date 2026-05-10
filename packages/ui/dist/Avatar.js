import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Image, StyleSheet, Text, View } from "react-native";
import { vybeonTheme } from "./theme";
export function Avatar({ uri, name, size = 48, verified, style }) {
    const initials = (name ?? "?")
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    return (_jsxs(View, { style: [styles.wrap, { width: size, height: size, borderRadius: size / 2 }, style], children: [uri ? (_jsx(Image, { source: { uri }, style: { width: size, height: size, borderRadius: size / 2 } })) : (_jsx(View, { style: [
                    styles.fallback,
                    { width: size, height: size, borderRadius: size / 2 },
                ], children: _jsx(Text, { style: [styles.fallbackText, { fontSize: size * 0.35 }], children: initials }) })), verified ? (_jsx(View, { style: [styles.badge, { right: size * 0.02, bottom: size * 0.02 }], children: _jsx(Text, { style: styles.badgeText, children: "\u2713" }) })) : null] }));
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
