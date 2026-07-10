import { useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { AppBar } from "@/components/ui/AppBar";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { useAdminActions, useAdminArticles } from "@/hooks/useAdmin";

const ACTIONS = [
  "rewrite_headline",
  "rewrite_summary",
  "bullet_summary",
  "key_points",
  "seo_title",
  "seo_description",
  "generate_tags",
  "faq",
  "translate_hi_en",
  "translate_en_hi",
  "social_captions",
  "newsletter_snippet",
  "push_notification",
] as const;

export default function AdminAiToolsScreen() {
  const [articleId, setArticleId] = useState("");
  const [selectedAction, setSelectedAction] = useState<(typeof ACTIONS)[number]>("rewrite_headline");
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [instruction, setInstruction] = useState("");
  const actions = useAdminActions();
  const drafts = useAdminArticles("draft");
  const draftItems = useMemo(() => (drafts.data || []) as Array<Record<string, unknown>>, [drafts.data]);

  const run = async () => {
    if (!articleId) return;
    const result = await actions.runAi.mutateAsync({
      articleId,
      actionType: selectedAction,
      language: "both",
      customInstruction: instruction || undefined,
    });
    setAfter(String(result.output || ""));
  };

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title="AI Content Tools" />
      <AdminNav />
      <ScrollView className="px-4 pb-8">
        <View className="mb-3 rounded-2xl bg-white p-4">
          <AppText className="font-semibold">Select Draft</AppText>
          {draftItems.slice(0, 10).map((item) => (
            <Pressable
              key={String(item.id)}
              onPress={() => {
                setArticleId(String(item.id));
                setBefore(String(item.titleEn || item.titleHi || ""));
              }}
              className={`mt-2 rounded-xl border p-2 ${articleId === String(item.id) ? "border-red-600" : "border-slate-200"}`}
            >
              <AppText className="text-xs">{String(item.titleEn || item.titleHi || item.id)}</AppText>
            </Pressable>
          ))}
        </View>

        <View className="mb-3 rounded-2xl bg-white p-4">
          <AppText className="font-semibold">Action</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
            {ACTIONS.map((a) => (
              <Pressable
                key={a}
                onPress={() => setSelectedAction(a)}
                className={`mr-2 rounded-full border px-3 py-2 ${selectedAction === a ? "border-red-600 bg-red-50" : "border-slate-300"}`}
              >
                <AppText className="text-xs">{a}</AppText>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            value={instruction}
            onChangeText={setInstruction}
            placeholder="Custom instruction"
            className="mt-3 rounded-xl border border-slate-300 px-3 py-2"
          />
          <AppButton title="Generate" className="mt-3" onPress={run} />
        </View>

        <View className="rounded-2xl bg-white p-4">
          <AppText className="font-semibold">Before / After Preview</AppText>
          <AppText className="mt-2 text-xs text-slate-500">Before</AppText>
          <AppText className="mt-1 text-sm text-slate-800">{before || "-"}</AppText>
          <AppText className="mt-3 text-xs text-slate-500">After</AppText>
          <AppText className="mt-1 text-sm text-slate-800">{after || "-"}</AppText>
        </View>
      </ScrollView>
    </View>
  );
}
