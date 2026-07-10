import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { AppBar } from "@/components/ui/AppBar";
import { NewsCard } from "@/components/news/NewsCard";
import { EmptyState } from "@/components/states";
import { AiSectionCard } from "@/components/ai/AiCards";
import { useAiAction, useAiCenter, useAiChatMutations, useAiChats, useAiSearch, useAssistant } from "@/hooks/useAI";
import { useI18n } from "@/hooks/useI18n";
import { getNewsByIds } from "@/services/news/firestore";
import { useQuery } from "@tanstack/react-query";

export default function AiCenterScreen() {
  const { language } = useI18n();
  const params = useLocalSearchParams<{ action?: string }>();
  const [prompt, setPrompt] = useState("");
  const [chatQuery, setChatQuery] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(params.action === "voice");
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const [queue, setQueue] = useState<string[]>([]);
  const [resultText, setResultText] = useState("");
  const center = useAiCenter();
  const assistant = useAssistant();
  const aiAction = useAiAction();
  const aiSearch = useAiSearch();
  const chats = useAiChats(chatQuery);
  const { pin, remove } = useAiChatMutations();

  const recIds = useMemo(
    () => center.data?.recommendations?.recommendations?.slice(0, 12).map((r) => r.articleId) || [],
    [center.data]
  );
  const recArticles = useQuery({
    queryKey: ["ai-center-rec-articles", recIds.join(",")],
    queryFn: () => getNewsByIds(recIds),
    enabled: recIds.length > 0,
  });

  const ask = async () => {
    if (!prompt.trim()) return;
    const res = await assistant.mutateAsync({ prompt: prompt.trim(), language });
    setResultText(res.output);
  };

  const runAction = async (mode: "summary" | "bullet_summary" | "key_takeaways" | "explain_simple" | "explain_detailed" | "translate_hi" | "translate_en" | "brief_60" | "brief_5m") => {
    if (!prompt.trim()) return;
    const res = await aiAction.mutateAsync({ mode, text: prompt.trim(), language });
    setResultText(res.output);
  };

  const runSmartSearch = async () => {
    if (!prompt.trim()) return;
    const res = await aiSearch.mutateAsync(prompt.trim());
    setResultText(
      `Interpreted: ${res.interpretedQuery}\n\nSuggestions:\n- ${res.suggestions.join("\n- ")}\n\nKeywords: ${res.keywords.join(", ")}`
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      <AppBar title="AI Center" />
      <ScrollView className="px-4 py-3">
        <View className="rounded-3xl bg-slate-900 p-4">
          <AppText className="text-xs uppercase text-red-300">News Junction AI</AppText>
          <AppText className="mt-1 text-xl font-bold text-white">
            {center.data?.greeting === "morning"
              ? "Good Morning"
              : center.data?.greeting === "afternoon"
                ? "Good Afternoon"
                : "Good Evening"}
          </AppText>
          <AppText className="mt-1 text-sm text-slate-300">
            Personalized briefing, assistant and smart summaries.
          </AppText>
        </View>

        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ask: What happened today? / Summarize this / Top sports news"
          multiline
          className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3"
        />
        <View className="mt-3 flex-row flex-wrap gap-2">
          <AppButton title="Ask Assistant" onPress={ask} />
          <AppButton title="Smart Search" onPress={runSmartSearch} />
          <AppButton title="Quick Summary" onPress={() => runAction("summary")} />
          <AppButton title="5 Bullets" onPress={() => runAction("bullet_summary")} />
          <AppButton title="Key Takeaways" onPress={() => runAction("key_takeaways")} />
          <AppButton title="Explain Simple" onPress={() => runAction("explain_simple")} />
          <AppButton title="Explain Detailed" onPress={() => runAction("explain_detailed")} />
          <AppButton title="Translate Hindi" onPress={() => runAction("translate_hi")} />
          <AppButton title="Translate English" onPress={() => runAction("translate_en")} />
          <AppButton title="60-second Brief" onPress={() => runAction("brief_60")} />
          <AppButton title="5-minute Brief" onPress={() => runAction("brief_5m")} />
          <AppButton title="Voice Player" onPress={() => setVoiceOpen(true)} />
        </View>

        {resultText ? (
          <View className="mt-4 rounded-2xl bg-white p-4">
            <AppText className="font-semibold">AI Result</AppText>
            <AppText className="mt-2 text-sm text-slate-700">{resultText}</AppText>
          </View>
        ) : null}

        <View className="mt-6">
          <AppText className="mb-2 text-lg font-bold">AI Picks</AppText>
          {(recArticles.data || []).slice(0, 6).map((article) => (
            <NewsCard key={article.id} article={article} variant="horizontal" />
          ))}
        </View>

        <View className="mt-2">
          <AppText className="mb-2 text-lg font-bold">Daily Digest</AppText>
          {(center.data?.digests || []).slice(0, 5).map((digest) => (
            <AiSectionCard key={digest.id} title={digest.title} subtitle={digest.summary.slice(0, 140)} />
          ))}
        </View>

        <View className="mt-2">
          <AppText className="mb-2 text-lg font-bold">AI Chat History</AppText>
          <TextInput
            value={chatQuery}
            onChangeText={setChatQuery}
            placeholder="Search chats"
            className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
          />
          {chats.data?.length ? (
            chats.data.map((chat) => (
              <View key={chat.id} className="mb-3 rounded-2xl bg-white p-4">
                <AppText className="font-semibold">{chat.title}</AppText>
                <AppText className="mt-1 text-sm text-slate-600" numberOfLines={2}>
                  {chat.prompt}
                </AppText>
                <AppText className="mt-2 text-sm text-slate-700">{chat.response}</AppText>
                <View className="mt-2 flex-row gap-3">
                  <Pressable onPress={() => pin.mutate({ chatId: chat.id, pinned: !chat.pinned })}>
                    <AppText className="text-xs text-red-600">{chat.pinned ? "Unpin" : "Pin"}</AppText>
                  </Pressable>
                  <Pressable onPress={() => remove.mutate(chat.id)}>
                    <AppText className="text-xs text-red-600">Delete</AppText>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <EmptyState title="No chats yet" subtitle="Ask something to start AI history." />
          )}
        </View>

        <View className="mb-8 mt-2">
          <AppText className="mb-2 text-lg font-bold">AI Settings</AppText>
          <AiSectionCard title="Preferred AI Language" subtitle={language === "hi" ? "Hindi" : "English"} />
          <AiSectionCard title="Summary Length" subtitle="Short / Medium / Detailed" />
          <AiSectionCard title="Auto Play Audio" subtitle="Control voice playback preferences" />
          <AiSectionCard title="Recommendation Frequency" subtitle="Tune personalization cadence" />
          <AiSectionCard title="Privacy Controls" subtitle="Manage AI usage and synced chat history" />
          <AppButton title="Open App Settings" onPress={() => router.push("/settings/index")} />
        </View>
      </ScrollView>

      <Modal visible={voiceOpen} transparent animationType="slide" onRequestClose={() => setVoiceOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setVoiceOpen(false)}>
          <View className="rounded-t-3xl bg-white p-4">
            <AppText className="text-lg font-bold">Voice Mini Player</AppText>
            <AppText className="mt-1 text-sm text-slate-600">Play / Pause / Resume with queue and speed controls.</AppText>
            <View className="mt-3 flex-row flex-wrap gap-2">
              <AppButton title="Play" onPress={() => {}} />
              <AppButton title="Pause" onPress={() => {}} />
              <AppButton title="Resume" onPress={() => {}} />
              <AppButton title={`Speed ${voiceSpeed.toFixed(1)}x`} onPress={() => setVoiceSpeed((s) => (s >= 2 ? 0.75 : s + 0.25))} />
              <AppButton
                title="Add to Queue"
                onPress={() => setQueue((q) => [...q, `Item ${q.length + 1}`])}
              />
            </View>
            <AppText className="mt-3 text-sm font-semibold">Queue ({queue.length})</AppText>
            {queue.map((q, i) => (
              <AppText key={q + i} className="text-xs text-slate-600">
                {i + 1}. {q}
              </AppText>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
