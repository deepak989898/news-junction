import { getAdminDb } from "@/lib/firebase-admin";
import {
  generateInternalLinks,
  generateSeoFaq,
  generateSeoMeta,
  getSeoAiSettings,
} from "@/lib/ai-seo/service";
import type { SeoFaqItem } from "@/lib/ai-seo/types";
import { sendNewArticlePush } from "@/lib/notifications/push-send";
import { getSocialSettings, schedulePost, getSocialAccounts } from "@/lib/ai-social/service";

export type OnPublishOptions = {
  forceFaq?: boolean;
  forceLinks?: boolean;
  forceMeta?: boolean;
  sendPush?: boolean;
  queueSocial?: boolean;
  skipIfDraft?: boolean;
};

export type OnPublishResult = {
  articleId: string;
  faqAdded: boolean;
  linksAdded: number;
  metaUpdated: boolean;
  pushSent: number;
  socialQueued: number;
  errors: string[];
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function fallbackFaq(article: Record<string, unknown>): SeoFaqItem[] {
  const titleHi = String(article.titleHi || article.titleEn || "");
  const titleEn = String(article.titleEn || article.titleHi || "");
  const summaryHi = String(article.summaryHi || article.summaryEn || "").slice(0, 400);
  const summaryEn = String(article.summaryEn || article.summaryHi || "").slice(0, 400);
  const category = String(article.categoryNameHi || article.categoryNameEn || "News");

  return [
    {
      questionHi: `${titleHi} — मुख्य बात क्या है?`,
      answerHi: summaryHi || `${titleHi} पर ताज़ा अपडेट।`,
      questionEn: `What is the main update in "${titleEn}"?`,
      answerEn: summaryEn || `Latest update on ${titleEn}.`,
    },
    {
      questionHi: `यह खबर किस श्रेणी से जुड़ी है?`,
      answerHi: `यह लेख ${category} श्रेणी के अंतर्गत प्रकाशित हुआ है।`,
      questionEn: `Which category does this article belong to?`,
      answerEn: `This article is published under ${String(article.categoryNameEn || category)}.`,
    },
    {
      questionHi: `और जानकारी कहाँ पढ़ें?`,
      answerHi: `पूरी रिपोर्ट और संदर्भ News Junction लेख में उपलब्ध हैं।`,
      questionEn: `Where can I read more details?`,
      answerEn: `Full context and details are available in this News Junction article.`,
    },
  ];
}

function buildDefaultMeta(article: Record<string, unknown>) {
  const titleHi = String(article.titleHi || "").slice(0, 60);
  const titleEn = String(article.titleEn || "").slice(0, 60);
  const descHi = String(article.summaryHi || article.summaryEn || "").slice(0, 155);
  const descEn = String(article.summaryEn || article.summaryHi || "").slice(0, 155);
  return {
    seoTitle: titleHi || titleEn,
    seoTitleHi: titleHi,
    seoTitleEn: titleEn,
    seoDescription: descHi || descEn,
    seoDescriptionHi: descHi,
    seoDescriptionEn: descEn,
    ogTitle: titleEn || titleHi,
    ogDescription: descEn || descHi,
    twitterTitle: titleEn || titleHi,
    twitterDescription: descEn || descHi,
  };
}

function appendInternalLinksToContent(
  content: string,
  links: {
    slug: string;
    anchorTextHi: string;
    anchorTextEn: string;
  }[],
  lang: "hi" | "en"
): string {
  if (!links.length) return content;
  if (content.includes("nj-internal-links")) return content;

  const items = links
    .filter((l) => l.slug)
    .slice(0, 4)
    .map((l) => {
      const anchor = lang === "hi" ? l.anchorTextHi || l.anchorTextEn : l.anchorTextEn || l.anchorTextHi;
      return `<li><a href="/article/${l.slug}">${anchor}</a></li>`;
    })
    .join("");

  if (!items) return content;
  const heading = lang === "hi" ? "संबंधित लेख" : "Related articles";
  return `${content}\n<section class="nj-internal-links"><h3>${heading}</h3><ul>${items}</ul></section>`;
}

async function ensureInternalLinks(
  articleId: string,
  article: Record<string, unknown>,
  force: boolean
): Promise<number> {
  const existing = Array.isArray(article.seoInternalLinks) ? article.seoInternalLinks : [];
  if (existing.length >= 3 && !force) return existing.length;

  const suggestions = await generateInternalLinks(articleId);
  const links = suggestions
    .filter((s) => s.slug && s.suggestedArticleId)
    .slice(0, 5)
    .map((s) => ({
      suggestedArticleId: s.suggestedArticleId,
      slug: s.slug,
      titleHi: s.titleHi,
      titleEn: s.titleEn,
      anchorTextHi: s.anchorTextHi,
      anchorTextEn: s.anchorTextEn,
    }));

  if (!links.length) return 0;

  const contentHi = appendInternalLinksToContent(String(article.contentHi || ""), links, "hi");
  const contentEn = appendInternalLinksToContent(String(article.contentEn || ""), links, "en");

  await getAdminDb().collection("news").doc(articleId).update({
    seoInternalLinks: links,
    contentHi,
    contentEn,
    updatedAt: new Date().toISOString(),
  });

  return links.length;
}

async function ensureFaq(
  articleId: string,
  article: Record<string, unknown>,
  force: boolean
): Promise<boolean> {
  const existing = Array.isArray(article.seoFaqItems) ? article.seoFaqItems : [];
  if (existing.length >= 3 && !force) return false;

  let faq: SeoFaqItem[] = [];
  try {
    const out = await generateSeoFaq(articleId);
    faq = (out.result || []).filter(
      (f) => f.questionHi && f.answerHi && f.questionEn && f.answerEn
    );
  } catch {
    faq = [];
  }

  if (faq.length < 3) {
    faq = fallbackFaq(article);
  }

  await getAdminDb().collection("news").doc(articleId).update({
    seoFaqItems: faq,
    updatedAt: new Date().toISOString(),
  });
  return true;
}

async function ensureMeta(
  articleId: string,
  article: Record<string, unknown>,
  force: boolean
): Promise<boolean> {
  const hasMeta =
    Boolean(article.seoTitle || article.seoTitleHi) &&
    Boolean(article.seoDescription || article.seoDescriptionHi);
  if (hasMeta && !force) return false;

  let patch = buildDefaultMeta(article);
  try {
    const out = await generateSeoMeta(articleId);
    const r = out.result;
    patch = {
      seoTitle: r.seoTitleHi || patch.seoTitle,
      seoTitleHi: r.seoTitleHi || patch.seoTitleHi,
      seoTitleEn: r.seoTitleEn || patch.seoTitleEn,
      seoDescription: r.metaDescriptionHi || patch.seoDescription,
      seoDescriptionHi: r.metaDescriptionHi || patch.seoDescriptionHi,
      seoDescriptionEn: r.metaDescriptionEn || patch.seoDescriptionEn,
      ogTitle: r.ogTitle || patch.ogTitle,
      ogDescription: r.ogDescription || patch.ogDescription,
      twitterTitle: r.twitterTitle || patch.twitterTitle,
      twitterDescription: r.twitterDescription || patch.twitterDescription,
    };
  } catch {
    // keep deterministic meta
  }

  await getAdminDb().collection("news").doc(articleId).update({
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  return true;
}

async function ensureNewsletterSnippet(articleId: string, article: Record<string, unknown>) {
  if (article.newsletterSnippet) return;
  const snippet = String(article.summaryEn || article.summaryHi || article.titleEn || "").slice(0, 220);
  if (!snippet) return;
  await getAdminDb().collection("news").doc(articleId).update({
    newsletterSnippet: snippet,
    updatedAt: new Date().toISOString(),
  });
}

async function ensurePushText(articleId: string, article: Record<string, unknown>) {
  if (article.pushText) return String(article.pushText);
  const pushText = String(article.summaryHi || article.summaryEn || article.titleHi || "").slice(0, 140);
  if (pushText) {
    await getAdminDb().collection("news").doc(articleId).update({
      pushText,
      updatedAt: new Date().toISOString(),
    });
  }
  return pushText;
}

async function queueSocialShares(articleId: string, article: Record<string, unknown>): Promise<number> {
  const settings = await getSocialSettings();
  if (!settings.autoPublishEnabled) return 0;

  const existing = await getAdminDb()
    .collection("socialPostQueue")
    .where("articleId", "==", articleId)
    .limit(1)
    .get();
  if (!existing.empty) return 0;

  const accounts = await getSocialAccounts();
  const enabled = accounts.filter((a) => a.enabled && a.status === "connected");
  if (!enabled.length) return 0;

  const title = String(article.titleEn || article.titleHi || "");
  const summary = String(article.summaryEn || article.summaryHi || "");
  const slug = String(article.slug || "");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://news-junction.vercel.app";
  const url = `${siteUrl}/article/${slug}`;
  const text = `${title}\n\n${summary.slice(0, 180)}\n\n${url}`;
  const approvalStatus = settings.requireApprovalBeforePosting ? "pending" : "approved";

  let queued = 0;
  for (const account of enabled.slice(0, 3)) {
    try {
      await schedulePost({
        articleId,
        platform: account.platform,
        text,
        hashtags: Array.isArray(article.tags) ? (article.tags as string[]).slice(0, 5) : [],
        cta: "Read full story on News Junction.",
        imageUrl: String(article.imageUrl || "") || undefined,
        language: "en",
        approvalStatus,
        createdBy: "system-on-publish",
      });
      queued += 1;
    } catch {
      // continue other platforms
    }
  }
  return queued;
}

/**
 * Run on every published article (AI-generated or manual).
 * Non-throwing for individual steps — returns aggregated errors.
 */
export async function enrichArticleOnPublish(
  articleId: string,
  options: OnPublishOptions = {}
): Promise<OnPublishResult> {
  const {
    forceFaq = false,
    forceLinks = false,
    forceMeta = false,
    sendPush = true,
    queueSocial = true,
    skipIfDraft = true,
  } = options;

  const result: OnPublishResult = {
    articleId,
    faqAdded: false,
    linksAdded: 0,
    metaUpdated: false,
    pushSent: 0,
    socialQueued: 0,
    errors: [],
  };

  const snap = await getAdminDb().collection("news").doc(articleId).get();
  if (!snap.exists) {
    result.errors.push("Article not found");
    return result;
  }

  let article = { id: snap.id, ...snap.data() } as Record<string, unknown>;
  if (skipIfDraft && String(article.status) !== "published") {
    result.errors.push("Skipped — article not published");
    return result;
  }

  // Prefer SEO settings but do not block enrich when SEO AI is disabled for FAQ/meta AI.
  try {
    await getSeoAiSettings();
  } catch {
    /* ignore */
  }

  try {
    result.faqAdded = await ensureFaq(articleId, article, forceFaq);
    const refreshed = await getAdminDb().collection("news").doc(articleId).get();
    article = { id: refreshed.id, ...refreshed.data() } as Record<string, unknown>;
  } catch (err) {
    result.errors.push(`FAQ: ${err instanceof Error ? err.message : "failed"}`);
  }

  try {
    result.linksAdded = await ensureInternalLinks(articleId, article, forceLinks);
    const refreshed = await getAdminDb().collection("news").doc(articleId).get();
    article = { id: refreshed.id, ...refreshed.data() } as Record<string, unknown>;
  } catch (err) {
    result.errors.push(`Links: ${err instanceof Error ? err.message : "failed"}`);
  }

  try {
    result.metaUpdated = await ensureMeta(articleId, article, forceMeta);
  } catch (err) {
    result.errors.push(`Meta: ${err instanceof Error ? err.message : "failed"}`);
  }

  try {
    await ensureNewsletterSnippet(articleId, article);
    await ensurePushText(articleId, article);
  } catch (err) {
    result.errors.push(`Snippets: ${err instanceof Error ? err.message : "failed"}`);
  }

  if (sendPush) {
    try {
      const fresh = await getAdminDb().collection("news").doc(articleId).get();
      const data = fresh.data() || {};
      if (data.pushSentAt && !options.forceFaq) {
        // Avoid duplicate pushes on re-save unless forcing enrichment batch
      } else {
        const push = await sendNewArticlePush({
          id: articleId,
          titleHi: String(data.titleHi || ""),
          titleEn: String(data.titleEn || ""),
          summaryHi: String(data.summaryHi || ""),
          summaryEn: String(data.summaryEn || ""),
          slug: String(data.slug || ""),
          pushText: String(data.pushText || ""),
          isBreaking: Boolean(data.isBreaking),
        });
        result.pushSent = push.sent;
        await getAdminDb().collection("news").doc(articleId).update({
          pushSentAt: new Date().toISOString(),
          pushDelivery: { attempted: push.attempted, sent: push.sent, failed: push.failed },
        });
        if (push.errors.length) result.errors.push(...push.errors.slice(0, 3));
      }
    } catch (err) {
      result.errors.push(`Push: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  if (queueSocial) {
    try {
      const fresh = await getAdminDb().collection("news").doc(articleId).get();
      result.socialQueued = await queueSocialShares(articleId, {
        id: fresh.id,
        ...fresh.data(),
      } as Record<string, unknown>);
    } catch (err) {
      result.errors.push(`Social: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  await getAdminDb().collection("articleEnrichmentLogs").add({
    ...result,
    createdAt: new Date().toISOString(),
  });

  return result;
}

export async function backfillPublishedArticles(limit = 30): Promise<{
  processed: number;
  results: OnPublishResult[];
}> {
  const snap = await getAdminDb()
    .collection("news")
    .where("status", "==", "published")
    .limit(Math.min(Math.max(limit, 1), 100))
    .get();

  const results: OnPublishResult[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const needsFaq = !Array.isArray(data.seoFaqItems) || data.seoFaqItems.length < 3;
    const needsLinks = !Array.isArray(data.seoInternalLinks) || data.seoInternalLinks.length < 2;
    if (!needsFaq && !needsLinks) continue;

    const r = await enrichArticleOnPublish(doc.id, {
      sendPush: false,
      queueSocial: false,
      forceFaq: needsFaq,
      forceLinks: needsLinks,
    });
    results.push(r);
  }

  return { processed: results.length, results };
}
