import { FlatList, Text, View } from "react-native";

const ITEMS = [
  { id: "1", title: "Ping from Rio", body: "Wants to start a chat nearby." },
  { id: "2", title: "Safety check-in", body: "You turned on women’s safety mode." },
];

export default function NotificationsScreen() {
  return (
    <View className="flex-1 bg-background px-5 pt-14">
      <Text className="text-3xl font-extrabold text-foreground">Alerts</Text>
      <FlatList
        className="mt-6"
        data={ITEMS}
        keyExtractor={(i) => i.id}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <View className="rounded-2xl border border-border bg-card p-4">
            <Text className="text-lg font-semibold text-foreground">{item.title}</Text>
            <Text className="mt-1 text-subtext">{item.body}</Text>
          </View>
        )}
      />
    </View>
  );
}
