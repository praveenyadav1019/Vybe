import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { UserCard } from "@vybeon/ui";

const MOCK = [
  { id: "u1", name: "Avery", subtitle: "Inside Aurora Club", bucket: "same_place" as const, verified: true },
  { id: "u2", name: "Rio", subtitle: "Techno + travel", bucket: "under_100m" as const, verified: true },
  { id: "u3", name: "Mina", subtitle: "House set tonight", bucket: "nearby" as const, verified: false },
];

export default function NearbyListScreen() {
  return (
    <View className="flex-1 bg-background px-5 pt-14">
      <Text className="text-3xl font-extrabold text-foreground">Nearby</Text>
      <Text className="mt-2 text-subtext">Distance buckets only. Venue labels when shared.</Text>
      <FlatList
        className="mt-6"
        data={MOCK}
        keyExtractor={(i) => i.id}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <UserCard
            name={item.name}
            subtitle={item.subtitle}
            verified={item.verified}
            distanceBucket={item.bucket}
            venueLabel={item.subtitle}
            onPress={() => router.push(`/user/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
