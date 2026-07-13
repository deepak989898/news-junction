import { ImagePipelineSettings } from "./types";

export function getCategoryFallbackUrl(
  categoryId: string,
  settings: ImagePipelineSettings
): string {
  return (
    settings.categoryFallbackImages[categoryId] ||
    settings.categoryFallbackImages.desh ||
    settings.defaultCategoryImage
  );
}

export function isLogoFallback(url: string): boolean {
  return !url || url === "/logo.png" || url.endsWith("/logo.png");
}
