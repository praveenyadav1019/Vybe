import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { vybeonTheme } from "./theme";
export function RadarDot({ delayMs = 0, size = 12, style }) {
    const pulse = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const anim = Animated.loop(Animated.sequence([
            Animated.delay(delayMs),
            Animated.timing(pulse, {
                toValue: 1,
                duration: 1600,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(pulse, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
            }),
        ]));
        anim.start();
        return () => anim.stop();
    }, [delayMs, pulse]);
    const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
    const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0.15] });
    return (_jsxs(View, { style: [styles.wrap, style], children: [_jsx(Animated.View, { style: [
                    styles.ring,
                    {
                        width: size * 3.2,
                        height: size * 3.2,
                        borderRadius: (size * 3.2) / 2,
                        opacity,
                        transform: [{ scale }],
                    },
                ] }), _jsx(View, { style: [
                    styles.core,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        shadowColor: vybeonTheme.colors.accent,
                        shadowOpacity: 0.9,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 0 },
                    },
                ] })] }));
}
const styles = StyleSheet.create({
    wrap: { alignItems: "center", justifyContent: "center" },
    ring: {
        position: "absolute",
        borderWidth: 1,
        borderColor: vybeonTheme.colors.accent,
        backgroundColor: "rgba(0, 229, 255, 0.08)",
    },
    core: {
        backgroundColor: vybeonTheme.colors.accent,
        borderWidth: 2,
        borderColor: vybeonTheme.colors.background,
    },
});
