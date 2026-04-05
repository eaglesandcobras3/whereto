"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  runMiningPipeline,
  MAX_MINING_INPUT_BYTES,
} from "@/lib/topic-mining/pipeline";
import { parseSourceType } from "@/lib/topic-mining/source-types";

export type ProcessMiningResult = {
  ok: true;
  upserted: number;
  belowThreshold: number;
  durationMs: number;
} | { ok: false; error: string };

/**
 * Privacy: HTML never stored. Logs must not include raw input (caller responsibility).
 */
export async function processTopicMiningAction(
  formData: FormData,
): Promise<ProcessMiningResult> {
  const { user } = await requireAdmin();
  const html = String(formData.get("html") ?? "").trim();
  if (!html) {
    return { ok: false, error: "Empty input" };
  }

  const sourceType = parseSourceType(String(formData.get("source_type") ?? ""));
  const regionRaw = formData.get("region_id");
  const townBias = String(formData.get("town_bias") ?? "").trim() || null;
  const regionNum =
    regionRaw != null && String(regionRaw) !== ""
      ? Number(regionRaw)
      : NaN;
  const scopedRegionId = Number.isFinite(regionNum) ? regionNum : null;

  let buckets;
  let meta;
  try {
    const out = runMiningPipeline({
      html,
      sourceType,
      regionId: scopedRegionId,
      townBias,
    });
    buckets = out.buckets;
    meta = out.meta;
  } catch (e) {
    const code = e instanceof Error && e.message === "INPUT_TOO_LARGE" ? "INPUT_TOO_LARGE" : "PIPELINE_ERROR";
    const supabase = getServiceSupabase();
    await supabase.from("mining_run_audit").insert({
      created_by: user.id,
      source_type: sourceType,
      region_id: scopedRegionId,
      town_bias: townBias,
      input_bytes: Buffer.byteLength(html, "utf8"),
      candidates_upserted: 0,
      candidates_below_threshold: 0,
      duration_ms: null,
      error_code: code,
    });
    return {
      ok: false,
      error:
        code === "INPUT_TOO_LARGE"
          ? `Input exceeds ${MAX_MINING_INPUT_BYTES} bytes`
          : "Processing failed",
    };
  }

  const supabase = getServiceSupabase();
  let upserted = 0;

  for (const b of buckets) {
    const { data: existing } = await supabase
      .from("category_candidates")
      .select("id, frequency, confidence_score, local_relevance_score")
      .eq("dedupe_key", b.dedupe_key)
      .maybeSingle();

    const now = new Date().toISOString();
    if (existing?.id) {
      const prevF = (existing.frequency as number) ?? 0;
      const newF = prevF + b.hits;
      const conf = Math.max(
        Number(existing.confidence_score),
        b.confidence_score,
      );
      const loc = Math.max(
        Number(existing.local_relevance_score),
        b.local_relevance_score,
      );
      const { error } = await supabase
        .from("category_candidates")
        .update({
          frequency: newF,
          confidence_score: conf,
          local_relevance_score: loc,
          last_seen_at: now,
        })
        .eq("id", existing.id as number);
      if (!error) upserted += 1;
    } else {
      const { error } = await supabase.from("category_candidates").insert({
        normalized_category: b.normalized_category,
        category_type: b.category_type,
        intent_type: b.intent_type,
        frequency: b.hits,
        confidence_score: b.confidence_score,
        local_relevance_score: b.local_relevance_score,
        source_type: sourceType,
        region_id: scopedRegionId,
        town_bias: townBias,
        first_seen_at: now,
        last_seen_at: now,
        approval_status: "pending",
        dedupe_key: b.dedupe_key,
      });
      if (!error) upserted += 1;
    }
  }

  await supabase.from("mining_run_audit").insert({
    created_by: user.id,
    source_type: sourceType,
    region_id: scopedRegionId,
    town_bias: townBias,
    input_bytes: meta.inputBytes,
    candidates_upserted: upserted,
    candidates_below_threshold: meta.candidatesBelowThreshold,
    duration_ms: meta.durationMs,
    error_code: null,
  });

  revalidatePath("/admin/topic-mining");
  return {
    ok: true,
    upserted,
    belowThreshold: meta.candidatesBelowThreshold,
    durationMs: meta.durationMs,
  };
}

export async function setCandidateStatusAction(
  candidateId: number,
  status: "approved" | "rejected" | "suppressed",
): Promise<void> {
  const { user } = await requireAdmin();
  const supabase = getServiceSupabase();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("category_candidates")
    .update({
      approval_status: status,
      approved_by: user.id,
      approved_at: now,
    })
    .eq("id", candidateId);

  if (error) return;

  if (status !== "approved") {
    await supabase
      .from("category_build_queue")
      .delete()
      .eq("candidate_id", candidateId);
  }

  if (status === "approved") {
    const { data: row } = await supabase
      .from("category_candidates")
      .select("normalized_category, intent_type")
      .eq("id", candidateId)
      .single();

    const slugBase = (row?.normalized_category as string)
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    await supabase.from("category_build_queue").upsert(
      {
        candidate_id: candidateId,
        priority: 3,
        suggested_slug: slugBase || `candidate-${candidateId}`,
        status: "queued",
        payload_json: {
          normalized_category: row?.normalized_category,
          intent_type: row?.intent_type,
          note: "From privacy-safe topic mining — manual taxonomy work required",
        },
        created_by: user.id,
      },
      { onConflict: "candidate_id" },
    );
  }

  revalidatePath("/admin/topic-mining");
}

export async function removeFromBuildQueueAction(queueId: number): Promise<void> {
  await requireAdmin();
  const supabase = getServiceSupabase();
  await supabase.from("category_build_queue").delete().eq("id", queueId);
  revalidatePath("/admin/topic-mining");
}

export async function candidateDecisionAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("candidate_id"));
  const status = String(formData.get("status") ?? "");
  if (!Number.isFinite(id)) return;
  if (
    status !== "approved" &&
    status !== "rejected" &&
    status !== "suppressed"
  ) {
    return;
  }
  await setCandidateStatusAction(id, status);
}

export async function queueRemoveFormAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("queue_id"));
  if (!Number.isFinite(id)) return;
  await removeFromBuildQueueAction(id);
}
