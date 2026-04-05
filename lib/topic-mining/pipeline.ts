import { createHash } from "crypto";
import type { MiningSourceType } from "@/lib/topic-mining/source-types";
import { TOPIC_PATTERNS } from "@/lib/topic-mining/patterns";
import { htmlToPlainText, redactForMining } from "@/lib/topic-mining/sanitize";

/** Max pasted HTML size (bytes). */
export const MAX_MINING_INPUT_BYTES = 512 * 1024;

/** Minimum regex hits in this job to persist a candidate (design: ≥3; use 2 for sparse real-world pastes). */
export const MIN_MENTIONS_TO_PERSIST = 2;

/** Below this confidence, drop candidate. */
export const MIN_CONFIDENCE_TO_PERSIST = 0.35;

export type MiningBucket = {
  normalized_category: string;
  category_type: string;
  intent_type: string | null;
  hits: number;
  confidence_score: number;
  local_relevance_score: number;
  dedupe_key: string;
};

export type MiningPipelineMeta = {
  inputBytes: number;
  plainTextChars: number;
  redactedChars: number;
  durationMs: number;
  candidatesPassed: number;
  candidatesBelowThreshold: number;
};

function countMatches(text: string, re: RegExp): number {
  const flags = re.global ? re.flags : `${re.flags}g`;
  const r = new RegExp(re.source, flags);
  let n = 0;
  while (r.exec(text) !== null) {
    n += 1;
    if (n > 500) break;
  }
  return n;
}

export function makeDedupeKey(input: {
  normalized_category: string;
  intent_type: string | null;
  region_id: number | null;
  town_bias: string | null;
  source_type: string;
}): string {
  const payload = [
    input.normalized_category,
    input.intent_type ?? "",
    String(input.region_id ?? ""),
    input.town_bias ?? "",
    input.source_type,
  ].join("\x1e");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Ephemeral: processes HTML in memory; returns only aggregate buckets (no raw text).
 */
export function runMiningPipeline(input: {
  html: string;
  sourceType: MiningSourceType;
  regionId: number | null;
  townBias: string | null;
}): { buckets: MiningBucket[]; meta: MiningPipelineMeta } {
  const t0 = Date.now();
  const inputBytes = Buffer.byteLength(input.html, "utf8");

  if (inputBytes > MAX_MINING_INPUT_BYTES) {
    throw new Error("INPUT_TOO_LARGE");
  }

  const plain = htmlToPlainText(input.html);
  const redacted = redactForMining(plain);

  const baseLocal = input.townBias ? 0.72 : 0.52;
  const buckets: MiningBucket[] = [];
  let below = 0;

  for (const p of TOPIC_PATTERNS) {
    const hits = countMatches(redacted, p.re);
    if (hits < MIN_MENTIONS_TO_PERSIST) {
      if (hits > 0) below += 1;
      continue;
    }

    const boosted = Math.min(0.95, p.weight + 0.04 * Math.min(hits - 2, 5));
    const confidence = Math.min(0.95, boosted + (hits >= 5 ? 0.05 : 0));
    if (confidence < MIN_CONFIDENCE_TO_PERSIST) {
      below += 1;
      continue;
    }

    const local = Math.min(0.95, baseLocal + (hits >= 4 ? 0.08 : 0));

    buckets.push({
      normalized_category: p.normalized_category,
      category_type: p.category_type,
      intent_type: p.intent_type,
      hits,
      confidence_score: Number(confidence.toFixed(3)),
      local_relevance_score: Number(local.toFixed(3)),
      dedupe_key: makeDedupeKey({
        normalized_category: p.normalized_category,
        intent_type: p.intent_type,
        region_id: input.regionId,
        town_bias: input.townBias,
        source_type: input.sourceType,
      }),
    });
  }

  const durationMs = Date.now() - t0;
  return {
    buckets,
    meta: {
      inputBytes,
      plainTextChars: plain.length,
      redactedChars: redacted.length,
      durationMs,
      candidatesPassed: buckets.length,
      candidatesBelowThreshold: below,
    },
  };
}
