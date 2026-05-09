import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Button, InputField } from "@vybeon/ui";
import { apiFetch } from "../src/lib/api";

export default function LoginScreen() {
  const [phone, setPhone] = useState("+10000000001");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function sendOtp() {
    setLoading(true);
    setError(undefined);
    try {
      await apiFetch("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone }) });
      router.push({ pathname: "/otp", params: { phone } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-background px-5 pt-16">
      <Text className="text-3xl font-bold text-foreground">Sign in</Text>
      <Text className="mt-2 text-subtext">Phone OTP keeps VYBEON consent-first.</Text>
      <View className="mt-8">
        <InputField
          label="Phone"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 555 0100"
        />
      </View>
      {error ? <Text className="mt-3 text-danger">{error}</Text> : null}
      <View className="mt-8">
        <Button title="Send code" onPress={sendOtp} loading={loading} />
      </View>
    </View>
  );
}
