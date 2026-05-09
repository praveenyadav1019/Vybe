import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Button, ModeChip } from "@vybeon/ui";
import { useUserStore } from "../../src/stores/userStore";

export default function HomeScreen() {
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);

  return (
    <ScrollView className="flex-1 bg-background px-5 pt-14">
      <LinearGradient
        colors={["rgba(124,58,237,0.35)", "rgba(10,10,10,0.2)"]}
        className="rounded-3xl border border-border p-5"
      >
        <Text className="text-xs font-semibold uppercase tracking-widest text-accent">Tonight</Text>
        <Text className="mt-2 text-3xl font-extrabold text-foreground">
          Hey {profile?.name ?? "VYBEON"}
        </Text>
        <Text className="mt-2 text-subtext">Venue presence, consent pings, verified calls.</Text>
        <View className="mt-5 flex-row flex-wrap gap-2">
          {(
            ["dating", "hook", "co_travel", "night_out", "club_mates", "happening"] as const
          ).map((m) => (
            <ModeChip
              key={m}
              label={m.replace("_", " ")}
              active={profile?.activeMode === m}
              onPress={() => setProfile({ activeMode: m })}
            />
          ))}
        </View>
        <View className="mt-6 flex-row gap-3">
          <View className="flex-1">
            <Button title="Modes" variant="outline" onPress={() => router.push("/modes")} />
          </View>
          <View className="flex-1">
            <Button title="Stories" variant="ghost" onPress={() => router.push("/stories")} />
          </View>
        </View>
      </LinearGradient>

      <View className="mt-8 gap-3">
        <RowNav title="Notifications" onPress={() => router.push("/notifications")} />
        <RowNav title="Safety Center" onPress={() => router.push("/safety")} />
        <RowNav title="Premium" onPress={() => router.push("/premium")} />
      </View>
    </ScrollView>
  );
}

function RowNav({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Button title={title} variant="outline" onPress={onPress} />
  );
}
