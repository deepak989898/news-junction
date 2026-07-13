import { QUALITY_DIRECTIVES } from "./prompt-builder";

export const VARIANT_SIZES = {
  large: { width: 1536, height: 864 },
  medium: { width: 960, height: 540 },
  thumbnail: { width: 480, height: 270 },
  small: { width: 320, height: 180 },
} as const;

export const WEBP_QUALITY = {
  large: 94,
  medium: 90,
  thumbnail: 85,
} as const;

/** Minimum source pixels — below this we reject rather than upscale a blurry image */
export const MIN_SOURCE_WIDTH = 800;
export const MIN_SOURCE_HEIGHT = 450;

export const OPENAI_SHARPNESS_SUFFIX = `
${QUALITY_DIRECTIVES}
Extra emphasis: maximum sharpness, punchy contrast, vivid but natural color — no faded or hazy look.`;
