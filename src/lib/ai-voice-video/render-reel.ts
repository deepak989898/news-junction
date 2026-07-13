import "server-only";

import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
import type { VideoPlatform } from "./types";

const REEL_SIZE: Record<VideoPlatform, { width: number; height: number }> = {
  youtube_shorts: { width: 1080, height: 1920 },
  instagram_reels: { width: 1080, height: 1920 },
  facebook_reels: { width: 1080, height: 1920 },
  telegram: { width: 1080, height: 1920 },
};

function runProcess(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.slice(-800) || `Process exited with code ${code}`));
    });
  });
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function prepareReelFrame(imageUrl: string, width: number, height: number): Promise<Buffer> {
  const raw = await fetchBuffer(imageUrl);
  return sharp(raw)
    .resize(width, height, { fit: "cover", position: "centre" })
    .jpeg({ quality: 92 })
    .toBuffer();
}

/** Combine thumbnail + MP3 into a vertical H.264 MP4 reel (9:16). */
export async function renderReelMp4(args: {
  imageUrl: string;
  audioUrl: string;
  platform?: VideoPlatform;
}): Promise<{ buffer: Buffer; durationSec: number }> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg binary not available on this server");
  }

  const { width, height } = REEL_SIZE[args.platform || "facebook_reels"];
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "nj-reel-"));
  const imagePath = path.join(tmpDir, "frame.jpg");
  const audioPath = path.join(tmpDir, "audio.mp3");
  const outputPath = path.join(tmpDir, "reel.mp4");

  try {
    const [frame, audio] = await Promise.all([
      prepareReelFrame(args.imageUrl, width, height),
      fetchBuffer(args.audioUrl),
    ]);
    await fs.writeFile(imagePath, frame);
    await fs.writeFile(audioPath, audio);

    await runProcess(ffmpegPath, [
      "-loop",
      "1",
      "-i",
      imagePath,
      "-i",
      audioPath,
      "-c:v",
      "libx264",
      "-tune",
      "stillimage",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-shortest",
      "-y",
      outputPath,
    ]);

    const buffer = await fs.readFile(outputPath);

    let durationSec = 0;
    try {
      const { stderr } = await runProcess(ffmpegPath, ["-i", outputPath, "-f", "null", "-"]);
      const match = stderr.match(/Duration:\s(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (match) {
        durationSec = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
      }
    } catch {
      durationSec = 0;
    }

    return { buffer, durationSec: Math.ceil(durationSec) || 30 };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function isReelRenderAvailable(): boolean {
  return Boolean(ffmpegPath);
}
