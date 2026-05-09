import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Avatar, Button } from "@vybeon/ui";

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScrollView className="flex-1 bg-background px-5 pt-14">
      <Text className="text-xs font-semibold uppercase tracking-widest text-accent">Profile</Text>
      <View className="mt-4 flex-row items-center gap-4">
        <Avatar name="Avery" verified size={72} />
        <View className="flex-1">
          <Text className="text-3xl font-extrabold text-foreground">Avery</Text>
          <Text className="text-subtext">ID: {id}</Text>
        </View>
      </View>
      <Text className="mt-6 text-subtext">
        Same place • Verified • Consent-first ping required to chat or call.
      </Text>
      <View className="mt-8 gap-3">
        <Button title="Send ping" onPress={() => router.push(`/chat/c1`)} />
        <Button title="Report / Block" variant="outline" onPress={() => router.push("/report-block")} />
      </View>
    </ScrollView>
  );
}
