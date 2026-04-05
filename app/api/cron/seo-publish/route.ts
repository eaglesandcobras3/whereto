import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { runSeoPublish } from "@/lib/cron/seo-publish";

export async function GET(request: NextRequest) {
  try {
    assertCronAuthorized(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const report = await runSeoPublish(120);
    for (const p of report.revalidatePaths) {
      revalidatePath(p);
    }
    return NextResponse.json(report);
  } catch (e) {
    const message = e instanceof Error ? e.message : "seo publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
