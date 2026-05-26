import type { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import type { BusinessPayload, SearchResultPayload } from "@/lib/search/types";
import type { SearchCandidateRankOrder } from "@/lib/scoring";

// ---------------------------------------------------------------------------
// Composite scoring
// ---------------------------------------------------------------------------
// Combines structured facet matching + semantic similarity + listing quality.
// When no structured intent fields are present (simple keyword query),
// composite collapses to: vecSim * 0.90 + quality * 0.10 — so semantic similarity
// does the heavy lifting. When intent has specific_items, dietary_needs, etc.,
// structured matching amplifies the right results and penalises the wrong ones.

type ScoringIntent = {
  category?: string | null;
  specificItems?: string[];
  dietaryNeeds?: string[];
  mealPeriod?: string | null;
  atmosphereNeeds?: string[];
  occasion?: string | null;
};

/** Strip Unicode diacritics so "crepe" matches "crêpe", "cafe" matches "café", etc. */
function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** Lightweight synonym expansion so "hamburger" matches row tag "burger" / "burgers". */
function variantsForFoodItemPhrase(item: string): string[] {
  const raw = stripDiacritics(item.toLowerCase().trim());
  const out = new Set<string>([raw]);
  const addPhrase = (...phrases: string[]) => phrases.forEach((p) => out.add(p));

  // Burgers — user rarely says "beef patty sandwich"; tags often say burger(s).
  if (/\bhamburgers?\b|\bburgers?\b|\bcheeseburgers?\b/.test(raw)) {
    addPhrase("hamburger", "hamburgers", "burger", "burgers", "cheeseburger", "cheeseburgers");
  }

  // Common sandwich / handheld wording
  if (/\bsandwich(es)?\b|\bsubs?\b|\bpo[\s]?boy(s)?\b/i.test(raw)) {
    addPhrase("sandwich", "sandwiches", "sub", "subs", "po boy", "po-boy");
  }

  return [...out];
}

function itemMatchesTaggedRow(intentItem: string, rowTagsLower: string[]): boolean {
  const tagsNorm = rowTagsLower.map(stripDiacritics);
  for (const v of variantsForFoodItemPhrase(intentItem)) {
    if (
      tagsNorm.some(
        (t) => v.length >= 3 && (t.includes(v) || v.includes(t) || t.includes(v.replace(/\s+/g, ""))),
      )
    )
      return true;
  }
  return false;
}

function escapeRegexToken(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Match variant in listing text: long tokens as substring; short tokens as whole words. */
function haystackMatchesVariant(haystackLower: string, variant: string): boolean {
  const v = variant.toLowerCase().trim();
  if (v.length < 2) return false;
  if (v.length >= 5 || /\s/.test(v)) return haystackLower.includes(v);
  return new RegExp(`\\b${escapeRegexToken(v)}\\b`, "i").test(haystackLower);
}

/** True if mined menu tags OR public title/excerpt/slug text supports the dish/product terms. */
function dishListingEvidence(row: Record<string, unknown>, intentItems: string[]): {
  tagMatch: boolean;
  textMatch: boolean;
} {
  const rowItemsRaw = ((row.item_tags as string[] | null) ?? []).map((t) => String(t).trim());
  const rowItems = rowItemsRaw.map((t) => t.toLowerCase());
  const hasTypedMenu = rowItemsRaw.some((t) => t.length > 0);
  const tagMatch =
    hasTypedMenu && intentItems.some((item) => itemMatchesTaggedRow(item, rowItems));

  const slugText = String(row.slug ?? "")
    .toLowerCase()
    .replace(/-/g, " ");
  const haystack = `${String(row.title ?? "").toLowerCase()} ${String(row.excerpt ?? "").toLowerCase()} ${slugText}`;

  const textMatch = intentItems.some((item) =>
    variantsForFoodItemPhrase(item).some((v) => haystackMatchesVariant(haystack, v)),
  );

  return { tagMatch, textMatch };
}

/**
 * Dish/product queries over "restaurants" should not fill with generic embedding matches.
 * Require tag or on-listing text signal, unless vector similarity is clearly about the dish.
 * Emergency bypass: if the gate would produce zero results, skip it entirely — returning
 * nothing is always worse than returning the best available nearby restaurants.
 */
function applyRestaurantDishSpecificityGate<
  T extends Record<string, unknown> & { vec_similarity?: unknown },
>(rows: T[], intentCategory: string | null | undefined, intentItems: string[] | undefined): T[] {
  // Lower bar vs original 0.46 — many valid restaurants score 0.38-0.44 for specific dishes
  // but genuinely serve them (especially when item_tags coverage is incomplete for newer listings).
  const DISH_NO_EVIDENCE_MIN_VEC = 0.38;
  if (intentCategory !== "restaurants" || !intentItems?.length) return rows;
  const filtered = rows.filter((r) => {
    const { tagMatch, textMatch } = dishListingEvidence(r, intentItems);
    if (tagMatch || textMatch) return true;
    const v = Number(r.vec_similarity ?? 0);
    return v >= DISH_NO_EVIDENCE_MIN_VEC;
  });
  // Emergency: never return fewer results than input when that would cause a zero-result page.
  // If the gate eliminates everything, the area simply has no exact-match listing —
  // show the closest available restaurants rather than nothing.
  return filtered.length > 0 ? filtered : rows;
}

function computeStructuredMatch(row: Record<string, unknown>, intent: ScoringIntent): { score: number; hasSignal: boolean } {
  const components: { weight: number; score: number }[] = [];

  // When BI `business_type` is empty we have no corroborating text — omit this component rather
  // than scoring 0 against every row (category is often already enforced by SQL filters).
  if (intent.category) {
    const businessType = String(row.business_type ?? "").trim().toLowerCase();
    if (businessType) {
      const catNorm = intent.category.replace(/_/g, " ").toLowerCase();
      // Food-service umbrella: food trucks, taco bars, stands, etc. are all "restaurants"
      // for categorization purposes but rarely contain the word "restaurant" in their type.
      const FOOD_SERVICE_TYPES =
        /restaurant|cafe|diner|bistro|grill|eatery|food.truck|food.stand|taqueria|pizzeria|taco.bar|hot.dog|ice.cream|dessert|bakery|donut|smoothie|juice.bar|bar$/i;
      const isRestaurantCategory = catNorm.includes("restaurant");
      // Strip trailing 's' to handle plurals: 'restaurants' → 'restaurant', 'coffee_shops' → 'coffee shop'
      const wordMatch = catNorm.split(" ").some((w) => {
        if (w.length <= 3) return false;
        const stem = w.replace(/s$/, "");
        return businessType.includes(w) || businessType.includes(stem);
      });
      const matchScore =
        (isRestaurantCategory && FOOD_SERVICE_TYPES.test(businessType)) || wordMatch ? 1.0 : 0.0;
      components.push({ weight: 40, score: matchScore });
    }
  }

  if (intent.specificItems?.length) {
    const rowItemsRaw = ((row.item_tags as string[] | null) ?? []).map((t) => String(t).trim());
    const rowItems = rowItemsRaw.map((t) => t.toLowerCase());
    const hasTypedMenu = rowItemsRaw.some((t) => t.length > 0);
    // No mined menu on this listing — do not treat "no tag match" as disproof; let vector sim carry.
    if (hasTypedMenu) {
      const matched = intent.specificItems.filter((item) => itemMatchesTaggedRow(item, rowItems)).length;
      components.push({ weight: 35, score: matched / intent.specificItems.length });
    }
  }

  if (intent.dietaryNeeds?.length) {
    const rowDietary = (row.dietary_tags as string[] | null) ?? [];
    const matched = intent.dietaryNeeds.filter((d) => rowDietary.includes(d)).length;
    components.push({ weight: 15, score: matched / intent.dietaryNeeds.length });
  }

  if (intent.mealPeriod) {
    const rowMeal = (row.meal_period_tags as string[] | null) ?? [];
    components.push({ weight: 5, score: rowMeal.includes(intent.mealPeriod) ? 1.0 : 0.0 });
  }

  if (intent.atmosphereNeeds?.length || intent.occasion) {
    const rowAtm = (row.atmosphere_tags as string[] | null) ?? [];
    const rowOcc = (row.occasion_tags as string[] | null) ?? [];
    const rowAll = [...rowAtm, ...rowOcc].map((t) => t.toLowerCase());
    const needed = [...(intent.atmosphereNeeds ?? []), ...(intent.occasion ? [intent.occasion] : [])];
    const matched = needed.filter((n) => rowAll.some((r) => r.includes(n.toLowerCase()))).length;
    components.push({ weight: 5, score: matched / needed.length });
  }

  if (components.length === 0) return { score: 0, hasSignal: false };
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const weightedScore = components.reduce((s, c) => s + c.weight * c.score, 0);
  return { score: weightedScore / totalWeight, hasSignal: true };
}

function computeQuality(row: Record<string, unknown>): number {
  const featured = (row.featured as boolean | null) ? 1.0 : 0.0;
  const rating = Math.min(1.0, ((row.review_rating_cached as number | null) ?? 0) / 5.0);
  const reviews = Math.min(1.0, ((row.review_count_cached as number | null) ?? 0) / 50);
  return featured * 0.5 + rating * 0.3 + reviews * 0.2;
}

function computeComposite(row: Record<string, unknown>, intent: ScoringIntent, vecSim: number): number {
  const quality = computeQuality(row);
  const { score: structuredScore, hasSignal } = computeStructuredMatch(row, intent);
  if (!hasSignal) {
    // No structured intent — let semantic similarity drive results
    return vecSim * 0.90 + quality * 0.10;
  }
  return structuredScore * 0.60 + vecSim * 0.30 + quality * 0.10;
}

/** Title rescue: match query token or a crude singular (donuts → donut) in listing title. */
function titleRescueMatchesTitle(titleLower: string, token: string): boolean {
  const t = token.toLowerCase();
  if (titleLower.includes(t)) return true;
  if (t.length >= 5 && t.endsWith("s")) {
    const stem = t.slice(0, -1);
    if (stem.length >= 4 && titleLower.includes(stem)) return true;
  }
  return false;
}

function sanitizeIlikeToken(raw: string): string {
  return raw.replace(/[%_,\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

async function embedQuery(query: string, openaiKey: string): Promise<number[] | null> {
  try {
    const openai = new OpenAI({ apiKey: openaiKey });
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query.slice(0, 8000),
      dimensions: 1536,
    });
    return res.data[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

function businessPayload(
  row: Record<string, unknown>,
  imageUrl: string | null,
): BusinessPayload {
  const displayName = String((row as { title?: string; name?: string }).title ?? row.name ?? "");
  const t = row.towns as { title?: string; slug?: string } | { title?: string; slug?: string }[] | null;
  const townOne = t && Array.isArray(t) ? t[0] : t;
  return {
    id: String(row.id),
    name: displayName,
    slug: row.slug != null ? String(row.slug) : undefined,
    address: (row.address as string | null) ?? null,
    town_id: null,
    town_name: townOne?.title ?? null,
    category_id: null,
    category_name: undefined,
    lat: row.map_lat != null ? Number(row.map_lat) : undefined,
    lng: row.map_lng != null ? Number(row.map_lng) : undefined,
    phone: (row.phone as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    price_level: null,
    listing_rating: row.review_rating_cached != null ? Number(row.review_rating_cached) : null,
    listing_review_count: row.review_count_cached != null ? Number(row.review_count_cached) : null,
    tags: undefined,
    ai_summary: (row.excerpt as string | null) ?? (row.content as string | null)?.slice(0, 500) ?? null,
    image_url: imageUrl,
    hero_image_url: imageUrl,
    has_physical_location: row.map_lat != null && row.map_lng != null,
  };
}

function rowToRec(
  row: Record<string, unknown>,
  rank: number,
): SearchResultPayload["recommendations"][number] {
  const r = row as {
    main_image?: string | null;
    hero_image?: string | null;
    main_image_url?: string | null;
    hero_image_url?: string | null;
  };
  const img = getPublicImageUrlWithView(
    r.main_image_url,
    r.hero_image_url,
    r.main_image,
    r.hero_image,
  );
  const categories = row.business_categories as { title?: string; slug?: string } | null;
  const bp = businessPayload(row, img);
  if (categories?.title) bp.category_name = categories.title;
  return {
    business_id: String(row.id),
    rank,
    headline: String((row as { title?: string }).title ?? "Listing"),
    explanation: (row.excerpt as string | null) ?? "",
    highlighted_tags: [],
    business: bp,
  };
}

/**
 * Simplified search over `businesses` (Directus-synced) without query_cache, scoring, or old joins.
 * Uses vector similarity search (hybrid_search_businesses RPC) when an OpenAI key is available
 * and embeddings exist; falls back to ILIKE otherwise.
 */
export async function buildMinimalSearchResult(
  supabase: SupabaseClient,
  options: {
    rawQuery: string;
    normalizedQuery: string;
    queryHash: string;
    model: string;
    openaiKey: string | undefined;
    page?: number;
    pageSize?: number;
    constrainTownId?: string;
    /** Multiple town IDs for "near <town>" queries — anchor + adjacent towns. */
    nearTownIds?: string[];
    /** `areas.id`: `businesses.area_id` or `area_businesses` for this area. */
    constrainAreaId?: string;
    requiredHasPhysicalLocation?: boolean;
    sortMode?: SearchCandidateRankOrder;
    /** When set, filter `businesses.primary_category_id`. */
    primaryCategoryId?: string | null;
    /**
     * Category the user explicitly selected via URL (dropdown). Used in vector search instead
     * of `primaryCategoryId` so AI-inferred categories don't over-constrain results.
     */
    explicitCategoryId?: string | null;
    /**
     * True only when `/search` loads a browse mode with **no typed `q`** (`skipIlikeTextFilter`
     * from the page route). Omit embeddings — directory browse stays a cheap listing.
     *
     * **Not** coupled to `skipIlikeTextFilter` after intent merge: NL queries ("books near Rosemary")
     * still set omit-ILIKE internally but MUST run vector search — otherwise there is zero text signal.
     */
    pageBrowseWithoutQuery?: boolean;
    /**
     * `?type=businesses` (or services) with no `q` used to pass a long placeholder string as one
     * ilike pattern — it matched nothing. When true, list visible non-archived rows without a text match.
     */
    skipIlikeTextFilter?: boolean;
    /**
     * Focused search term derived from intent attributes or a de-noised query, replacing
     * the raw query for the ilike so NL phrases like "restaurants near Seaside" don't get
     * matched verbatim against listing text.
     */
    searchTermOverride?: string;
    /** Natural-language price bucket. "inexpensive"=1, "moderate"=2-3, "expensive"=4. */
    constrainPriceBucket?: "inexpensive" | "moderate" | "expensive" | null;
    /** Filter to multiple explicit category IDs (OR logic). */
    primaryCategoryIds?: string[];
    /** Intent tag slugs to filter by (AND logic — business must have all selected). */
    constrainVibeTags?: string[];
    // --- Composite scoring signals (from AI intent) ---
    /** AI-detected category slug — used to score business_type alignment. */
    intentCategory?: string | null;
    /** Specific items/dishes/services mentioned in the query ("fish tacos", "cold brew"). */
    intentSpecificItems?: string[];
    /** Dietary restrictions mentioned ("gluten_free", "vegan"). */
    intentDietaryNeeds?: string[];
    /** Meal period detected ("breakfast", "dinner", etc.). */
    intentMealPeriod?: string | null;
    /** Atmosphere descriptors detected ("romantic", "waterfront"). */
    intentAtmosphereNeeds?: string[];
    /** Occasion detected ("date_night", "rainy_day", etc.). */
    intentOccasion?: string | null;
  },
): Promise<SearchResultPayload> {
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 12));
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // --- Vector search path ---
  // Use embeddings when OpenAI key is available and browse is **not** a page-level empty-query
  // directory listing. Omitting ILIKE for resolved town/category does NOT imply we skip embeddings.

  // Scoring strategy: composite score = structuredMatch * 0.60 + vecSim * 0.30 + quality * 0.10
  //   when structured intent fields (specific_items, dietary_needs, etc.) are present.
  // For simple keyword queries with no structured intent: vecSim * 0.90 + quality * 0.10.
  //
  // MIN_VEC_FLOOR: discard anything too semantically distant regardless of composite score.
  // COMPOSITE_THRESHOLD: minimum composite score to include a result.
  const MIN_VEC_FLOOR = 0.22;
  const COMPOSITE_THRESHOLD = 0.36;

  const scoringIntent: ScoringIntent = {
    category:        options.intentCategory,
    specificItems:   options.intentSpecificItems,
    dietaryNeeds:    options.intentDietaryNeeds,
    mealPeriod:      options.intentMealPeriod,
    atmosphereNeeds: options.intentAtmosphereNeeds,
    occasion:        options.intentOccasion,
  };

  const canUseVector =
    !!options.openaiKey && !options.constrainAreaId && options.pageBrowseWithoutQuery !== true;
  if (canUseVector) {
    // Always embed the full user query — searchTermOverride is an ILIKE optimisation only.
    const searchText = options.normalizedQuery;
    const embedding = await embedQuery(searchText, options.openaiKey!);
    if (embedding) {
      // Use explicitCategoryId for vector search — AI-inferred categories are too broad
      // (e.g. "donuts" → restaurants) and let similarity narrow results instead.
      const vectorCategoryId = options.explicitCategoryId ?? null;
      const { data: rpcRows, error } = await supabase.rpc("hybrid_search_businesses", {
        query_text: searchText,
        query_embedding: `[${embedding.join(",")}]`,
        match_count: from + pageSize * 4, // fetch extra — composite scoring reorders and filters
        p_town_id: options.nearTownIds ? null : (options.constrainTownId ?? null),
        p_town_ids: options.nearTownIds ?? null,
        p_anchor_town_id: options.constrainTownId ?? null,
        p_category_id: vectorCategoryId,
      });
      if (!error && rpcRows) {
        const allRows = rpcRows as Record<string, unknown>[];

        // 0. Filter out accommodation / venue types — hotels, inns, event venues surface due to
        //    location-token overlap ("Rosemary Beach Inn" matches "coffee in Rosemary Beach") but
        //    are almost never the intended result for food/shopping/activity searches.
        const ACCOMMODATION_TYPES = /hotel|inn|resort|event venue|venue|convention/i;
        const nonAccommodationRows = options.intentCategory === "accommodations"
          ? allRows
          : allRows.filter((r) => !ACCOMMODATION_TYPES.test(String(r.business_type ?? "")));

        // 1. Hard floor on raw vector similarity — drop semantically irrelevant results
        const vecFloorFiltered = vectorCategoryId
          ? nonAccommodationRows  // category already constrains candidates; trust the DB filter
          : nonAccommodationRows.filter((r) => ((r.vec_similarity as number) ?? 0) >= MIN_VEC_FLOOR);

        // 2. Compute composite score and attach it; re-sort by composite DESC
        type ScoredRow = Record<string, unknown> & { _composite: number };
        const scored: ScoredRow[] = vecFloorFiltered.map((r) => ({
          ...r,
          _composite: computeComposite(r, scoringIntent, (r.vec_similarity as number) ?? 0),
        }));
        scored.sort((a, b) => b._composite - a._composite);

        // 3. Composite threshold filter
        let compositeFiltered = scored.filter((r) => r._composite >= COMPOSITE_THRESHOLD);

        // 4. Title rescue: if a business's title contains a query word and it's above MIN_VEC_FLOOR
        //    but fell below the composite threshold (unusual), pull it back in.
        //    Use length ≥ 5 — short tokens like "shop" match unrelated titles ("surf shop").
        let queryWords = searchText.split(/\s+/).filter((w) => w.length >= 5);
        if ((options.intentSpecificItems?.length ?? 0) > 0) {
          const items = options.intentSpecificItems!.map((i) => i.toLowerCase());
          queryWords = queryWords.filter((w) => {
            const lw = w.toLowerCase();
            return items.some(
              (it) => lw.includes(it) || it.includes(lw) || titleRescueMatchesTitle(lw, it),
            );
          });
        }
        if (queryWords.length > 0) {
          const includedIds = new Set(compositeFiltered.map((r) => r.id));
          const rescued = scored.filter((r) => {
            if (includedIds.has(r.id)) return false;
            if (((r.vec_similarity as number) ?? 0) < MIN_VEC_FLOOR) return false;
            const title = String(r.title ?? "").toLowerCase();
            return queryWords.some((w) => titleRescueMatchesTitle(title, w));
          });
          if (rescued.length > 0) compositeFiltered = [...compositeFiltered, ...rescued];
        }

        // If every row fell below threshold (often strong structured intent vs sparse tags),
        // show the strongest composite rows instead of an empty SERP.
        // If structured intent is active, do not salvage the full weak list — we'd surface
        // hotels/restaurants whose only signal is raw vec×0.9 + quality (prior empty specific_items).
        const salvageDisabled =
          (options.intentSpecificItems?.length ?? 0) > 0 ||
          (options.intentDietaryNeeds?.length ?? 0) > 0 ||
          (options.intentAtmosphereNeeds?.length ?? 0) > 0 ||
          !!(options.intentOccasion && String(options.intentOccasion).trim()) ||
          !!(options.intentMealPeriod && String(options.intentMealPeriod).trim());

        if (compositeFiltered.length === 0 && scored.length > 0 && !salvageDisabled) {
          compositeFiltered = scored.slice(0, scored.length);
        }

        // Dish / menu terms set `salvageDisabled` so we do not dump the whole weak tail.
        // When `item_tags` is still sparse in the directory, composite can clear everything;
        // prefer **high vector similarity** rows (still town/category filtered upstream) over an empty SERP.
        const STRUCTURED_INTENT_VEC_SALVAGE_FLOOR = 0.34;
        if (compositeFiltered.length === 0 && scored.length > 0 && salvageDisabled) {
          compositeFiltered = scored
            .filter((r) => ((r.vec_similarity as number) ?? 0) >= STRUCTURED_INTENT_VEC_SALVAGE_FLOOR)
            .sort(
              (a, b) =>
                ((b.vec_similarity as number) ?? 0) - ((a.vec_similarity as number) ?? 0),
            );
        }

        compositeFiltered = applyRestaurantDishSpecificityGate(
          compositeFiltered,
          options.intentCategory ?? null,
          options.intentSpecificItems,
        );

        // 5. Apply user-selected sidebar filters (price, category, vibe tags)
        const priceFiltered = (() => {
          if (!options.constrainPriceBucket) return compositeFiltered;
          return compositeFiltered.filter((r) => {
            const p = Number(r.price_level);
            if (options.constrainPriceBucket === "inexpensive") return p === 1 || p === 2;
            if (options.constrainPriceBucket === "moderate") return p === 2 || p === 3;
            return p === 3 || p === 4;
          });
        })();
        const catFiltered = (() => {
          if (options.primaryCategoryIds?.length) {
            return priceFiltered.filter((r) =>
              options.primaryCategoryIds!.includes(String(r.primary_category_id)),
            );
          }
          if (options.primaryCategoryId) {
            return priceFiltered.filter(
              (r) => String(r.primary_category_id) === options.primaryCategoryId,
            );
          }
          return priceFiltered;
        })();
        const filtered = options.constrainVibeTags?.length
          ? catFiltered.filter((r) => {
              const tags = (r.intent_tags as string[] | null) ?? [];
              return options.constrainVibeTags!.every((t) => tags.includes(t));
            })
          : catFiltered;

        const rows = filtered.slice(from, from + pageSize);
        const total = filtered.length;
        const recs = rows.map((row, i) => {
          const r = row as {
            main_image?: string | null;
            hero_image?: string | null;
            main_image_url?: string | null;
            hero_image_url?: string | null;
          };
          const img = getPublicImageUrlWithView(
            r.main_image_url,
            r.hero_image_url,
            r.main_image,
            r.hero_image,
          );
          const bp = businessPayload(row, img);
          const rec: SearchResultPayload["recommendations"][number] = {
            business_id: String(row.id),
            rank: from + i + 1,
            headline: String((row as { title?: string }).title ?? "Listing"),
            explanation: (row.excerpt as string | null) ?? "",
            highlighted_tags: [],
            business: bp,
          };
          if (process.env.NODE_ENV === "development") {
            rec._vec_similarity = (row.vec_similarity as number | null) ?? undefined;
            rec._composite = (row as ScoredRow)._composite ?? undefined;
          }
          return rec;
        });
        return {
          query: options.rawQuery,
          query_hash: options.queryHash,
          normalized_query: options.normalizedQuery,
          summary: `Found ${total} local picks for "${options.rawQuery}".`,
          total_results: total,
          page,
          page_size: pageSize,
          recommendations: recs,
          suggestions: [],
          cached: false,
        };
      }
      // Fall through to ILIKE on RPC error
    }
  }

  // --- ILIKE fallback path ---
  const ilikeSource = options.searchTermOverride ?? options.rawQuery;
  const searchToken = sanitizeIlikeToken(ilikeSource) || sanitizeIlikeToken(options.normalizedQuery) || "";
  const q = searchToken || "a";

  let query = supabase
    .from("businesses_view")
    .select(
      `id, town_id, slug, title, address, phone, website, content, excerpt, map_lat, map_lng, review_rating_cached, review_count_cached, price_level, main_image, hero_image, main_image_url, hero_image_url, status, featured, date_updated, business_categories ( title, slug ), towns ( title, slug )`,
      { count: "exact" },
    )
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN);

  if (!options.skipIlikeTextFilter) {
    // Include slug — many editorial titles omit type words (“bookstore”) that live only in SEO slugs.
    query = query.or(
      `title.ilike.%${q}%,slug.ilike.%${q}%,excerpt.ilike.%${q}%,search_keywords.ilike.%${q}%,content.ilike.%${q}%`,
    );
  }

  if (options.nearTownIds?.length) {
    query = query.in("town_id", options.nearTownIds);
  } else if (options.constrainTownId) {
    query = query.eq("town_id", options.constrainTownId);
  }

  if (options.constrainAreaId) {
    const { data: linkRows } = await supabase
      .from("area_businesses")
      .select("business_id")
      .eq("area_id", options.constrainAreaId);
    const linkIds = (linkRows ?? [])
      .map((r) => (r as { business_id: string }).business_id)
      .filter(Boolean)
      .slice(0, 500);
    if (linkIds.length > 0) {
      query = query.or(`area_id.eq.${options.constrainAreaId},id.in.(${linkIds.join(",")})`);
    } else {
      query = query.eq("area_id", options.constrainAreaId);
    }
  }

  if (options.primaryCategoryIds?.length) {
    query = query.in("primary_category_id", options.primaryCategoryIds);
  } else if (options.primaryCategoryId) {
    query = query.eq("primary_category_id", options.primaryCategoryId);
  }

  if (options.requiredHasPhysicalLocation === true) {
    query = query.not("map_lat", "is", null).not("map_lng", "is", null);
  }

  if (options.constrainPriceBucket) {
    if (options.constrainPriceBucket === "inexpensive") {
      query = query.in("price_level", ["1", "2"]);
    } else if (options.constrainPriceBucket === "moderate") {
      query = query.in("price_level", ["2", "3"]);
    } else {
      query = query.in("price_level", ["3", "4"]);
    }
  }

  if (options.constrainVibeTags?.length) {
    // Postgres array containment: business must have all selected tags (@> operator)
    query = query.contains("intent_tags", options.constrainVibeTags);
  }

  if (options.sortMode === "updated") {
    query = query.order("date_updated", { ascending: false, nullsFirst: false });
  } else if (options.sortMode === "name") {
    query = query.order("title", { ascending: true });
  } else {
    query = query
      .order("featured", { ascending: false, nullsFirst: true })
      .order("review_rating_cached", { ascending: false, nullsFirst: true })
      .order("review_count_cached", { ascending: false, nullsFirst: true })
      .order("title", { ascending: true });
  }

  const { data: rows, error, count } = await query.range(from, to);

  if (error) {
    console.error("buildMinimalSearchResult", error);
  }

  const list = (rows ?? []) as Record<string, unknown>[];
  const recs = list.map((row, i) => rowToRec(row, from + i + 1));

  return {
    query: options.rawQuery,
    query_hash: options.queryHash,
    normalized_query: options.normalizedQuery,
    summary: `Found ${count ?? recs.length} local picks for "${options.rawQuery}".`,
    total_results: count ?? recs.length,
    page,
    page_size: pageSize,
    recommendations: recs,
    suggestions: [],
    cached: false,
  };
}
