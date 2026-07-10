export type AiActionMode =
  | "summary"
  | "bullet_summary"
  | "key_takeaways"
  | "explain_simple"
  | "explain_detailed"
  | "translate_hi"
  | "translate_en"
  | "brief_60"
  | "brief_5m";

export interface AiCenterResponse {
  greeting: "morning" | "afternoon" | "evening";
  recommendations: {
    recommendations: {
      articleId: string;
      reason: string;
      score: number;
      sourceSignals: string[];
    }[];
    sections?: Record<string, unknown>;
  };
  digests: Array<{
    id: string;
    digestType: string;
    title: string;
    summary: string;
    articleIds: string[];
    createdAt: string;
  }>;
  continueReading: Array<Record<string, unknown>>;
  trending: Array<Record<string, unknown>>;
}

export interface AiChatMessage {
  id: string;
  title: string;
  prompt: string;
  response: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}
