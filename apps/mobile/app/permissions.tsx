import { Text, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@vybeon/ui";
import { useUserStore } from "../src/stores/userStore";

export default function PermissionsScreen() {
  const finishOnboarding = useUserStore((s) => s.finishOnboarding);

  async function enter() {
    await finishOnboarding();
    router.replace("/(tabs)/home");
  }

  return (
    <View className="flex-1 bg-background px-5 pt-16">
      <Text className="text-3xl font-bold text-foreground">Permissions</Text>
      <Text className="mt-3 text-subtext">
        VYBEON uses precise location for discovery, then shows venue-level presence to others. Microphone and camera
        are requested only when you start a call.
      </Text>
      <View className="mt-10 gap-3 rounded-2xl border border-border bg-card p-4">
        <Text className="text-foreground">• Location while using the app</Text>
        <Text className="text-foreground">• Notifications for pings & safety</Text>
        <Text className="text-foreground">• Camera / mic on demand</Text>
      </View>
      <View className="mt-auto mb-10">
        <Button title="Continue" onPress={enter} />
      </View>
    </View>
  );
}
