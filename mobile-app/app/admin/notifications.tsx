import { useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/services/api/client";

export default function AdminNotificationsScreen() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("breaking");
  const [result, setResult] = useState<string>("");
  const create = useMutation({
    mutationFn: async () =>
      apiFetch("/api/notifications/send", {
        method: "POST",
        body: { title, body, type, channel: "mobile-admin" },
      }),
    onSuccess: (data: { result?: { sent?: number; attempted?: number } }) => {
      setResult(`Sent ${data.result?.sent ?? 0} / ${data.result?.attempted ?? 0}`);
    },
    onError: (err: Error) => setResult(err.message),
  });

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title="Push Notifications" />
      <AdminNav />
      <ScrollView className="px-4 pb-8">
        <View className="rounded-2xl bg-white p-4">
          <AppText className="font-semibold">Send Push Notification</AppText>
          <TextInput value={title} onChangeText={setTitle} placeholder="Title" className="mt-3 rounded-xl border border-slate-300 px-3 py-2" />
          <TextInput value={body} onChangeText={setBody} placeholder="Body" className="mt-2 rounded-xl border border-slate-300 px-3 py-2" multiline />
          <TextInput value={type} onChangeText={setType} placeholder="Type: breaking/new_article/digest" className="mt-2 rounded-xl border border-slate-300 px-3 py-2" />
          <View className="mt-3 flex-row flex-wrap gap-2">
            <AppButton title="Breaking Alert" className="bg-red-700" onPress={() => setType("breaking")} />
            <AppButton title="Send Now" onPress={() => create.mutate()} />
          </View>
          {!!result && <AppText className="mt-3 text-sm text-slate-600">{result}</AppText>}
        </View>
      </ScrollView>
    </View>
  );
}
