export type TtsProvider = "openai_tts" | "google_cloud_tts" | "elevenlabs";
export type VoiceVideoLanguage = "hi" | "en";
export type VideoPlatform = "youtube_shorts" | "instagram_reels" | "facebook_reels" | "telegram";

export type AudioAssetStatus =
  | "draft"
  | "generated"
  | "approved"
  | "rejected"
  | "published"
  | "failed";

export type VideoPackageStatus =
  | "draft"
  | "generated"
  | "approved"
  | "rejected"
  | "published"
  | "failed";

export interface TtsSettings {
  provider: TtsProvider;
  defaultHindiVoice: string;
  defaultEnglishVoice: string;
  speed: number;
  pitch: number;
  dailyLimit: number;
  monthlyLimit: number;
  requireApproval: boolean;
  autoGenerateForBreakingNews: boolean;
  updatedAt?: string | null;
}

export interface AudioAsset {
  id: string;
  articleId: string;
  language: VoiceVideoLanguage;
  script: string;
  provider: TtsProvider;
  voice: string;
  audioUrl: string;
  duration: number;
  status: AudioAssetStatus;
  cost: number;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SubtitleAsset {
  id: string;
  articleId: string;
  language: VoiceVideoLanguage;
  subtitleUrl: string;
  format: "srt" | "vtt";
  script: string;
  createdAt: string | null;
}

export interface VideoScene {
  index: number;
  startSec: number;
  endSec: number;
  line: string;
  visualSuggestion: string;
}

export interface VideoPackage {
  id: string;
  articleId: string;
  language: VoiceVideoLanguage;
  platform: VideoPlatform;
  script: string;
  scenes: VideoScene[];
  audioAssetId?: string;
  subtitleUrl?: string;
  thumbnailUrl?: string;
  caption: string;
  hashtags: string[];
  status: VideoPackageStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface NewsDigest {
  id: string;
  titleHi: string;
  titleEn: string;
  articleIds: string[];
  scriptHi: string;
  scriptEn: string;
  audioHiUrl?: string;
  audioEnUrl?: string;
  status: "draft" | "generated" | "approved" | "rejected" | "published" | "failed";
  createdAt: string | null;
  updatedAt: string | null;
}

export interface VoiceVideoLog {
  id: string;
  articleId?: string;
  digestId?: string;
  actionType:
    | "script_generation"
    | "audio_generation"
    | "subtitle_generation"
    | "video_package_generation"
    | "digest_generation"
    | "approval"
    | "rejection"
    | "publish"
    | "error"
    | "settings_update";
  status: "success" | "failed" | "pending";
  provider?: string;
  inputPreview?: string;
  outputPreview?: string;
  tokensUsed?: number;
  estimatedCost?: number;
  createdBy?: string;
  createdAt: string | null;
}

export interface VoiceVideoUsage {
  dailyAudioCount: number;
  monthlyAudioCount: number;
  monthlyCost: number;
  dailyLimit: number;
  monthlyLimit: number;
  limitExceeded: boolean;
}
