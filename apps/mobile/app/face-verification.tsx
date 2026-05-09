import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@vybeon/ui";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "../src/lib/api";
import { useAuthStore } from "../src/stores/authStore";
import { useUserStore } from "../src/stores/userStore";

export default function FaceVerificationScreen() {
  const token = useAuthStore((s) => s.token);
  const setProfile = useUserStore((s) => s.setProfile);
  const [loading, setLoading] = useState(false);

  async function mockVerify() {
    setLoading(true);
    try {
      await apiFetch("/me/verify-face", { method: "POST", token, body: JSON.stringify({}) });
      setProfile({ verified: true });
      router.push("/permissions");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-background px-5 pt-16">
      <Text className="text-3xl font-bold text-foreground">Face check</Text>
      <Text className="mt-2 text-subtext">Mock liveness UI — production plugs into your provider.</Text>
      <LinearGradient
        colors={["rgba(124,58,237,0.35)", "rgba(0,229,255,0.15)"]}
        className="mt-10 h-72 w-full items-center justify-center rounded-3xl border border-border"
      >
        <View className="h-40 w-40 rounded-full border-2 border-accent/60" />
        <Text className="mt-6 text-subtext">Align your face inside the ring</Text>
      </LinearGradient>
      <View className="mt-10">
        <Button title="Complete verification" onPress={mockVerify} loading={loading} />
      </View>
    </View>
  );
}
