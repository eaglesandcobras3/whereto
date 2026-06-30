import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeGuideCustomFields, parseGuideCustomFields } from "@/lib/guides/custom-fields";
import {
  buildGuideEnrichmentPrompt,
  enrichmentToGuidePatch,
  guideEnrichmentSchema,
  type GuideEnrichmentInput,
} from "@/lib/guides/guide-enrichment-schema";

export type GuideRowForEnrichment = {
  id: string;
  title: string;
  content: string | null;
  guide_type: string | null;
  custom_fields: unknown;
};

export async function loadGuideEnrichmentContext(
  supabase: SupabaseClient,
  guideId: string,
): Promise<GuideEnrichmentInput | null> {
  const { data: guide } = await supabase
    .from("guides")
    .select("id, title, content, guide_type")
    .eq("id", guideId)
    .maybeSingle();

  if (!guide) return null;

  const row = guide as GuideRowForEnrichment;
  if (!row.content?.trim()) return null;

  const [townsRes, areasRes, bizRes] = await Promise.all([
    supabase
      .from("guide_towns")
      .select("towns ( name )")
      .eq("guide_id", guideId),
    supabase
      .from("guide_areas")
      .select("areas ( name )")
      .eq("guide_id", guideId),
    supabase
      .from("guide_businesses")
      .select("businesses ( title )")
      .eq("guide_id", guideId),
  ]);

  const town_names = (townsRes.data ?? [])
    .map((r) => (r.towns as { name?: string } | null)?.name)
    .filter((n): n is string => Boolean(n));
  const area_names = (areasRes.data ?? [])
    .map((r) => (r.areas as { name?: string } | null)?.name)
    .filter((n): n is string => Boolean(n));
  const business_names = (bizRes.data ?? [])
    .map((r) => (r.businesses as { title?: string } | null)?.title)
    .filter((n): n is string => Boolean(n));

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    guide_type: row.guide_type,
    town_names,
    area_names,
    business_names,
  };
}

export async function generateGuideEnrichment(
  input: GuideEnrichmentInput,
): Promise<ReturnType<typeof guideEnrichmentSchema.parse>> {
  const { object } = await generateObject({
    model: openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
    schema: guideEnrichmentSchema,
    prompt: buildGuideEnrichmentPrompt(input),
  });
  return object;
}

export type EnrichGuideResult =
  | { ok: true; guideId: string; enrichedAt: string }
  | { ok: false; error: string };

export async function enrichGuideById(
  supabase: SupabaseClient,
  guideId: string,
): Promise<EnrichGuideResult> {
  const input = await loadGuideEnrichmentContext(supabase, guideId);
  if (!input) {
    return { ok: false, error: "Guide not found or has no markdown content." };
  }

  const { data: existing } = await supabase
    .from("guides")
    .select("custom_fields")
    .eq("id", guideId)
    .maybeSingle();

  let enrichment;
  try {
    enrichment = await generateGuideEnrichment(input);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Enrichment failed";
    return { ok: false, error: msg };
  }

  const now = new Date().toISOString();
  const patch = enrichmentToGuidePatch(enrichment, now);
  const cf = mergeGuideCustomFields(existing?.custom_fields, {
    enriched_at: now,
    search_profile: enrichment.search_profile,
    enrichment_version: 1,
  });
  patch.custom_fields = cf;
  patch.date_updated = now;

  const { error } = await supabase.from("guides").update(patch).eq("id", guideId);
  if (error) return { ok: false, error: error.message };

  return { ok: true, guideId, enrichedAt: now };
}

export function guideEnrichmentSummary(customFields: unknown): {
  enriched: boolean;
  enrichedAt: string | null;
  searchProfile: string | null;
} {
  const cf = parseGuideCustomFields(customFields);
  return {
    enriched: Boolean(cf.enriched_at),
    enrichedAt: cf.enriched_at ?? null,
    searchProfile: cf.search_profile ?? null,
  };
}
