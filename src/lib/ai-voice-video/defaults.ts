import { TtsSettings } from "./types";

export const TTS_SETTINGS_DOC_ID = "ttsSettings";

export const DEFAULT_TTS_SETTINGS: TtsSettings = {
  provider: "openai_tts",
  defaultHindiVoice: "alloy",
  defaultEnglishVoice: "alloy",
  speed: 1,
  pitch: 0,
  dailyLimit: 50,
  monthlyLimit: 1000,
  requireApproval: true,
  autoGenerateForBreakingNews: false,
  updatedAt: null,
};

export const VOICE_VIDEO_SYSTEM_PROMPT = `
You are a newsroom assistant for News Junction.
Rules:
- Keep all output factual, neutral, concise, and news-style.
- Never invent facts, quotes, numbers, or names not present in input.
- No clickbait, sensationalism, propaganda, hate, or political bias.
- Do not create fake interview clips or suggest voice cloning of real persons.
- If data is missing, write safe neutral lines.
- Output must be suitable for Hindi/English mass audience news platforms.
`.trim();

export const VOICE_SCRIPT_ACTIONS = [
  "hindi_voice_script",
  "english_voice_script",
  "short_video_30s",
  "short_video_60s",
  "bulletin_3m",
  "youtube_shorts_title",
  "instagram_reels_caption",
  "facebook_reels_caption",
  "subtitle_text",
  "thumbnail_text",
  "video_description",
  "hashtags",
  "call_to_action",
] as const;

export type VoiceScriptAction = (typeof VOICE_SCRIPT_ACTIONS)[number];
