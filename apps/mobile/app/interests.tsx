import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Button, ModeChip } from "@vybeon/ui";
import { useUserStore } from "../src/stores/userStore";
import { apiFetch } from "../src/lib/api";
import { useAuthStore } from "../src/stores/authStore";

const POOL = ["Techno", "House", "Night drives", "Afters", "Travel", "Clubs", "Rooftops", "Zero drama"];

export default function InterestsScreen() {
  const token = useAuthStore((s) => s.token);
  const setProfile = useUserStore((s) => s.setProfile);
  const [picked, setPicked] = useState<string[]>(["Techno", "Clubs"]);
  const [loading, setLoading] = useState(false);

  function toggle(x: string) {
    setPicked((p) => (p.includes(x) ? p.filter((i) => i !== x) : [...p, x]));
  }

  async function next() {
    setLoading(true);
    try {
      await apiFetch("/me/interests", {
        method: "POST",
        token,
        body: JSON.stringify({ interests: picked }),
      });
      setProfile({ interests: picked });
      router.push("/face-verification");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-background px-5 pt-16">
      <Text className="text-3xl font-bold text-foreground">Interests</Text>
      <Text className="mt-2 text-subtext">We’ll match vibes, not coordinates.</Text>
      <ScrollView className="mt-8" contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {POOL.map((p) => (
          <ModeChip key={p} label={p} active={picked.includes(p)} onPress={() => toggle(p)} />
        ))}
      </ScrollView>
      <View className="mt-auto mb-10">
        <Button title="Continue" onPress={next} loading={loading} />
      </View>
    </View>
  );
}
