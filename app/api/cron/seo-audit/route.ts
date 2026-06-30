import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { runSiteAuditWithMarkdown } from "@/lib/seo/site-audit/run-audit";
import {
  completeAuditRun,
  createAuditRun,
  failAuditRun,
  isSeoAuditStorageAvailable,
  pruneOldAuditRuns,
} from "@/lib/seo/site-audit/storage";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron: full SEO site crawl + audit (Ahrefs-style checks).
 * Schedule: twice weekly in vercel.json. Requires CRON_SECRET + Supabase tables.
 */
export async function GET(request: NextRequest) {
  try {
    assertCronAuthorized(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = getSiteUrl();
  const supabase = getServiceSupabaseOrNull();
  const maxUrlsParam = request.nextUrl.searchParams.get("maxUrls");
  const maxUrls = maxUrlsParam ? Number(maxUrlsParam) : undefined;

  let runId: string | null = null;
  if (supabase && isSeoAuditStorageAvailable()) {
    runId = await createAuditRun(supabase, baseUrl);
  }

  try {
    const { report, markdown } = await runSiteAuditWithMarkdown({
      baseUrl,
      supabase,
      maxUrls: Number.isFinite(maxUrls) && maxUrls! > 0 ? maxUrls : 2500,
      concurrency: 8,
      maxDepth: 2,
      timeBudgetMs: 270_000,
    });

    const partial =
      report.summary.urlsCrawled < report.summary.urlsDiscovered ? "partial" : "completed";

    if (supabase && runId) {
      await completeAuditRun(supabase, runId, { report, markdown, status: partial });
      await pruneOldAuditRuns(supabase, 12);
    }

    return NextResponse.json({
      ok: true,
      runId,
      status: partial,
      summary: report.summary,
      issueCount: report.issues.length,
      markdownBytes: markdown.length,
      stored: Boolean(runId),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (supabase && runId) {
      await failAuditRun(supabase, runId, message);
    }
    return NextResponse.json({ ok: false, error: message, runId }, { status: 500 });
  }
}
