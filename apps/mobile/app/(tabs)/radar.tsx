import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Text, View, type ViewStyle } from "react-native";
import { router } from "expo-router";
import { RadarDot, Button } from "@vybeon/ui";
import { useUIStore } from "../../src/stores/uiStore";

const MOCK = [
  { id: "1", x: "22%", y: "32%" },
  { id: "2", x: "68%", y: "44%" },
  { id: "3", x: "48%", y: "62%" },
];

export default function RadarScreen() {
  const radius = useUIStore((s) => s.radarRadiusM);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const rings = useMemo(
    () =>
      [0, 1, 2].map((i) => {
        const scale = pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9 + i * 0.12, 1.25 + i * 0.18],
        });
        const opacity = pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.35 - i * 0.08, 0.05],
        });
        return { scale, opacity, key: i };
      }),
    [pulse]
  );

  return (
    <View className="flex-1 bg-background px-5 pt-14">
      <Text className="text-3xl font-extrabold text-foreground">Radar</Text>
      <Text className="mt-2 text-subtext">Radius ~{radius}m • exact GPS never shown</Text>

      <View className="mt-6 h-[420px] w-full items-center justify-center rounded-3xl border border-border bg-card">
        {rings.map((r) => (
          <Animated.View
            key={r.key}
            style={{
              position: "absolute",
              width: 280,
              height: 280,
              borderRadius: 280 / 2,
              borderWidth: 1,
              borderColor: "rgba(0, 229, 255, 0.35)",
              opacity: r.opacity as unknown as number,
              transform: [{ scale: r.scale }],
            }}
          />
        ))}
        <View className="absolute right-4 top-4 rounded-full bg-background/70 px-3 py-1">
          <Text className="text-xs text-accent">Live</Text>
        </View>
        {MOCK.map((m, idx) => (
          <View
            key={m.id}
            className="absolute"
            style={{ left: m.x, top: m.y } as ViewStyle}
          >
            <RadarDot delayMs={idx * 220} />
          </View>
        ))}
      </View>

      <View className="mt-6 flex-row gap-3">
        <View className="flex-1">
          <Button title="List view" variant="outline" onPress={() => router.push("/nearby-list")} />
        </View>
        <View className="flex-1">
          <Button title="Happening" variant="ghost" onPress={() => router.push("/(tabs)/places")} />
        </View>
      </View>
    </View>
  );
}
