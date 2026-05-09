import { FlatList, Image, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const STORIES = [
  { id: "1", user: "Avery", uri: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800" },
  { id: "2", user: "Rio", uri: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800" },
];

export default function StoriesScreen() {
  return (
    <View className="flex-1 bg-background px-5 pt-14">
      <Text className="text-3xl font-extrabold text-foreground">Vibes</Text>
      <Text className="mt-2 text-subtext">Lightweight stories from verified nights.</Text>
      <FlatList
        className="mt-6"
        data={STORIES}
        keyExtractor={(i) => i.id}
        ItemSeparatorComponent={() => <View className="h-4" />}
        renderItem={({ item }) => (
          <LinearGradient
            colors={["rgba(124,58,237,0.35)", "rgba(0,0,0,0.2)"]}
            className="overflow-hidden rounded-3xl border border-border"
          >
            <Image source={{ uri: item.uri }} className="h-56 w-full" />
            <Text className="p-4 text-foreground">{item.user}</Text>
          </LinearGradient>
        )}
      />
    </View>
  );
}
