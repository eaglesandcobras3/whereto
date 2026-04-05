import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { runRecommendationPrecompute } from "@/lib/cron/recommendation-precompute";

export async function GET(request: NextRequest) {
  try {
    assertCronAuthorized(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const report = await runRecommendationPrecompute(80);
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : "precompute failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
