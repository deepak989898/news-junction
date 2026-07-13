import "server-only";

import { constants, existsSync } from "fs";
import fs from "fs/promises";
import os from "os";
import path from "path";
import ffmpegStatic from "ffmpeg-static";

const EXECUTABLE = os.platform() === "win32" ? "ffmpeg.exe" : "ffmpeg";

function cwdBinaryPath(): string {
  return path.join(process.cwd(), "node_modules", "ffmpeg-static", EXECUTABLE);
}

function candidatePaths(): string[] {
  return [
    cwdBinaryPath(),
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe"),
    ffmpegStatic,
  ].filter((value): value is string => Boolean(value));
}

let cachedPath: string | null | undefined;

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function stageExecutable(source: string): Promise<string> {
  const staged = path.join(os.tmpdir(), `nj-ffmpeg-${process.pid}`);
  await fs.copyFile(source, staged);
  await fs.chmod(staged, 0o755);
  return staged;
}

/** Resolve a runnable ffmpeg binary path for local dev and Vercel serverless. */
export async function resolveFfmpegBinary(): Promise<string | null> {
  if (cachedPath !== undefined) return cachedPath;

  for (const candidate of candidatePaths()) {
    if (!(await fileExists(candidate))) continue;

    try {
      await fs.access(candidate, constants.X_OK);
      cachedPath = candidate;
      return cachedPath;
    } catch {
      try {
        cachedPath = await stageExecutable(candidate);
        return cachedPath;
      } catch {
        // Try next candidate.
      }
    }
  }

  cachedPath = null;
  return null;
}

export function isFfmpegLikelyAvailable(): boolean {
  if (cachedPath) return true;
  return candidatePaths().some((candidate) => existsSync(candidate));
}
