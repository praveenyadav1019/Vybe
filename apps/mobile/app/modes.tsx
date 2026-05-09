import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { ModeChip, Button } from "@vybeon/ui";
import { useUserStore } from "../src/stores/userStore";
import type { AppMode } from "@vybeon/types";

const MODES: { id: AppMode; label: string; hint: string }[] = [
  { id: "dating", label: "Dating Mode", hint: "Slow burns, explicit consent on every step." },
  { id: "hook", label: "Hook Mode", hint: "Verified-only. Strict consent gates." },
  { id: "co_travel", label: "Co-Travel", hint: "Airports, trains, shared rides." },
  { id: "night_out", label: "Night Out / Drive", hint: "Crew energy, sober driver prompts." },
  { id: "club_mates", label: "Club Mates", hint: "Groups & couples at the door." },
  { id: "happening", label: "Happening Places", hint: "AI + social heat signals." },
];

export default function ModesScreen() {
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);

  return (
    <ScrollView className="flex-1 bg-background px-5 pt-14">
      <Text className="text-3xl font-extrabold text-foreground">Modes</Text>
      <Text className="mt-2 text-subtext">Switch how you appear to the radar.</Text>
      <View className="mt-6 gap-4">
        {MODES.map((m) => (
          <View key={m.id} className="rounded-2xl border border-border bg-card p-4">
            <ModeChip
              label={m.label}
              active={profile?.activeMode === m.id}
              onPress={() => setProfile({ activeMode: m.id })}
            />
            <Text className="mt-3 text-sm text-subtext">{m.hint}</Text>
          </View>
        ))}
      </View>
      <View className="my-10">
        <Button title="Back" variant="outline" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}
