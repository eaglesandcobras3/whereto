import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-static";

/** Serves llms.txt body; public URL is `/llms.txt` via rewrite in next.config.ts. */
export async function GET() {
  const content = await readFile(path.join(process.cwd(), "public", "llms.txt"), "utf8");
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
