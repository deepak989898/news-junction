"use client";

import { useEffect, useState } from "react";
import Image, { ImageProps } from "next/image";

const FALLBACK = "/logo.png";

type NewsArticleImageProps = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null;
  alt: string;
};

function shouldUseUnoptimized(url: string): boolean {
  if (!url || url.startsWith("/")) return false;
  return !url.includes("firebasestorage.googleapis.com");
}

export default function NewsArticleImage({ src, alt, className, ...props }: NewsArticleImageProps) {
  const initial = src && src !== "/logo.png" ? src : FALLBACK;
  const [currentSrc, setCurrentSrc] = useState(initial);
  const [unoptimized, setUnoptimized] = useState(shouldUseUnoptimized(initial));

  useEffect(() => {
    const next = src && src !== "/logo.png" ? src : FALLBACK;
    setCurrentSrc(next);
    setUnoptimized(shouldUseUnoptimized(next));
  }, [src]);

  return (
    <Image
      src={currentSrc}
      alt={alt}
      className={className}
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
