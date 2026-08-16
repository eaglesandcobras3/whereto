import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site-url";
import {
  PRIMARY_EDITORIAL_GUIDE_PATH,
  listSitemapBrowseGroupPaths,
} from "@/lib/seo/sitemap-strategy";
import { indexNowConfig, submitUrlsToIndexNow } from "@/lib/seo/indexnow";
import { categoryHubPath } from "@/lib/routes/category-hub-path";

export const dynamic = "force-dynamic";

/** High-traffic leaf hubs to ping after deploys (full sitemap still drives discovery). */
const PRIORITY_CATEGORY_SLUGS = [
  "restaurants",
  "shopping",
  "coffee_shops",
  "bars",
  "activities",
] as const;

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
  const categoryUrls = PRIORITY_CATEGORY_SLUGS.map(
    (slug) => `${base}${categoryHubPath(slug)}`,
  );
  const rollupUrls = listSitemapBrowseGroupPaths()
    .slice(0, 8)
    .map((path) => `${base}${path}`);

  const result = await submitUrlsToIndexNow([
    base,
    `${base}${PRIMARY_EDITORIAL_GUIDE_PATH}`,
    `${base}/guides`,
    `${base}/businesses`,
    ...categoryUrls,
    ...rollupUrls,
    `${base}/towns`,
    `${base}/sitemap.xml`,
  ]);

  return NextResponse.json({ ok: result.ok, status: result.status });
}
