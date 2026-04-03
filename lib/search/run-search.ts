import { getServiceSupabase } from "@/lib/supabase/service-role";
import { hashQuery, normalizeQuery } from "@/lib/query-normalize";
import {
  searchIntentSchema,
  validateAIResponse,
  type SearchIntent,
} from "@/lib/intent-schema";
import { scoreAndRankCandidates, type BusinessRowWithTags } from "@/lib/scoring";
import {
  fallbackIntentFromKeywords,
  parseIntentWithOpenAI,
  synthesizeWithOpenAI,
} from "@/lib/ai/search-ai";

export type SearchResultPayload = {
  query: string;
  query_hash: string;
  normalized_query: string;
  summary: string;
  recommendations: Array<{
    business_id: string;
    rank: number;
    headline: string;
    explanation: string;
    highlighted_tags: string[];
    business: Record<string, unknown>;
  }>;
  suggestions?: string[];
  cached: boolean;
  cache_id?: string;
};

type DbBusinessRow = {
  id: string;
  name: string;
  address: string | null;
  town_id: number | null;
  category_id: number | null;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  price_level: number | null;
  ai_summary: string | null;
  status: string;
  suspected_closed: boolean;
  admin_suppressed: boolean;
  confidence_score: number;
  freshness_score: number;
  engagement_score: number;
  exploration_score: number;
  completeness_score: number;
  bad_experience_unique_users: number;
  google_rating: number | null;
  google_review_count: number | null;
  business_tags: { tags: { slug: string } | { slug: string }[] | null }[] | null;
};

function toBusinessWithTags(row: DbBusinessRow): BusinessRowWithTags & {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  price_level: number | null;
  ai_summary: string | null;
} {
  const tag_slugs: string[] = [];
  for (const bt of row.business_tags ?? []) {
    const t = bt.tags;
    if (!t) continue;
    if (Array.isArray(t)) {
      for (const x of t) {
        if (x?.slug) tag_slugs.push(x.slug);
      }
    } else if (typeof t === "object" && "slug" in t && t.slug) {
      tag_slugs.push(t.slug);
    }
  }
  const {
    id,
    name,
    address,
    town_id,
    category_id,
    lat,
    lng,
    phone,
    website,
    price_level,
    ai_summary,
    status,
    suspected_closed,
    admin_suppressed,
    confidence_score,
    freshness_score,
    engagement_score,
    exploration_score,
    completeness_score,
    bad_experience_unique_users,
    google_rating,
    google_review_count,
  } = row;
  return {
    id,
    name,
    address,
    town_id,
    category_id,
    lat,
    lng,
    phone,
    website,
    price_level,
    ai_summary,
    status,
    suspected_closed,
    admin_suppressed,
    confidence_score,
    freshness_score,
    engagement_score,
    exploration_score,
    completeness_score,
    bad_experience_unique_users,
    google_rating,
    google_review_count,
    tag_slugs,
  };
}

function templateResponse(candidates: BusinessRowWithTags[], intent: SearchIntent) {
  const top = candidates.slice(0, intent.result_count);
  return {
    recommendations: top.map((c, i) => ({
      business_id: c.id,
      rank: i + 1,
      headline: "Strong local pick",
      explanation:
        c.ai_summary?.slice(0, 280) ??
        `${c.name ?? "This spot"} is a listed 30A business that matches your search.`,
      highlighted_tags: c.tag_slugs.slice(0, 4),
    })),
    search_summary: `Found ${top.length} curated matches for you along 30A.`,
  };
}

export async function runSearch(options: {
  rawQuery: string;
  userId: string | null;
  model: string;
  openaiKey: string | undefined;
}): Promise<SearchResultPayload> {
  const supabase = getServiceSupabase();
  const normalized = normalizeQuery(options.rawQuery);
  const queryHash = hashQuery(normalized);

  const { data: cached } = await supabase
    .from("query_cache")
    .select("id, response_json, business_ids, hit_count")
    .eq("query_hash", queryHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cached?.response_json) {
    const prevHits = (cached.hit_count as number) ?? 0;
    void supabase
      .from("query_cache")
      .update({
        hit_count: prevHits + 1,
        last_hit_at: new Date().toISOString(),
      })
      .eq("id", cached.id);
    const body = cached.response_json as Record<string, unknown>;
    return {
      ...(body as Omit<SearchResultPayload, "cached" | "cache_id">),
      query_hash: queryHash,
      normalized_query: normalized,
      cached: true,
      cache_id: cached.id,
    };
  }

  let intent: SearchIntent;
  try {
    if (options.openaiKey) {
      intent = await parseIntentWithOpenAI(
        options.model,
        options.openaiKey,
        normalized,
      );
    } else {
      intent = fallbackIntentFromKeywords(normalized);
    }
  } catch {
    intent = fallbackIntentFromKeywords(normalized);
  }
  intent = searchIntentSchema.parse(intent);

  const [{ data: towns }, { data: categories }] = await Promise.all([
    supabase.from("towns").select("id, slug"),
    supabase.from("categories").select("id, slug"),
  ]);

  const townSlugToId = new Map(
    (towns ?? []).map((t) => [t.slug as string, t.id as number]),
  );
  const categorySlugToId = new Map(
    (categories ?? []).map((c) => [c.slug as string, c.id as number]),
  );

  const suppressedIds = new Set<string>();
  if (options.userId) {
    const { data: sup } = await supabase
      .from("user_suppressions")
      .select("business_id")
      .eq("user_id", options.userId);
    for (const row of sup ?? []) {
      suppressedIds.add(row.business_id as string);
    }
  }

  const { data: rawBusinesses, error: bizErr } = await supabase
    .from("businesses")
    .select(
      `
      id, name, address, town_id, category_id, lat, lng, phone, website, price_level, ai_summary,
      status, suspected_closed, admin_suppressed,
      confidence_score, freshness_score, engagement_score, exploration_score, completeness_score,
      bad_experience_unique_users, google_rating, google_review_count,
      business_tags(tags(slug))
    `,
    )
    .eq("status", "active")
    .limit(300);

  if (bizErr) throw bizErr;

  const withTags =
    (rawBusinesses as unknown as DbBusinessRow[] | null)?.map(toBusinessWithTags) ?? [];
  const ranked = scoreAndRankCandidates(
    withTags,
    intent,
    townSlugToId,
    categorySlugToId,
    suppressedIds,
    15,
  );

  const candidateIds = new Set(ranked.map((r) => r.id));

  let aiParsed: unknown;
  if (options.openaiKey && ranked.length > 0) {
    try {
      aiParsed = await synthesizeWithOpenAI(
        options.model,
        options.openaiKey,
        options.rawQuery,
        intent,
        ranked,
      );
    } catch {
      aiParsed = templateResponse(ranked, intent);
    }
  } else {
    aiParsed = templateResponse(ranked, intent);
  }

  let validated = validateAIResponse(aiParsed, candidateIds);
  if (!validated.valid) {
    const tpl = templateResponse(ranked, intent);
    validated = validateAIResponse(tpl, candidateIds);
  }
  if (!validated.valid) {
    const empty = {
      recommendations: [] as { business_id: string; rank: number; headline: string; explanation: string; highlighted_tags: string[] }[],
      search_summary:
        ranked.length === 0
          ? "No active listings match yet. Try another town or category."
          : "We found matches but could not format them; please try again.",
    };
    validated = { valid: true, data: empty };
  }

  const byId = new Map(ranked.map((r) => [r.id, r]));
  const enriched = {
    query: options.rawQuery,
    query_hash: queryHash,
    normalized_query: normalized,
    summary: validated.data.search_summary,
    recommendations: validated.data.recommendations
      .sort((a, b) => a.rank - b.rank)
      .map((rec) => {
        const b = byId.get(rec.business_id);
        return {
          ...rec,
          business: b
            ? {
                id: b.id,
                name: b.name,
                address: b.address,
                town_id: b.town_id,
                category_id: b.category_id,
                lat: b.lat,
                lng: b.lng,
                phone: b.phone,
                website: b.website,
                price_level: b.price_level,
                google_rating: b.google_rating,
                google_review_count: b.google_review_count,
                tags: b.tag_slugs,
                ai_summary: b.ai_summary,
              }
            : {},
        };
      }),
    suggestions: validated.data.suggestions,
  };

  const businessIds = enriched.recommendations.map((r) => r.business_id);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: inserted, error: insErr } = await supabase
    .from("query_cache")
    .insert({
      query_hash: queryHash,
      normalized_query: normalized,
      raw_queries: [options.rawQuery],
      response_json: enriched,
      business_ids: businessIds,
      expires_at: expires,
    })
    .select("id")
    .single();

  if (insErr) {
    console.error("query_cache insert", insErr);
  }

  return {
    ...enriched,
    cached: false,
    cache_id: inserted?.id,
  };
}
