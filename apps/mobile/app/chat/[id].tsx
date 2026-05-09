import { useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { MessageBubble, Button } from "@vybeon/ui";
import { useLocalSearchParams } from "expo-router";

const SEED = [
  { id: "m1", mine: false, text: "Ping accepted — hey :) nearby?", at: "10:02 PM" },
  { id: "m2", mine: true, text: "Hey! Inside Aurora, neon room.", at: "10:03 PM" },
];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [input, setInput] = useState("");
  const [items, setItems] = useState(SEED);

  function send() {
    if (!input.trim()) return;
    setItems((xs) => [
      ...xs,
      { id: String(Date.now()), mine: true, text: input.trim(), at: "Now" },
    ]);
    setInput("");
  }

  return (
    <View className="flex-1 bg-background px-4 pt-14">
      <Text className="text-lg font-bold text-foreground">Thread</Text>
      <Text className="text-xs text-subtext">{id}</Text>
      <FlatList
        className="mt-4 flex-1"
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <MessageBubble text={item.text} mine={item.mine} time={item.at} />
        )}
      />
      <View className="mb-6 flex-row items-end gap-2">
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Message"
          placeholderTextColor="#A1A1AA"
          className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-foreground"
        />
        <Button title="Send" onPress={send} />
      </View>
      <View className="mb-4 flex-row gap-2">
        <Button title="Voice note (soon)" variant="outline" onPress={() => {}} />
        <Button title="Video call" variant="ghost" onPress={() => {}} />
      </View>
    </View>
  );
}
