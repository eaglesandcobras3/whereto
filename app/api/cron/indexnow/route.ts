import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site-url";
import { indexNowConfig, submitUrlsToIndexNow } from "@/lib/seo/indexnow";

export const dynamic = "force-dynamic";

/** Cron: ping IndexNow with hub URLs after deploys or on schedule. Requires INDEXNOW_KEY + CRON_SECRET. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!indexNowConfig()) {
    return NextResponse.json({ ok: false, skipped: true, reason: "INDEXNOW_KEY not set" });
  }

  const base = getSiteUrl();
  const result = await submitUrlsToIndexNow([
    base,
    `${base}/guide`,
    `${base}/guides`,
    `${base}/categories`,
    `${base}/towns`,
    `${base}/businesses`,
    `${base}/sitemap.xml`,
  ]);

  return NextResponse.json({ ok: result.ok, status: result.status });
}
