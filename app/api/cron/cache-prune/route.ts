import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { pruneExpiredQueryCache } from "@/lib/cache-prune";

export async function GET(request: NextRequest) {
  try {
    assertCronAuthorized(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const report = await pruneExpiredQueryCache();
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cache prune failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
