import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button } from "@vybeon/ui";
import { router } from "expo-router";

export default function PremiumScreen() {
  return (
    <View className="flex-1 bg-background px-5 pt-14">
      <LinearGradient colors={["#1a0b2e", "#0A0A0A"]} className="rounded-3xl border border-border p-6">
        <Text className="text-xs font-semibold uppercase tracking-widest text-accent">VYBEON+</Text>
        <Text className="mt-3 text-3xl font-extrabold text-foreground">Premium</Text>
        <Text className="mt-3 text-subtext">Boost radar range, see richer happening signals, and priority SOS routing.</Text>
        <View className="mt-8">
          <Button title="Coming soon" onPress={() => router.back()} />
        </View>
      </LinearGradient>
    </View>
  );
}
