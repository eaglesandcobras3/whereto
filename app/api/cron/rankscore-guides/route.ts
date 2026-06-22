import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { getRankScoreConfig } from "@/lib/rankscore/config";
import { syncRankScoreGuides } from "@/lib/rankscore/sync-guides";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

/** Cron: pull RankScore articles into `guides`. Requires RANKSCORE_* env + CRON_SECRET. */
export async function GET(request: NextRequest) {
  try {
    assertCronAuthorized(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getRankScoreConfig()) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "RANKSCORE_API_BASE or RANKSCORE_API_KEY not set",
    });
  }

  const supabase = getServiceSupabaseOrNull();
  if (!supabase) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      reason: "Supabase service role not configured",
    });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const maxArticles = limitParam ? Number(limitParam) : undefined;
  if (limitParam && (!Number.isFinite(maxArticles) || maxArticles! <= 0)) {
    return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
  }

  try {
    const result = await syncRankScoreGuides(supabase, { maxArticles });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
