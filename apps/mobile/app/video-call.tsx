import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button } from "@vybeon/ui";
import { router } from "expo-router";

export default function VideoCallScreen() {
  return (
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={["rgba(124,58,237,0.35)", "rgba(0,0,0,0.85)"]}
        className="flex-1 items-center justify-center px-6"
      >
        <Text className="text-xs font-semibold uppercase tracking-widest text-accent">Video</Text>
        <Text className="mt-4 text-3xl font-extrabold text-foreground">Verified call</Text>
        <Text className="mt-2 text-center text-subtext">Full-screen overlay • minimal chrome</Text>
        <View className="absolute bottom-10 w-full">
          <Button title="Hang up" variant="outline" onPress={() => router.back()} />
        </View>
      </LinearGradient>
    </View>
  );
}
