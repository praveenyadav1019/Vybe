import { Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { Avatar, Button } from "@vybeon/ui";
import { useUserStore } from "../../src/stores/userStore";

export default function ProfileTabScreen() {
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);

  return (
    <View className="flex-1 bg-background px-5 pt-14">
      <View className="flex-row items-center gap-4">
        <Avatar name={profile?.name} verified={profile?.verified} size={64} />
        <View className="flex-1">
          <Text className="text-2xl font-bold text-foreground">{profile?.name ?? "You"}</Text>
          <Text className="text-subtext">{profile?.verified ? "Verified" : "Unverified"}</Text>
        </View>
      </View>

      <View className="mt-8 rounded-2xl border border-border bg-card p-4">
        <Text className="text-lg font-semibold text-foreground">Women’s safety mode</Text>
        <Text className="mt-1 text-sm text-subtext">Extra friction for pings and spotlight controls.</Text>
        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-foreground">Enabled</Text>
          <Switch
            value={profile?.womenSafetyMode ?? false}
            onValueChange={(v) => setProfile({ womenSafetyMode: v })}
            trackColor={{ false: "#1F1F1F", true: "#7C3AED" }}
          />
        </View>
      </View>

      <View className="mt-6 gap-3">
        <Button title="Settings" variant="outline" onPress={() => router.push("/settings")} />
        <Button title="Privacy" variant="ghost" onPress={() => router.push("/privacy")} />
        <Button title="Safety" variant="ghost" onPress={() => router.push("/safety")} />
      </View>
    </View>
  );
}
