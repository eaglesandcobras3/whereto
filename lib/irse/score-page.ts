import type { SupabaseClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/site-url";
import { inspectUrl } from "./gsc/client";
import { loadIrseInput } from "./loaders/load-input";
import { absoluteUrlForPath } from "./paths";
import { scoreFromInput } from "./score-from-input";
import { loadIndexedPeerCentroid, saveScoreSnapshot } from "./storage";
import type { PageKind, ScoreResult } from "./types";

export type ScorePageOptions = {
  /** Attach/refresh GSC inspection for this URL. */
  inspect?: boolean;
  /** Force live GSC call (ignore cache TTL). */
  forceInspect?: boolean;
  /** Persist snapshot to irse_score_snapshots. Default true. */
  persist?: boolean;
};

export async function scorePage(
  supabase: SupabaseClient,
  kind: PageKind,
  slug: string,
  options: ScorePageOptions = {},
): Promise<ScoreResult | null> {
  const input = await loadIrseInput(supabase, kind, slug);
  if (!input) return null;

  const peers = await loadIndexedPeerCentroid(supabase, kind);
  let result = scoreFromInput(input, {
    indexedPeerCentroid: peers.centroid,
    indexedPeerCount: peers.count,
  });

  if (options.inspect) {
    const abs = absoluteUrlForPath(result.path, getSiteUrl());
    const gsc = await inspectUrl(supabase, abs, { force: options.forceInspect });
    result = {
      ...result,
      gsc: {
        indexed: gsc.indexed,
        coverageState: gsc.coverageState,
        inspectedAt: gsc.inspectedAt,
      },
    };
  }

  if (options.persist !== false) {
    await saveScoreSnapshot(supabase, result);
  }

  return result;
}
