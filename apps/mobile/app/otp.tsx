import { useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, InputField } from "@vybeon/ui";
import { apiFetch } from "../src/lib/api";
import { useAuthStore } from "../src/stores/authStore";

export default function OTPScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const setToken = useAuthStore((s) => s.setToken);
  const [code, setCode] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function verify() {
    setLoading(true);
    setError(undefined);
    try {
      const res = await apiFetch<{ accessToken: string }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, code }),
      });
      await setToken(res.accessToken);
      router.replace("/profile-setup");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-background px-5 pt-16">
      <Text className="text-3xl font-bold text-foreground">Verify</Text>
      <Text className="mt-2 text-subtext">Dev OTP is 123456 against local API.</Text>
      <View className="mt-8">
        <InputField label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" />
      </View>
      {error ? <Text className="mt-3 text-danger">{error}</Text> : null}
      <View className="mt-8">
        <Button title="Continue" onPress={verify} loading={loading} />
      </View>
    </View>
  );
}
