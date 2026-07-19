import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button } from "@vybeon/ui";
import { router } from "expo-router";

/**
 * Legacy audio-call placeholder. The real audio call screen is
 * `app/(app)/calls/audio.tsx`, which uses the self-hosted WebRTC engine
 * (`@/lib/rtc/useWebRTCCall`).
 */
export default function AudioCallScreen() {
  return (
    <LinearGradient colors={["#0A0A0A", "#120a1f"]} className="flex-1 px-6 pt-16">
      <Text className="text-center text-xs font-semibold uppercase tracking-widest text-accent">Audio</Text>
      <Text className="mt-6 text-center text-3xl font-extrabold text-foreground">Avery</Text>
      <Text className="mt-2 text-center text-subtext">Self-hosted WebRTC (STUN/TURN via coturn)</Text>
      <View className="mt-auto mb-10">
        <Button title="End call" variant="outline" onPress={() => router.back()} />
      </View>
    </LinearGradient>
  );
}
