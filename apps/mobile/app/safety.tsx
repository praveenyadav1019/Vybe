import { Text, View } from "react-native";
import { Button } from "@vybeon/ui";
import { apiFetch } from "../src/lib/api";
import { useAuthStore } from "../src/stores/authStore";
import { useState } from "react";

export default function SafetyCenterScreen() {
  const token = useAuthStore((s) => s.token);
  const [sent, setSent] = useState(false);

  async function sos() {
    await apiFetch("/safety/sos", {
      method: "POST",
      token,
      body: JSON.stringify({ note: "Expo client SOS" }),
    });
    setSent(true);
  }

  return (
    <View className="flex-1 bg-background px-5 pt-14">
      <Text className="text-3xl font-extrabold text-foreground">Safety</Text>
      <Text className="mt-3 text-subtext">
        SOS alerts your trusted circle (integration placeholder). Reporting & blocking is always available.
      </Text>
      <View className="mt-10 rounded-3xl border border-danger/40 bg-card p-5">
        <Text className="text-xl font-bold text-foreground">Panic</Text>
        <Text className="mt-2 text-subtext">Hold calm, we’ll guide next steps in production.</Text>
        <View className="mt-6">
          <Button title={sent ? "SOS sent" : "Send SOS"} onPress={sos} disabled={sent} />
        </View>
      </View>
    </View>
  );
}
