"use client";

import { useEffect, useState } from "react";
import Image, { ImageProps } from "next/image";

const FALLBACK = "/logo.png";

type NewsArticleImageProps = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null;
  alt: string;
  variant?: "hero" | "card" | "thumb" | "sidebar";
  imageMediumUrl?: string | null;
  imageLargeUrl?: string | null;
  imageThumbnailUrl?: string | null;
  focalPointX?: number;
  focalPointY?: number;
};

function shouldUseUnoptimized(url: string): boolean {
  if (!url || url.startsWith("/")) return false;
  return !url.includes("firebasestorage.googleapis.com");
}

function pickVariantSrc(props: NewsArticleImageProps): string {
  const primary = props.src && props.src !== "/logo.png" ? props.src : "";
  if (!primary) return FALLBACK;

  switch (props.variant) {
    case "hero":
      return props.imageLargeUrl || props.imageMediumUrl || primary;
    case "card":
      return props.imageMediumUrl || primary;
    case "thumb":
    case "sidebar":
      return props.imageThumbnailUrl || props.imageMediumUrl || primary;
    default:
      return primary;
  }
}

export default function NewsArticleImage({
  src,
  alt,
  className,
  variant = "hero",
  imageMediumUrl,
  imageLargeUrl,
  imageThumbnailUrl,
  focalPointX,
  focalPointY,
  ...props
}: NewsArticleImageProps) {
  const resolved = pickVariantSrc({
    src,
    alt,
    variant,
    imageMediumUrl,
    imageLargeUrl,
    imageThumbnailUrl,
  });
  const [currentSrc, setCurrentSrc] = useState(resolved);
  const [unoptimized, setUnoptimized] = useState(shouldUseUnoptimized(resolved));

  useEffect(() => {
    const next = pickVariantSrc({
      src,
      alt,
      variant,
      imageMediumUrl,
      imageLargeUrl,
      imageThumbnailUrl,
    });
    setCurrentSrc(next);
    setUnoptimized(shouldUseUnoptimized(next));
  }, [src, variant, imageMediumUrl, imageLargeUrl, imageThumbnailUrl, alt]);

  const objectPosition =
    focalPointX !== undefined && focalPointY !== undefined
      ? `${Math.round(focalPointX * 100)}% ${Math.round(focalPointY * 100)}%`
      : "center";

  return (
    <Image
      src={currentSrc}
      alt={alt}
      className={`object-cover ${className || ""}`}
      style={{ objectPosition }}
      unoptimized={unoptimized}
      onError={() => {
        if (currentSrc !== FALLBACK) {
          setCurrentSrc(FALLBACK);
          setUnoptimized(false);
        }
      }}
      {...props}
    />
  );
}
