"use client";

import { useEffect, useState } from "react";
import Image, { ImageProps } from "next/image";

const FALLBACK = "/logo.png";

type NewsArticleImageProps = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null;
  alt: string;
};

export default function NewsArticleImage({ src, alt, className, ...props }: NewsArticleImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src || FALLBACK);

  useEffect(() => {
    setCurrentSrc(src || FALLBACK);
  }, [src]);

  return (
    <Image
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (currentSrc !== FALLBACK) setCurrentSrc(FALLBACK);
      }}
      {...props}
    />
  );
}
