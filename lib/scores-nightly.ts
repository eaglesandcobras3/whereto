import { getServiceSupabase } from "@/lib/supabase/service-role";

/** MVP nightly recompute: engagement from totals, freshness from last_refreshed_at, confidence from data completeness. */
export async function runScoreComputation() {
  const supabase = getServiceSupabase();
  const { data: rows, error } = await supabase
    .from("businesses")
    .select(
      "id, total_impressions, total_clicks, total_saves, total_shares, last_refreshed_at, google_review_count, ai_summary, admin_suppressed, suspected_closed",
    )
    .eq("status", "active");

  if (error) throw error;
  const now = Date.now();
  let updated = 0;

  for (const b of rows ?? []) {
    const imp = Math.max(1, (b.total_impressions as number) || 1);
    const clicks = (b.total_clicks as number) || 0;
    const saves = (b.total_saves as number) || 0;
    const shares = (b.total_shares as number) || 0;
    const rate = (clicks + saves * 2 + shares * 2) / imp;
    const engagement = Math.min(1, 0.15 + rate * 2);

    const last = new Date(b.last_refreshed_at as string).getTime();
    const days = (now - last) / 86400000;
    const freshness = Math.max(0, Math.min(1, 1 - days / 90));

    const reviews = (b.google_review_count as number) || 0;
    const hasSummary = Boolean(b.ai_summary);
    const confidence = Math.min(
      1,
      0.35 + Math.min(reviews / 200, 0.35) + (hasSummary ? 0.25 : 0),
    );

    const exploration =
      reviews < 20 && (b.total_impressions as number) < 500 ? 0.04 : 0;

    await supabase
      .from("businesses")
      .update({
        engagement_score: engagement,
        freshness_score: freshness,
        confidence_score: confidence,
        exploration_score: exploration,
      })
      .eq("id", b.id);

    await supabase.from("business_scores_history").insert({
      business_id: b.id,
      confidence_score: confidence,
      freshness_score: freshness,
      engagement_score: engagement,
      exploration_score: exploration,
      completeness_score: hasSummary ? 0.85 : 0.5,
      negative_feedback_adjustment: 0,
    });
    updated += 1;
  }

  return { updated };
}
