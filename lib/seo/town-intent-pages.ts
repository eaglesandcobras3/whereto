import type { SupabaseClient } from "@supabase/supabase-js";
import type { EnrichedRecommendationPayload } from "@/lib/search/recommendation-set";
import { TOWN_PRECOMPUTE_TEMPLATES, type PrecomputeTemplate } from "@/lib/seo/query-cache-keys";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";

export type TownIntentTemplate = PrecomputeTemplate;

export type EligibleTownIntentRow = {
  townSlug: string;
  townId: string;
  seoSlug: string;
  lastModified: string | null;
};

export function getTownIntentTemplate(intentSlug: string): TownIntentTemplate | null {
  const normalized = intentSlug.trim();
  if (!normalized) return null;
  return TOWN_PRECOMPUTE_TEMPLATES.find((template) => template.seoSlug === normalized) ?? null;
}

export async function fetchEligibleTownIntentRows(
  supabase: SupabaseClient,
): Promise<EligibleTownIntentRow[]> {
  const [{ data: towns }, { data: rows }] = await Promise.all([
    supabase
      .from("towns")
      .select("id, slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS),
    supabase
      .from("query_cache")
      .select("town_id, seo_slug, expires_at")
      .eq("seo_eligible", true)
      .not("town_id", "is", null)
      .not("seo_slug", "is", null),
  ]);

  const townSlugById = new Map<string, string>();
  for (const row of towns ?? []) {
    const id = String((row as { id: string }).id ?? "").trim();
    const slug = String((row as { slug: string }).slug ?? "").trim();
    if (!id || !slug) continue;
    townSlugById.set(id, slug);
  }

  const seen = new Set<string>();
  const out: EligibleTownIntentRow[] = [];
  for (const row of rows ?? []) {
    const townId = String((row as { town_id: string }).town_id ?? "").trim();
    const seoSlug = String((row as { seo_slug: string }).seo_slug ?? "").trim();
    if (!townId || !seoSlug || !getTownIntentTemplate(seoSlug)) continue;
    const townSlug = townSlugById.get(townId);
    if (!townSlug) continue;
    const key = `${townSlug}:${seoSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      townSlug,
      townId,
      seoSlug,
      lastModified:
        typeof (row as { expires_at?: string | null }).expires_at === "string"
          ? ((row as { expires_at?: string | null }).expires_at ?? null)
          : null,
    });
  }

  return out;
}

export async function fetchTownIntentPayload(
  supabase: SupabaseClient,
  townId: string,
  seoSlug: string,
): Promise<EnrichedRecommendationPayload | null> {
  const { data } = await supabase
    .from("query_cache")
    .select("response_json, expires_at")
    .eq("town_id", townId)
    .eq("seo_slug", seoSlug)
    .eq("seo_eligible", true)
    .maybeSingle();

  if (!data?.response_json) return null;
  const exp = data.expires_at as string | undefined;
  if (exp && new Date(exp).getTime() <= Date.now()) return null;
  const payload = data.response_json as EnrichedRecommendationPayload;
  if (!payload.recommendations?.length) return null;
  return payload;
}

export async function listEligibleTownIntentTemplates(
  supabase: SupabaseClient,
  townId: string,
): Promise<TownIntentTemplate[]> {
  const { data } = await supabase
    .from("query_cache")
    .select("seo_slug")
    .eq("town_id", townId)
    .eq("seo_eligible", true)
    .not("seo_slug", "is", null);

  const eligible = new Set<string>();
  for (const row of data ?? []) {
    const seoSlug = String((row as { seo_slug: string }).seo_slug ?? "").trim();
    if (seoSlug) eligible.add(seoSlug);
  }

  return TOWN_PRECOMPUTE_TEMPLATES.filter((template) => eligible.has(template.seoSlug));
}
