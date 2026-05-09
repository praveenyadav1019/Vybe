import { Text, View } from "react-native";
import { Button } from "@vybeon/ui";
import { router } from "expo-router";

export default function PrivacyScreen() {
  return (
    <View className="flex-1 bg-background px-5 pt-14">
      <Text className="text-3xl font-extrabold text-foreground">Privacy</Text>
      <Text className="mt-4 text-subtext">
        • Location is processed for discovery, then shared as venue labels or coarse buckets.{"\n"}• You control
        modes, pings, and calls.{"\n"}• Video verification unlocks video calls only when both sides accept.
      </Text>
      <View className="mt-10">
        <Button title="Back" variant="outline" onPress={() => router.back()} />
      </View>
    </View>
  );
}
