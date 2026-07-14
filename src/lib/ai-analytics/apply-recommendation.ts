import { getAdminDb } from "@/lib/firebase-admin";
import { enrichArticleOnPublish } from "@/lib/article-enrichment/on-publish";
import { sendNewArticlePush, sendPushNotification } from "@/lib/notifications/push-send";
import { generateSeoMeta } from "@/lib/ai-seo/service";
import { executeContentAction } from "@/lib/ai-studio/content-actions";
import { getSocialAccounts, schedulePost, getSocialSettings } from "@/lib/ai-social/service";
import type { GrowthRecommendation } from "@/lib/ai-analytics/types";

export type ApplyRecommendationInput = {
  recommendationId?: string;
  recommendationType: GrowthRecommendation["recommendationType"] | string;
  articleId?: string;
  title?: string;
  usedBy: string;
};

async function resolveArticleId(input: ApplyRecommendationInput): Promise<string | null> {
  if (input.articleId) return input.articleId;
  if (!input.title) return null;

  const snap = await getAdminDb()
    .collection("news")
    .where("status", "==", "published")
    .limit(80)
    .get();

  const needle = input.title.toLowerCase();
  const match = snap.docs.find((d) => {
    const data = d.data();
    const title = `${data.titleEn || ""} ${data.titleHi || ""}`.toLowerCase();
    return title.includes(needle.slice(0, 40)) || needle.includes(String(data.titleEn || "").toLowerCase().slice(0, 40));
  });
  return match?.id || null;
}

export async function applyGrowthRecommendation(input: ApplyRecommendationInput) {
  const type = input.recommendationType;
  let articleId = await resolveArticleId(input);
  const details: Record<string, unknown> = { type };

  // For follow-up without article, create a topic suggestion
  if (!articleId && type === "follow_up_article") {
    const now = new Date().toISOString();
    await getAdminDb().collection("seoTopicSuggestions").add({
      titleHi: input.title || "फॉलो-अप लेख",
      titleEn: input.title || "Follow-up article",
      categoryId: "",
      keyword: input.title || "follow up",
      reason: "Created from Analytics growth recommendation",
      priority: "medium",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    details.topicSuggestion = true;
  } else if (!articleId && ["generate_newsletter", "generate_push"].includes(type)) {
    // site-wide actions
  } else if (!articleId) {
    // pick top viewed article as fallback for generic recs
    const top = await getAdminDb()
      .collection("news")
      .where("status", "==", "published")
      .orderBy("views", "desc")
      .limit(1)
      .get();
    articleId = top.docs[0]?.id || null;
  }

  if (articleId) details.articleId = articleId;

  switch (type) {
    case "add_faq": {
      if (!articleId) throw new Error("No article found for FAQ recommendation");
      details.result = await enrichArticleOnPublish(articleId, {
        forceFaq: true,
        sendPush: false,
        queueSocial: false,
        forceLinks: false,
        forceMeta: false,
      });
      break;
    }
    case "add_internal_links": {
      if (!articleId) throw new Error("No article found for internal links");
      details.result = await enrichArticleOnPublish(articleId, {
        forceLinks: true,
        sendPush: false,
        queueSocial: false,
        forceFaq: false,
        forceMeta: false,
      });
      break;
    }
    case "improve_meta": {
      if (!articleId) throw new Error("No article found for meta improvement");
      const meta = await generateSeoMeta(articleId);
      await getAdminDb().collection("news").doc(articleId).update({
        seoTitle: meta.result.seoTitleHi,
        seoTitleHi: meta.result.seoTitleHi,
        seoTitleEn: meta.result.seoTitleEn,
        seoDescription: meta.result.metaDescriptionHi,
        seoDescriptionHi: meta.result.metaDescriptionHi,
        seoDescriptionEn: meta.result.metaDescriptionEn,
        ogTitle: meta.result.ogTitle,
        ogDescription: meta.result.ogDescription,
        twitterTitle: meta.result.twitterTitle,
        twitterDescription: meta.result.twitterDescription,
        updatedAt: new Date().toISOString(),
      });
      details.meta = meta.result;
      break;
    }
    case "improve_headline": {
      if (!articleId) throw new Error("No article found for headline improvement");
      const hi = await executeContentAction(articleId, "improve_headline_hi", "hi", undefined, input.usedBy);
      const en = await executeContentAction(articleId, "improve_headline_en", "en", undefined, input.usedBy);
      // Apply directly for recommendation apply (admin intentional)
      await getAdminDb().collection("news").doc(articleId).update({
        titleHi: hi.output.slice(0, 180),
        titleEn: en.output.slice(0, 180),
        updatedAt: new Date().toISOString(),
      });
      details.headlines = { hi: hi.output, en: en.output };
      break;
    }
    case "refresh_article": {
      if (!articleId) throw new Error("No article found to refresh");
      const improved = await executeContentAction(articleId, "improve_content", "both", "Refresh with latest framing while staying factual", input.usedBy);
      await getAdminDb().collection("news").doc(articleId).update({
        contentHi: improved.output,
        updatedAt: new Date().toISOString(),
      });
      details.refreshed = true;
      break;
    }
    case "translate_article": {
      if (!articleId) throw new Error("No article found to translate");
      const en = await executeContentAction(articleId, "translate_hi_en", "en", undefined, input.usedBy);
      await getAdminDb().collection("news").doc(articleId).update({
        contentEn: en.output,
        updatedAt: new Date().toISOString(),
      });
      details.translated = true;
      break;
    }
    case "generate_push": {
      if (articleId) {
        const doc = await getAdminDb().collection("news").doc(articleId).get();
        const data = doc.data() || {};
        details.push = await sendNewArticlePush({
          id: articleId,
          titleHi: String(data.titleHi || ""),
          titleEn: String(data.titleEn || ""),
          summaryHi: String(data.summaryHi || ""),
          summaryEn: String(data.summaryEn || ""),
          slug: String(data.slug || ""),
          pushText: String(data.pushText || ""),
          isBreaking: Boolean(data.isBreaking),
        });
      } else {
        details.push = await sendPushNotification({
          title: "News Junction",
          body: input.title || "Check the latest stories on News Junction",
          type: "digest",
        });
      }
      break;
    }
    case "generate_newsletter": {
      if (!articleId) throw new Error("No article found for newsletter snippet");
      const snippet = await executeContentAction(
        articleId,
        "newsletter_snippet",
        "en",
        undefined,
        input.usedBy
      );
      await getAdminDb().collection("news").doc(articleId).update({
        newsletterSnippet: snippet.output.slice(0, 500),
        updatedAt: new Date().toISOString(),
      });
      await getAdminDb().collection("newsletterDrafts").add({
        articleId,
        snippet: snippet.output.slice(0, 500),
        status: "draft",
        createdAt: new Date().toISOString(),
        createdBy: input.usedBy,
      });
      details.newsletter = snippet.output.slice(0, 300);
      break;
    }
    case "share_social": {
      if (!articleId) throw new Error("No article found for social share");
      const settings = await getSocialSettings();
      const accounts = (await getSocialAccounts()).filter((a) => a.enabled);
      const doc = await getAdminDb().collection("news").doc(articleId).get();
      const data = doc.data() || {};
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://news-junction.vercel.app";
      const text = `${data.titleEn || data.titleHi}\n\n${String(data.summaryEn || data.summaryHi || "").slice(0, 160)}\n\n${siteUrl}/article/${data.slug}`;
      let queued = 0;
      for (const account of accounts.slice(0, 3)) {
        await schedulePost({
          articleId,
          platform: account.platform,
          text,
          hashtags: Array.isArray(data.tags) ? data.tags.slice(0, 5) : [],
          cta: "Read full story on News Junction.",
          imageUrl: data.imageUrl || undefined,
          language: "en",
          approvalStatus: settings.requireApprovalBeforePosting ? "pending" : "approved",
          createdBy: input.usedBy,
        });
        queued += 1;
      }
      details.socialQueued = queued;
      break;
    }
    case "create_audio": {
      if (!articleId) throw new Error("No article found for audio");
      const { generateVoiceScript, generateAudio } = await import("@/lib/ai-voice-video/service");
      const scriptOut = await generateVoiceScript({
        articleId,
        action: "hindi_voice_script",
        language: "hi",
        createdBy: input.usedBy,
      });
      details.audio = await generateAudio({
        articleId,
        language: "hi",
        script: scriptOut.script,
        createdBy: input.usedBy,
      });
      break;
    }
    case "create_video_package": {
      if (!articleId) throw new Error("No article found for video package");
      const { generateVoiceScript, generateVideoPackage } = await import("@/lib/ai-voice-video/service");
      const scriptOut = await generateVoiceScript({
        articleId,
        action: "short_video_60s",
        language: "hi",
        createdBy: input.usedBy,
      });
      const doc = await getAdminDb().collection("news").doc(articleId).get();
      const data = doc.data() || {};
      details.video = await generateVideoPackage({
        articleId,
        language: "hi",
        platform: "youtube_shorts",
        script: scriptOut.script,
        caption: String(data.titleEn || data.titleHi || "").slice(0, 180),
        hashtags: Array.isArray(data.tags) ? data.tags.slice(0, 8) : [],
        createdBy: input.usedBy,
      });
      break;
    }
    case "follow_up_article": {
      if (!details.topicSuggestion) {
        const now = new Date().toISOString();
        const doc = articleId ? await getAdminDb().collection("news").doc(articleId).get() : null;
        const data = doc?.data() || {};
        await getAdminDb().collection("seoTopicSuggestions").add({
          titleHi: `अपडेट: ${data.titleHi || input.title || ""}`,
          titleEn: `Follow-up: ${data.titleEn || input.title || ""}`,
          categoryId: String(data.categoryId || ""),
          keyword: String(data.titleEn || input.title || "follow-up"),
          reason: "Analytics recommended a follow-up article",
          priority: "medium",
          status: "pending",
          createdAt: now,
          updatedAt: now,
        });
        details.topicSuggestion = true;
      }
      break;
    }
    default:
      throw new Error(`Unsupported recommendation type: ${type}`);
  }

  if (input.recommendationId) {
    await getAdminDb().collection("growthRecommendations").doc(input.recommendationId).update({
      status: "applied",
      updatedAt: new Date().toISOString(),
      appliedBy: input.usedBy,
      applyResult: details,
    });
  }

  await getAdminDb().collection("analyticsLogs").add({
    actionType: "notification",
    status: "success",
    message: `Applied recommendation: ${type}`,
    metadata: details,
    createdBy: input.usedBy,
    createdAt: new Date().toISOString(),
  });

  return details;
}
