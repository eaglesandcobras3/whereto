import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { runRefreshBatch } from "@/lib/ingestion/refresh-runner";
import { withDirectoryIngestionCronContext } from "@/lib/ingestion/directory-cron-context";

export async function GET(request: NextRequest) {
  try {
    assertCronAuthorized(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const report = await withDirectoryIngestionCronContext(() =>
      runRefreshBatch(20),
    );
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Refresh failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
