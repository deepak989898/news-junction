import { getAutomationSettings } from "@/lib/automation/server-db";
import { DEFAULT_IMAGE_PIPELINE_SETTINGS } from "./defaults";
import { ImagePipelineSettings } from "./types";

export async function getImagePipelineSettings(): Promise<ImagePipelineSettings> {
  const automation = await getAutomationSettings();
  const imageSettings = (automation as unknown as Record<string, unknown>).imagePipeline as
    | Partial<ImagePipelineSettings>
    | undefined;

  return {
    ...DEFAULT_IMAGE_PIPELINE_SETTINGS,
    defaultCategoryImage: automation.defaultCategoryImage || DEFAULT_IMAGE_PIPELINE_SETTINGS.defaultCategoryImage,
    generateImagesAutomatically: automation.generateAiImages !== false,
    openAiImageEnabled: automation.generateAiImages !== false,
    ...imageSettings,
  };
}

export function mergeImagePipelineSettings(
  partial: Partial<ImagePipelineSettings>
): ImagePipelineSettings {
  return {
    ...DEFAULT_IMAGE_PIPELINE_SETTINGS,
    ...partial,
  };
}
