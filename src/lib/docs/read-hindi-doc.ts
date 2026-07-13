import "server-only";

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const DOCS_DIR = join(process.cwd(), "docs", "hindi");

/** Safe read for docs/hindi/*.md — blocks path traversal */
export function readHindiDoc(filename: string): { title: string; content: string } | null {
  const base = filename.split(/[/\\]/).pop() || filename;
  if (!/^[A-Za-z0-9._-]+\.md$/.test(base)) return null;

  const fullPath = join(DOCS_DIR, base);
  if (!existsSync(fullPath)) return null;

  const content = readFileSync(fullPath, "utf-8");
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() || base.replace(/\.md$/, "");

  return { title, content };
}

export function listHindiDocs(): string[] {
  try {
    return readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md")).sort();
  } catch {
    return [];
  }
}
