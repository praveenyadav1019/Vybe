import { Text, View } from "react-native";
import { Button } from "@vybeon/ui";
import { router } from "expo-router";
import { useAuthStore } from "../src/stores/authStore";
import { useUserStore } from "../src/stores/userStore";
import { disconnectSocket } from "../src/lib/socket";

export default function SettingsScreen() {
  const setToken = useAuthStore((s) => s.setToken);
  const resetProfile = useUserStore((s) => s.resetProfile);

  async function logout() {
    disconnectSocket();
    await setToken(null);
    await resetProfile();
    router.replace("/splash");
  }

  return (
    <View className="flex-1 bg-background px-5 pt-14">
      <Text className="text-3xl font-extrabold text-foreground">Settings</Text>
      <View className="mt-10 gap-3">
        <Button title="Privacy" variant="outline" onPress={() => router.push("/privacy")} />
        <Button title="Premium" variant="ghost" onPress={() => router.push("/premium")} />
        <Button title="Log out" variant="outline" onPress={logout} />
      </View>
    </View>
  );
}
