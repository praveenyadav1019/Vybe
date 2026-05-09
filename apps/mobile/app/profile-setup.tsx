import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Button, InputField } from "@vybeon/ui";
import { useUserStore } from "../src/stores/userStore";
import { apiFetch } from "../src/lib/api";
import { useAuthStore } from "../src/stores/authStore";

export default function ProfileSetupScreen() {
  const token = useAuthStore((s) => s.token);
  const setProfile = useUserStore((s) => s.setProfile);
  const [name, setName] = useState("Alex");
  const [age, setAge] = useState("27");
  const [loading, setLoading] = useState(false);

  async function next() {
    setLoading(true);
    try {
      await apiFetch("/me", {
        method: "PATCH",
        token,
        body: JSON.stringify({ name, age: Number(age) }),
      });
      setProfile({ name, age: Number(age) });
      router.push("/interests");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-background px-5 pt-16">
      <Text className="text-3xl font-bold text-foreground">Profile</Text>
      <Text className="mt-2 text-subtext">Show up the way you want to be seen nearby.</Text>
      <View className="mt-8 gap-4">
        <InputField label="Name" value={name} onChangeText={setName} />
        <InputField label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" />
      </View>
      <View className="mt-10">
        <Button title="Continue" onPress={next} loading={loading} />
      </View>
    </View>
  );
}
