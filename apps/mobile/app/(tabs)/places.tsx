import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { PlaceCard } from "@vybeon/ui";

const MOCK_PLACES = [
  { id: "seed_place_aurora", name: "Aurora Club", category: "Club", activeUsers: 128, vibeScore: 0.86 },
  { id: "seed_place_neon", name: "Neon Rooftop", category: "Lounge", activeUsers: 64, vibeScore: 0.72 },
];

export default function PlacesScreen() {
  return (
    <View className="flex-1 bg-background px-5 pt-14">
      <Text className="text-3xl font-extrabold text-foreground">Happening</Text>
      <Text className="mt-2 text-subtext">Heat from real presence + social signals.</Text>
      <FlatList
        className="mt-6"
        data={MOCK_PLACES}
        keyExtractor={(i) => i.id}
        ItemSeparatorComponent={() => <View className="h-4" />}
        renderItem={({ item }) => (
          <PlaceCard
            name={item.name}
            category={item.category}
            activeUsers={item.activeUsers}
            vibeScore={item.vibeScore}
            onPress={() => router.push(`/place/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
