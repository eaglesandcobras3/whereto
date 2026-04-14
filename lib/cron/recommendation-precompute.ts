import { getServiceSupabase } from "@/lib/supabase/service-role";
import { hashQuery, normalizeQuery } from "@/lib/query-normalize";
import { searchIntentSchema } from "@/lib/intent-schema";
import { buildRecommendationSet } from "@/lib/search/recommendation-set";
import { loadLocationRankingScope } from "@/lib/search/location-scope";
import type { LocationRankingScope } from "@/lib/scoring";
import {
  TOWN_PRECOMPUTE_TEMPLATES,
  type PrecomputeTemplate,
} from "@/lib/seo/query-cache-keys";

const MIN_BUSINESSES_SEO = 3;

/** Refresh a row when it expires within this window (stale-first scheduling). */
const STALE_SOON_MS = 24 * 60 * 60 * 1000;

type TownRow = { id: number; slug: string; name: string; region_id: number | null };

type PlannedJob = {
  town: TownRow;
  template: PrecomputeTemplate;
  queryKey: string;
};

function planJobsForTowns(towns: TownRow[]): PlannedJob[] {
  const jobs: PlannedJob[] = [];
  for (const town of towns) {
    for (const template of TOWN_PRECOMPUTE_TEMPLATES) {
      jobs.push({
        town,
        template,
        queryKey: template.queryKey(town.slug),
      });
    }
  }
  return jobs;
}

async function upsertPrecomputedSet(
  supabase: ReturnType<typeof getServiceSupabase>,
  job: PlannedJob,
  model: string,
  openaiKey: string | undefined,
): Promise<"inserted" | "updated" | "skipped" | "error"> {
  const { town, template, queryKey } = job;
  const raw = template.rawQuery(town.name);
  const normalized = normalizeQuery(raw);
  const queryHash = hashQuery(`precompute:${queryKey}`);

  const intent = searchIntentSchema.parse({
    category: template.categorySlug,
    subcategory: null,
    location: { town: town.slug, radius: "exact" as const },
    attributes: template.attributes,
    exclude_attributes: [],
    sort_preference: "quality",
    price_level: null,
    result_count: 8,
  });

  const { scope } = await loadLocationRankingScope(supabase, town.slug);
  const locationScope: LocationRankingScope | null = scope;

  const { enriched, businessIds, ranked } = await buildRecommendationSet({
    supabase,
    rawQuery: raw,
    normalizedQuery: normalized,
    intent,
    userId: null,
    model,
    openaiKey,
    locationScope,
    limit: 10,
  });

  const seoEligible = ranked.length >= MIN_BUSINESSES_SEO;
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const fullPayload = {
    ...enriched,
    query_hash: queryHash,
  };

  const { data: existing } = await supabase
    .from("query_cache")
    .select("id")
    .eq("query_key", queryKey)
    .maybeSingle();

  const baseRow = {
    normalized_query: normalized,
    raw_queries: [raw],
    response_json: fullPayload,
    business_ids: businessIds,
    expires_at: expires,
    town_id: town.id,
    region_id: town.region_id,
    filters: {
      category: template.categorySlug,
      town: town.slug,
      attributes: template.attributes,
    },
    scores_snapshot: ranked.slice(0, 10).map((r, i) => ({ id: r.id, rank: i + 1 })),
    seo_eligible: seoEligible,
    seo_slug: template.seoSlug,
    intent_type: "browse_precompute",
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("query_cache")
      .update(baseRow)
      .eq("id", existing.id as string);
    return error ? "error" : "updated";
  }

  const { error } = await supabase.from("query_cache").insert({
    query_hash: queryHash,
    query_key: queryKey,
    ...baseRow,
  });
  return error ? "error" : "inserted";
}

/**
 * Build or refresh high-value `query_cache` rows (category × town + intent rows).
 * Skips rows that are still fresh (expires &gt; ~24h from now) until budget allows.
 */
export async function runRecommendationPrecompute(budget: number) {
  const supabase = getServiceSupabase();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const openaiKey = process.env.OPENAI_API_KEY;

  const { data: towns } = await supabase
    .from("towns")
    .select("id, slug, name, region_id")
    .not("region_id", "is", null)
    .order("name");

  const townList = (towns ?? []) as TownRow[];
  if (!townList.length) {
    return {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      skippedFresh: 0,
      skippedBudget: 0,
      towns: 0,
      jobsPlanned: 0,
    };
  }

  const jobs = planJobsForTowns(townList);
  const keys = [...new Set(jobs.map((j) => j.queryKey))];
  const { data: existingMeta } = await supabase
    .from("query_cache")
    .select("query_key, expires_at")
    .in("query_key", keys);

  const expByKey = new Map<string, string>();
  for (const row of existingMeta ?? []) {
    const k = row.query_key as string;
    const ex = row.expires_at as string;
    if (k) expByKey.set(k, ex);
  }

  const now = Date.now();
  jobs.sort((a, b) => {
    const ea = expByKey.get(a.queryKey);
    const eb = expByKey.get(b.queryKey);
    if (!ea && !eb) return 0;
    if (!ea) return -1;
    if (!eb) return 1;
    return new Date(ea).getTime() - new Date(eb).getTime();
  });

  let processed = 0;
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  let skippedFresh = 0;
  let skippedBudget = 0;

  for (const job of jobs) {
    if (processed >= budget) {
      skippedBudget += 1;
      continue;
    }
    const exp = expByKey.get(job.queryKey);
    if (exp && new Date(exp).getTime() > now + STALE_SOON_MS) {
      skippedFresh += 1;
      continue;
    }

    const result = await upsertPrecomputedSet(supabase, job, model, openaiKey);
    if (result === "error") {
      errors += 1;
      continue;
    }
    if (result === "inserted") inserted += 1;
    if (result === "updated") updated += 1;
    processed += 1;
    const newExp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expByKey.set(job.queryKey, newExp);
  }

  return {
    processed,
    inserted,
    updated,
    errors,
    skippedFresh,
    skippedBudget,
    towns: townList.length,
    jobsPlanned: jobs.length,
  };
}
