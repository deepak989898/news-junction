import { fetchPermittedImageBuffer } from "./source-fetcher";
import { optimizeAndUploadSingle } from "./optimizer";

export async function hostSourceImageOnFirebase(
  rawNewsId: string,
  sourceUrl: string
): Promise<string | null> {
  const fetched = await fetchPermittedImageBuffer(sourceUrl, {
    openAiImageEnabled: true,
    generateImagesAutomatically: true,
    realPersonAiImageDisabled: true,
    minimumRelevanceScore: 85,
    minimumQualityScore: 80,
    minimumClarityScore: 80,
    maximumRetries: 1,
    maximumDailyImages: 200,
    maximumMonthlyImages: 3000,
    manualReviewForHighRisk: true,
    allowSourceImages: true,
    allowWikimediaImages: false,
    allowedImageDomains: ["firebasestorage.googleapis.com", "storage.googleapis.com"],
    categoryFallbackImages: {},
    defaultCategoryImage: "/logo.png",
    minimumImageWidth: 640,
    minimumImageHeight: 360,
  });

  if (!fetched) return null;
  return optimizeAndUploadSingle(rawNewsId, fetched.buffer);
}
