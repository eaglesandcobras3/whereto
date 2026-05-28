/**
 * Post-RPC ranking for `hybrid_search_businesses` — composite cut, salvages, title rescue,
 * and intent-specific gates. Centralised here (Phase 2 refactor) so `recommendation-set-minimal`
 * stays orchestration + ILIKE fallback; tune thresholds via {@link DEFAULT_SEARCH_RANK_CONFIG}.
 */

export type ScoredVecRow = Record<string, unknown> & { _composite: number };

/** Tunable thresholds for hybrid vector post-ranking (single source of truth). */
export type SearchRankConfig = {
  minVecFloor: number;
  compositeThresholdDefault: number;
  compositeThresholdMinimalApparel: number;
  structuredSalvageFloorDefault: number;
  structuredSalvageFloorMinimalApparel: number;
  apparelVecFallbackFloor: number;
  vecFloorMinimalApparelScoped: number;
};

export const DEFAULT_SEARCH_RANK_CONFIG: SearchRankConfig = {
  minVecFloor: 0.22,
  compositeThresholdDefault: 0.36,
  compositeThresholdMinimalApparel: 0.33,
  structuredSalvageFloorDefault: 0.34,
  structuredSalvageFloorMinimalApparel: 0.22,
  apparelVecFallbackFloor: 0.18,
  vecFloorMinimalApparelScoped: 0.19,
};

/** `strict` = composite + title rescue + gates only. `relaxed` = also run salvage ladder. */
export type HybridRelaxationTier = "strict" | "relaxed";

export type HybridVectorPostRankingInput = {
  scored: ScoredVecRow[];
  searchText: string;
  intentCategory: string | null | undefined;
  intentSpecificItems: string[] | undefined;
  intentDietaryNeeds: string[] | undefined;
  intentAtmosphereNeeds: string[] | undefined;
  intentOccasion: string | null | undefined;
  intentMealPeriod: string | null | undefined;
  pageSize: number;
  vectorCategoryId: string | null;
  minimalApparelKw: boolean;
  isApparelShoppingQuery: boolean;
  /** Floor for title-rescue vec check (matches legacy `MIN_VEC_FLOOR`, not scoped vec floor). */
  titleRescueMinVec: number;
  relaxationTier: HybridRelaxationTier;
};

// ---------------------------------------------------------------------------
// Tag / dish helpers (also used by composite scoring via `itemMatchesTaggedRow` export)
// ---------------------------------------------------------------------------

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function variantsForFoodItemPhrase(item: string): string[] {
  const raw = stripDiacritics(item.toLowerCase().trim());
  const out = new Set<string>([raw]);
  const addPhrase = (...phrases: string[]) => phrases.forEach((p) => out.add(p));

  if (/\bhamburgers?\b|\bburgers?\b|\bcheeseburgers?\b/.test(raw)) {
    addPhrase("hamburger", "hamburgers", "burger", "burgers", "cheeseburger", "cheeseburgers");
  }

  if (/\bsandwich(es)?\b|\bsubs?\b|\bpo[\s]?boy(s)?\b/i.test(raw)) {
    addPhrase("sandwich", "sandwiches", "sub", "subs", "po boy", "po-boy");
  }

  if (/\bdonuts?\b|\bdoughnuts?\b/.test(raw)) {
    addPhrase("donut", "donuts", "doughnut", "doughnuts");
  }

  return [...out];
}

/** Exported for `computeStructuredMatch` in `recommendation-set-minimal.ts`. */
export function itemMatchesTaggedRow(intentItem: string, rowTagsLower: string[]): boolean {
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

function haystackMatchesVariant(haystackLower: string, variant: string): boolean {
  const v = variant.toLowerCase().trim();
  if (v.length < 2) return false;
  if (v.length >= 5 || /\s/.test(v)) return haystackLower.includes(v);
  return new RegExp(`\\b${escapeRegexToken(v)}\\b`, "i").test(haystackLower);
}

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

function applyRestaurantDishSpecificityGate<
  T extends Record<string, unknown> & { vec_similarity?: unknown },
>(rows: T[], intentCategory: string | null | undefined, intentItems: string[] | undefined): T[] {
  const DISH_NO_EVIDENCE_MIN_VEC = 0.38;
  if (intentCategory !== "restaurants" || !intentItems?.length) return rows;
  const filtered = rows.filter((r) => {
    const { tagMatch, textMatch } = dishListingEvidence(r, intentItems);
    if (tagMatch || textMatch) return true;
    const v = Number(r.vec_similarity ?? 0);
    return v >= DISH_NO_EVIDENCE_MIN_VEC;
  });
  return filtered.length > 0 ? filtered : rows;
}

export function isApparelFashionRetailQuery(normalized: string): boolean {
  const n = normalized.toLowerCase();
  if (/\b(book|books|bookstore|novel)\b/.test(n)) return false;
  return /\b(clothing|clothes|apparel|fashion|boutique|swimwear|resort\s*wear|dress|dresses|footwear|sandals|menswear|womenswear|women's\s+clothing|men's\s+clothing|kids\s+clothing|beachwear|activewear)\b/.test(
    n,
  );
}

export function isMinimalApparelRetailKeywordQuery(normalized: string): boolean {
  return normalized.trim().split(/\s+/).filter(Boolean).length === 1;
}

const APPAREL_LISTING_SIGNAL =
  /\b(clothing|apparel|fashion|boutique|wear|swimwear|swim|resort\s*wear|dresses?|footwear|sandals|womenswear|menswear|beachwear|activewear|lingerie|jeans|boutiques)\b/i;

function apparelRetailEvidence(row: Record<string, unknown>): boolean {
  const slug = String(row.slug ?? "")
    .toLowerCase()
    .replace(/-/g, " ");
  const tags = ((row.item_tags as string[] | null) ?? []).join(" ").toLowerCase();
  const hay = `${String(row.title ?? "").toLowerCase()} ${String(row.excerpt ?? "").toLowerCase()} ${String(row.business_type ?? "").toLowerCase()} ${slug} ${tags}`;
  return APPAREL_LISTING_SIGNAL.test(hay);
}

function applyShoppingApparelRetailGate<
  T extends Record<string, unknown> & { vec_similarity?: unknown },
>(
  rows: T[],
  intentCategory: string | null | undefined,
  normalizedQuery: string,
  relaxationTier: HybridRelaxationTier,
): T[] {
  if (intentCategory !== "shopping" || !isApparelFashionRetailQuery(normalizedQuery)) return rows;
  const relaxed =
    relaxationTier === "relaxed" && isMinimalApparelRetailKeywordQuery(normalizedQuery);
  const MIN_VEC_NO_APPAREL_SIGNAL = relaxed ? 0.24 : 0.32;
  const filtered = rows.filter((r) => {
    if (apparelRetailEvidence(r as Record<string, unknown>)) return true;
    return Number((r as { vec_similarity?: unknown }).vec_similarity ?? 0) >= MIN_VEC_NO_APPAREL_SIGNAL;
  });
  if (filtered.length > 0) return filtered;
  return [...rows]
    .sort(
      (a, b) =>
        Number((b as { vec_similarity?: unknown }).vec_similarity ?? 0) -
        Number((a as { vec_similarity?: unknown }).vec_similarity ?? 0),
    )
    .slice(0, relaxed ? 28 : 12);
}

function titleRescueMatchesTitle(titleLower: string, token: string): boolean {
  const t = token.toLowerCase();
  if (titleLower.includes(t)) return true;
  if (t.length >= 5 && t.endsWith("s")) {
    const stem = t.slice(0, -1);
    if (stem.length >= 4 && titleLower.includes(stem)) return true;
  }
  return false;
}

/**
 * Post-RPC ranking for one {@link HybridRelaxationTier}.
 * Salvage ladder runs only when `relaxationTier === 'relaxed'`.
 */
export function applyHybridVectorPostRanking(
  input: HybridVectorPostRankingInput,
  config: SearchRankConfig = DEFAULT_SEARCH_RANK_CONFIG,
): ScoredVecRow[] {
  const {
    scored,
    searchText,
    intentCategory,
    intentSpecificItems,
    intentDietaryNeeds,
    intentAtmosphereNeeds,
    intentOccasion,
    intentMealPeriod,
    pageSize,
    minimalApparelKw,
    isApparelShoppingQuery,
    titleRescueMinVec,
    relaxationTier,
  } = input;
  const enableSalvage = relaxationTier === "relaxed";

  const compositeThreshold =
    isApparelShoppingQuery && minimalApparelKw
      ? config.compositeThresholdMinimalApparel
      : config.compositeThresholdDefault;
  let compositeFiltered = scored.filter((r) => r._composite >= compositeThreshold);

  let queryWords = searchText.split(/\s+/).filter((w) => w.length >= 5);
  if ((intentSpecificItems?.length ?? 0) > 0) {
    const items = intentSpecificItems!.map((i) => i.toLowerCase());
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
      if (((r.vec_similarity as number) ?? 0) < titleRescueMinVec) return false;
      const title = String(r.title ?? "").toLowerCase();
      return queryWords.some((w) => titleRescueMatchesTitle(title, w));
    });
    if (rescued.length > 0) compositeFiltered = [...compositeFiltered, ...rescued];
  }

  const salvageDisabled =
    (intentSpecificItems?.length ?? 0) > 0 ||
    (intentDietaryNeeds?.length ?? 0) > 0 ||
    (intentAtmosphereNeeds?.length ?? 0) > 0 ||
    !!(intentOccasion && String(intentOccasion).trim()) ||
    !!(intentMealPeriod && String(intentMealPeriod).trim());

  if (enableSalvage && compositeFiltered.length === 0 && scored.length > 0 && !salvageDisabled) {
    const apparelSalvageCap =
      isApparelFashionRetailQuery(searchText) && intentCategory === "shopping"
        ? Math.max(pageSize * 2, 20)
        : scored.length;
    compositeFiltered = scored.slice(0, apparelSalvageCap);
  }

  if (enableSalvage) {
    const structuredSalvageFloor =
      minimalApparelKw && isApparelFashionRetailQuery(searchText)
        ? config.structuredSalvageFloorMinimalApparel
        : config.structuredSalvageFloorDefault;
    if (compositeFiltered.length === 0 && scored.length > 0 && salvageDisabled) {
      compositeFiltered = scored
        .filter((r) => ((r.vec_similarity as number) ?? 0) >= structuredSalvageFloor)
        .sort(
          (a, b) =>
            ((b.vec_similarity as number) ?? 0) - ((a.vec_similarity as number) ?? 0),
        );
    }

    if (
      compositeFiltered.length === 0 &&
      scored.length > 0 &&
      isApparelShoppingQuery &&
      minimalApparelKw
    ) {
      compositeFiltered = scored
        .filter((r) => ((r.vec_similarity as number) ?? 0) >= config.apparelVecFallbackFloor)
        .sort(
          (a, b) =>
            ((b.vec_similarity as number) ?? 0) - ((a.vec_similarity as number) ?? 0),
        );
    }
  }

  compositeFiltered = applyRestaurantDishSpecificityGate(
    compositeFiltered,
    intentCategory,
    intentSpecificItems,
  );

  compositeFiltered = applyShoppingApparelRetailGate(
    compositeFiltered,
    intentCategory,
    searchText,
    relaxationTier,
  );

  return compositeFiltered;
}
