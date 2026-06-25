import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  batchEnrichmentResponseSchema,
  buildBusinessEnrichmentPrompt,
  enrichmentToDbRow,
  type BusinessEnrichmentFields,
  type BusinessEnrichmentInput,
} from "@/lib/search/business-enrichment-schema";
import {
  buildSearchDocumentFields,
  type SearchDocumentSource,
} from "@/lib/search/derive-search-document";
import {
  businessEmbeddingInput,
  embedBusinessText,
  embeddingToPgvector,
} from "@/lib/search/business-embedding";
import { inferBusinessType, inferCategorySlug } from "@/lib/search/infer-business-metadata";

const BATCH_SIZE = 8;

export type BusinessRowForEnrichment = BusinessEnrichmentInput & {
  business_type: string | null;
  search_profile: string | null;
  item_tags: string[] | null;
  primary_category_id: string | null;
  embedding: unknown;
};

async function loadTagVocabulary(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from("search_tags_vocabulary").select("tag").limit(80);
  return (data ?? []).map((r) => String((r as { tag: string }).tag));
}

async function loadCategoryMap(supabase: SupabaseClient): Promise<Map<string, string>> {
  const { data } = await supabase.from("business_categories").select("id, slug");
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(String((row as { slug: string }).slug), String((row as { id: string }).id));
  }
  return map;
}

export async function generateEnrichmentBatch(
  listings: BusinessEnrichmentInput[],
  vocabSample: string[],
): Promise<Map<string, BusinessEnrichmentFields & { category_slug: string | null }>> {
  const { object } = await generateObject({
    model: openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
    schema: batchEnrichmentResponseSchema,
    prompt: buildBusinessEnrichmentPrompt(listings, vocabSample),
  });

  const out = new Map<string, BusinessEnrichmentFields & { category_slug: string | null }>();
  for (const row of object.enrichments) {
    const { id, category_slug, ...rest } = row;
    out.set(id, { ...rest, category_slug });
  }
  return out;
}

export type ApplyEnrichmentResult = {
  id: string;
  title: string;
  updated: boolean;
  steps: string[];
  error?: string;
};

function heuristicPatch(row: BusinessRowForEnrichment): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const desc = row.excerpt ?? row.content;

  if (!row.business_type) {
    const inferred = inferBusinessType(row.title, desc, row.is_service_business);
    if (inferred) patch.business_type = inferred;
  }

  return patch;
}

function buildSearchDocPatch(row: SearchDocumentSource): Record<string, unknown> {
  const fields = buildSearchDocumentFields(row);
  return {
    search_tags: fields.search_tags,
    search_terms: fields.search_terms,
    embedding_summary: fields.embedding_summary,
  };
}

export async function applyEnrichmentForBusiness(
  supabase: SupabaseClient,
  row: BusinessRowForEnrichment,
  opts: {
    categoryBySlug: Map<string, string>;
    aiPatch?: BusinessEnrichmentFields & { category_slug: string | null };
    openaiKey?: string;
    dryRun?: boolean;
  },
): Promise<ApplyEnrichmentResult> {
  const steps: string[] = [];
  const patch: Record<string, unknown> = { ...heuristicPatch(row) };

  if (!row.primary_category_id) {
    const slug =
      opts.aiPatch?.category_slug ??
      inferCategorySlug(row.title, row.excerpt ?? row.content, row.is_service_business);
    if (slug) {
      const catId = opts.categoryBySlug.get(slug);
      if (catId) {
        patch.primary_category_id = catId;
        steps.push(`category→${slug}`);
      }
    }
  }

  if (opts.aiPatch) {
    const { category_slug, ...enrichment } = opts.aiPatch;
    Object.assign(patch, enrichmentToDbRow(enrichment));
    if (category_slug) {
      const catId = opts.categoryBySlug.get(category_slug);
      if (catId) patch.primary_category_id = catId;
    }
    steps.push("ai-enrichment");
  } else if (opts.dryRun && (!row.search_profile || !row.item_tags?.length)) {
    steps.push("ai-enrichment (pending)");
  }

  const merged: SearchDocumentSource = {
    title: row.title,
    excerpt: row.excerpt,
    business_type: (patch.business_type as string) ?? row.business_type,
    search_keywords: row.search_keywords,
    item_tags: (patch.item_tags as string[]) ?? row.item_tags,
    dietary_tags: (patch.dietary_tags as string[]) ?? null,
    atmosphere_tags: (patch.atmosphere_tags as string[]) ?? null,
    occasion_tags: (patch.occasion_tags as string[]) ?? null,
    meal_period_tags: (patch.meal_period_tags as string[]) ?? null,
  };

  Object.assign(patch, buildSearchDocPatch(merged));
  steps.push("search-document");

  if (opts.openaiKey && !opts.dryRun) {
    const embedText = businessEmbeddingInput({
      title: row.title,
      excerpt: row.excerpt,
      business_type: merged.business_type,
      search_profile: (patch.search_profile as string) ?? row.search_profile,
      embedding_summary: (patch.embedding_summary as string) ?? null,
      search_terms: (patch.search_terms as string) ?? null,
      item_tags: merged.item_tags,
    });
    const embedding = await embedBusinessText(embedText, opts.openaiKey);
    if (embedding) {
      patch.embedding = embeddingToPgvector(embedding);
      patch.embedding_updated_at = new Date().toISOString();
      steps.push("embedding");
    }
  } else if (opts.dryRun && opts.openaiKey) {
    steps.push("embedding (pending)");
  }

  if (opts.dryRun) {
    return { id: row.id, title: row.title, updated: false, steps };
  }

  const { error } = await supabase.from("businesses").update(patch).eq("id", row.id);
  if (error) {
    return { id: row.id, title: row.title, updated: false, steps, error: error.message };
  }

  return { id: row.id, title: row.title, updated: true, steps };
}

export async function runBusinessEnrichmentBackfill(
  supabase: SupabaseClient,
  rows: BusinessRowForEnrichment[],
  opts: {
    apply: boolean;
    skipAi: boolean;
    openaiKey?: string;
    onProgress?: (event: EnrichmentProgressEvent) => void;
  },
): Promise<ApplyEnrichmentResult[]> {
  const report = (event: EnrichmentProgressEvent) => opts.onProgress?.(event);

  const [vocab, categoryBySlug] = await Promise.all([
    loadTagVocabulary(supabase),
    loadCategoryMap(supabase),
  ]);

  const results: ApplyEnrichmentResult[] = [];
  const needsAi = opts.skipAi
    ? []
    : rows.filter((r) => !r.search_profile || !r.item_tags?.length);

  const aiById = new Map<string, BusinessEnrichmentFields & { category_slug: string | null }>();

  if (needsAi.length > 0 && opts.openaiKey && opts.apply) {
    const batchCount = Math.ceil(needsAi.length / BATCH_SIZE);
    report({ phase: "ai-start", total: needsAi.length, batchCount });
    for (let i = 0; i < needsAi.length; i += BATCH_SIZE) {
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const batch = needsAi.slice(i, i + BATCH_SIZE);
      report({
        phase: "ai-batch",
        batch: batchNum,
        batchCount,
        titles: batch.map((b) => b.title),
      });
      const generated = await generateEnrichmentBatch(batch, vocab);
      for (const [id, patch] of generated) aiById.set(id, patch);
      report({ phase: "ai-batch-done", batch: batchNum, batchCount, enriched: generated.size });
    }
    report({ phase: "ai-done", enriched: aiById.size });
  } else if (needsAi.length > 0 && !opts.apply) {
    report({ phase: "ai-skipped", total: needsAi.length, reason: "dry-run" });
  }

  report({ phase: "apply-start", total: rows.length });
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const result = await applyEnrichmentForBusiness(supabase, row, {
      categoryBySlug,
      aiPatch: aiById.get(row.id),
      openaiKey: opts.openaiKey,
      dryRun: !opts.apply,
    });
    results.push(result);
    report({
      phase: "apply-row",
      index: i + 1,
      total: rows.length,
      result,
    });
  }

  return results;
}

export type EnrichmentProgressEvent =
  | { phase: "ai-start"; total: number; batchCount: number }
  | { phase: "ai-batch"; batch: number; batchCount: number; titles: string[] }
  | { phase: "ai-batch-done"; batch: number; batchCount: number; enriched: number }
  | { phase: "ai-done"; enriched: number }
  | { phase: "ai-skipped"; total: number; reason: string }
  | { phase: "apply-start"; total: number }
  | { phase: "apply-row"; index: number; total: number; result: ApplyEnrichmentResult };
