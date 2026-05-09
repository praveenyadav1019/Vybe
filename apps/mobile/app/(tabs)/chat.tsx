import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { UserCard } from "@vybeon/ui";

const MOCK_CHATS = [
  { id: "c1", title: "Avery", peerId: "u1", last: "See you inside?", bucket: "same_place" as const },
  { id: "c2", title: "Rio", peerId: "u2", last: "Ping accepted ✅", bucket: "nearby" as const },
];

export default function ChatListScreen() {
  return (
    <View className="flex-1 bg-background px-5 pt-14">
      <Text className="text-3xl font-extrabold text-foreground">Chats</Text>
      <Text className="mt-2 text-subtext">Only mutual accepts land here.</Text>
      <FlatList
        className="mt-6"
        data={MOCK_CHATS}
        keyExtractor={(i) => i.id}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <UserCard
            name={item.title}
            subtitle={item.last}
            distanceBucket={item.bucket}
            onPress={() => router.push(`/chat/${item.id}`)}
          />
        )}
      />
    </View>
  );
}
