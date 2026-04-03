import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { runAiSummaryBatch } from "@/lib/ingestion/refresh-runner";

export async function GET(request: NextRequest) {
  try {
    assertCronAuthorized(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const report = await runAiSummaryBatch(15);
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI summaries failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
