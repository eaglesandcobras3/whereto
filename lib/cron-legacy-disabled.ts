import { NextResponse } from "next/server";

/** Legacy ingestion / AI / SEO crons removed; data and cache are managed in Directus + optional `query_cache` prune. */
export function cronLegacyDisabledResponse(feature: string) {
  return NextResponse.json({
    disabled: true,
    feature,
    message: "This cron is off. Use Directus for content; only cache-prune remains scheduled in vercel.json.",
  });
}
