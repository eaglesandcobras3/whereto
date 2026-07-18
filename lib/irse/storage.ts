import type { SupabaseClient } from "@supabase/supabase-js";
import { centroidOf } from "./confidence";
import type { CategoryScores, PageKind, ScoreResult } from "./types";
import { CONFIDENCE_PEER_MIN } from "./weights";

export async function saveScoreSnapshot(
  supabase: SupabaseClient,
  result: ScoreResult,
): Promise<void> {
  const { error } = await supabase.from("irse_score_snapshots").insert({
    kind: result.kind,
    slug: result.slug,
    path: result.path,
    overall_score: result.overallScore,
    scores: result.scores,
    flags: result.flags,
    recommendations: result.recommendations,
    confidence: result.confidence,
    band: result.band,
    index_ready: result.indexReady,
    scored_at: new Date().toISOString(),
  });
  if (error) {
    // Tables may not be applied yet — don't fail scoring.
    console.warn("irse_score_snapshots insert failed:", error.message);
  }
}

export async function loadIndexedPeerCentroid(
  supabase: SupabaseClient,
  kind: PageKind,
): Promise<{ centroid: CategoryScores | null; count: number }> {
  const { data: inspections, error: inspErr } = await supabase
    .from("gsc_url_inspections")
    .select("url")
    .eq("indexed", true)
    .limit(500);
  if (inspErr || !inspections?.length) {
    return { centroid: null, count: 0 };
  }

  const { data: scores, error: scoreErr } = await supabase
    .from("irse_latest_scores")
    .select("path, scores")
    .eq("kind", kind)
    .limit(500);
  if (scoreErr || !scores?.length) {
    // Fallback: query snapshots directly if view missing
    const { data: snaps } = await supabase
      .from("irse_score_snapshots")
      .select("path, scores, scored_at")
      .eq("kind", kind)
      .order("scored_at", { ascending: false })
      .limit(500);
    return centroidFromJoin(inspections as { url: string }[], snaps ?? []);
  }

  return centroidFromJoin(inspections as { url: string }[], scores);
}

function centroidFromJoin(
  inspections: Array<{ url: string }>,
  scoreRows: Array<{ path?: string; scores?: CategoryScores }>,
): { centroid: CategoryScores | null; count: number } {
  const indexedPaths = new Set(
    inspections.map((i) => {
      try {
        return new URL(i.url).pathname;
      } catch {
        return i.url;
      }
    }),
  );

  const vectors: CategoryScores[] = [];
  for (const row of scoreRows) {
    const path = row.path;
    if (!path || !indexedPaths.has(path)) continue;
    if (row.scores && typeof row.scores === "object") {
      vectors.push(row.scores as CategoryScores);
    }
  }

  if (vectors.length < CONFIDENCE_PEER_MIN) {
    return { centroid: centroidOf(vectors), count: vectors.length };
  }
  return { centroid: centroidOf(vectors), count: vectors.length };
}
