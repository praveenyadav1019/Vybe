import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Button, InputField } from "@vybeon/ui";
import { apiFetch } from "../src/lib/api";
import { useAuthStore } from "../src/stores/authStore";

export default function ReportBlockFlow() {
  const token = useAuthStore((s) => s.token);
  const [step, setStep] = useState<"reason" | "confirm">("reason");
  const [reason, setReason] = useState("");
  const [targetId, setTargetId] = useState("demo-target");

  async function submit() {
    await apiFetch("/report", {
      method: "POST",
      token,
      body: JSON.stringify({ targetId, reason }),
    });
    await apiFetch("/block", {
      method: "POST",
      token,
      body: JSON.stringify({ blockedId: targetId }),
    });
    router.back();
  }

  return (
    <View className="flex-1 bg-background px-5 pt-14">
      <Text className="text-3xl font-extrabold text-foreground">Report / Block</Text>
      {step === "reason" ? (
        <>
          <View className="mt-6">
            <InputField label="Target user id" value={targetId} onChangeText={setTargetId} />
          </View>
          <View className="mt-4">
            <InputField label="Reason" value={reason} onChangeText={setReason} />
          </View>
          <View className="mt-8">
            <Button title="Review" onPress={() => setStep("confirm")} />
          </View>
        </>
      ) : (
        <>
          <Text className="mt-6 text-subtext">We’ll file the report and block this profile locally.</Text>
          <View className="mt-8 gap-3">
            <Button title="Submit" onPress={submit} />
            <Button title="Back" variant="outline" onPress={() => setStep("reason")} />
          </View>
        </>
      )}
    </View>
  );
}
