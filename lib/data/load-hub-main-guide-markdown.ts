import "server-only";

import { readFile } from "fs/promises";
import path from "path";
import matter from "gray-matter";

const REL_PATH = "content/guides/ultimate-30a-first-timers-guide.md";

/** Markdown body for the /guide hub (repo file; stays in sync with content compiler). */
export async function loadHubMainGuideMarkdown(): Promise<string> {
  const abs = path.join(process.cwd(), REL_PATH);
  const raw = await readFile(abs, "utf8");
  const { content } = matter(raw);
  return content.trim();
}
