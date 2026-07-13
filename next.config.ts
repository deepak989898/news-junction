import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "jwks-rsa", "jose", "sharp", "@google/genai", "ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/ai/generate-video-package": ["./node_modules/ffmpeg-static/ffmpeg"],
    "/api/ai/render-video-package": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
    images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "ichef.bbci.co.uk",
      },
      {
        protocol: "https",
        hostname: "live-production.wcms.abc-cdn.net.au",
      },
      {
        protocol: "https",
        hostname: "**.bbci.co.uk",
      },
      {
        protocol: "https",
        hostname: "**.indiatimes.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    formats: ["image/webp"],
  },
};

export default nextConfig;
