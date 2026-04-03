import { getServiceSupabase } from "@/lib/supabase/service-role";

/** Aggregate private feedback into counter columns (distinct users where applicable). */
async function aggregateFeedbackSignals() {
  const supabase = getServiceSupabase();
  await supabase
    .from("businesses")
    .update({
      bad_experience_unique_users: 0,
      not_relevant_count: 0,
      inaccurate_info_count: 0,
    })
    .eq("status", "active");

  const { data: rows, error } = await supabase
    .from("user_feedback")
    .select("business_id, feedback_type, user_id, session_id");
  if (error || !rows?.length) return;

  type Acc = {
    badUsers: Set<string>;
    notRel: number;
    inaccurate: number;
  };
  const byBiz = new Map<string, Acc>();

  for (const r of rows) {
    const bid = r.business_id as string;
    let acc = byBiz.get(bid);
    if (!acc) {
      acc = { badUsers: new Set(), notRel: 0, inaccurate: 0 };
      byBiz.set(bid, acc);
    }
    const type = r.feedback_type as string;
    const uid = r.user_id as string | null;
    const sid = (r.session_id as string | null) ?? "";
    const dedupeKey = uid ?? `anon:${sid}`;

    if (type === "had_bad_experience" && dedupeKey) acc.badUsers.add(dedupeKey);
    if (type === "not_relevant") acc.notRel += 1;
    if (type === "inaccurate_info") acc.inaccurate += 1;
  }

  for (const [business_id, acc] of byBiz) {
    await supabase
      .from("businesses")
      .update({
        bad_experience_unique_users: acc.badUsers.size,
        not_relevant_count: acc.notRel,
        inaccurate_info_count: acc.inaccurate,
      })
      .eq("id", business_id);
  }
}

/** MVP nightly recompute: engagement from totals, freshness from last_refreshed_at, confidence from data completeness + feedback penalty. */
export async function runScoreComputation() {
  await aggregateFeedbackSignals();

  const supabase = getServiceSupabase();
  const { data: rows, error } = await supabase
    .from("businesses")
    .select(
      "id, total_impressions, total_clicks, total_saves, total_shares, last_refreshed_at, google_review_count, ai_summary, admin_suppressed, suspected_closed, bad_experience_unique_users, not_relevant_count",
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
    let confidence = Math.min(
      1,
      0.35 + Math.min(reviews / 200, 0.35) + (hasSummary ? 0.25 : 0),
    );

    const badU = (b.bad_experience_unique_users as number) || 0;
    const notRel = (b.not_relevant_count as number) || 0;
    confidence -= Math.min(0.2, badU * 0.04 + notRel * 0.01);
    confidence = Math.max(0.05, confidence);

    const exploration =
      reviews < 20 && (b.total_impressions as number) < 500 ? 0.04 : 0;

    const negative_feedback_adjustment = Math.min(0.25, badU * 0.04 + notRel * 0.01);

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
      negative_feedback_adjustment,
    });
    updated += 1;
  }

  return { updated };
}
