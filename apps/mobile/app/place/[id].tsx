import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Button } from "@vybeon/ui";

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 bg-background px-5 pt-14">
      <Text className="text-xs font-semibold uppercase tracking-widest text-accent">Venue</Text>
      <Text className="mt-3 text-3xl font-extrabold text-foreground">Place</Text>
      <Text className="mt-2 text-subtext">ID {id}</Text>
      <Text className="mt-6 text-foreground">
        Presence here shows as “Inside this venue” for others — never exact GPS.
      </Text>
      <View className="mt-10">
        <Button title="Share vibe" onPress={() => {}} />
      </View>
    </View>
  );
}
