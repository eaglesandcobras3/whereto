import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { runSyncBusinessHeroImagesBatch } from "@/lib/ingestion/sync-business-hero-images";

/**
 * Legacy route: hero images are no longer pulled from third-party map APIs.
 * Owner / licensed uploads should populate `business_images` and `hero_image_url` instead.
 */
export async function GET(request: NextRequest) {
  try {
    assertCronAuthorized(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const report = await runSyncBusinessHeroImagesBatch(40);
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Hero image sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
