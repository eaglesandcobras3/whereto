import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { runScoreComputation } from "@/lib/scores-nightly";

export async function GET(request: NextRequest) {
  try {
    assertCronAuthorized(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const report = await runScoreComputation();
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Score job failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
