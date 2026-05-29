import { nameSimilarity } from "./duplicate-detection";

export type ExistingBusiness = {
  id: string;
  title: string;
  slug: string;
  phone?: string | null;
  website?: string | null;
  is_storefront?: boolean | null;
  is_service_business?: boolean | null;
  category_slug?: string | null;
};

export type DedupeCandidate = {
  title: string;
  slug: string;
  contact_information?: string | null;
  website?: string | null;
  business_type?: string | null;
  category?: string | null;
};

export type DedupeMatch = {
  existing: ExistingBusiness;
  reason:
    | "exact_slug"
    | "core_slug"
    | "name_high"
    | "name_medium_storefront"
    | "name_low_storefront"
    | "core_name"
    | "name_food_storefront"
    | "token_overlap_storefront"
    | "phone"
    | "website"
    | "contained_name";
  score: number;
};

export type CandidateResolution =
  | { action: "duplicate"; match: DedupeMatch }
  | { action: "reject"; reason: "physical_listing" }
  | { action: "import" };

const LOCATION_WORDS =
  /\b(grayton beach|santa rosa beach|rosemary beach|seaside|seagrove beach|seagrove|inlet beach|miramar beach|destin|panama city beach|panama city|blue mountain beach|gulf place|watercolor|watersound|sandestin|carillon beach|dune allen|30a|florida|fl)\b/gi;

const PLACE_ONLY_TITLES = new Set(
  [
    "alys beach",
    "seaside",
    "grand boulevard",
    "30avenue",
    "watersound",
    "rosemary beach",
    "grayton beach",
    "santa rosa beach",
    "gulf place",
    "inlet beach",
    "miramar beach",
    "destin",
    "panama city beach",
    "destin commons",
    "silver sands premium outlets",
    "mountain high destin silver sands premium outlet",
    "the market shops at sandestin",
  ].map(normTitle),
);

const FOOD_CATEGORY_RE = /food,\s*events\s*&\s*hospitality/i;
const RETAIL_CATEGORY_RE = /^retail,\s*errands/i;

const FOOD_TYPE_RE =
  /\b(restaurant|cafe|coffee\s*shop|coffee|bar|bbq|barbecue|bakery|grill|bistro|pizza|pizzeria|seafood|kitchen|tavern|pub|diner|eatery|brewery|winery|donut|ice\s*cream|oyster|steakhouse|chophouse|taco|sushi|buffet|cantina|brasserie|wine\s*bar|bagel|deli|cantina)\b/i;

const STOREFRONT_TYPE_RE =
  /\b(shop|store|boutique|market|mall|outlet|gallery|salon|spa|studio|jeweler|jewelry|florist|apothecary|emporium|trading\s*company|mercantile|clothier|apparel|grocery|hardware|furniture|interiors|rental\s*company|boat\s*dealer|golf\s*club|resort|hotel|inn|motel|suites|hospital|clinic|dentist|orthodont|dermatolog|medical\s*spa|pizzeria|restaurant)\b/i;

const TOURIST_PHYSICAL_RE =
  /\b(hotel|resort|inn|suites|golf\s*club|golf\s*course|amusement|arcade|show|ballroom|track\s*family)\b/i;

const TOKEN_STOP = new Set([
  "the",
  "and",
  "of",
  "at",
  "by",
  "llc",
  "inc",
  "co",
  "fl",
  "30a",
  "a",
  "an",
]);

const SLUG_LOCATION_SUFFIX =
  /-(seaside|grayton|rosemary|inlet|gulf|30a|fl|beach|sandestin|destin|watersound|seagrove|alys|miramar|panama|crestview|defuniak|bonifay|milton|freeport|valparaiso|station|boulevard|avenue|watersound)(-(fl|beach|station|boulevard|avenue|30a))*$/gi;

const STOREFRONT_CATEGORY_SLUGS = new Set([
  "restaurants",
  "shopping",
  "coffee_shops",
  "coffee",
  "bars",
  "activities",
]);

export function normTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function coreSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(SLUG_LOCATION_SUFFIX, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function stripLocationFromTitle(title: string): string {
  return normTitle(title).replace(LOCATION_WORDS, " ").replace(/\s+/g, " ").trim();
}

export function normPhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

export function websiteHost(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const url = raw.includes("://") ? raw : `https://${raw}`;
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

export function parseContact(raw: string | null | undefined): {
  address: string | null;
  phone: string | null;
} {
  const trimmed = raw?.trim();
  if (!trimmed) return { address: null, phone: null };
  const parts = trimmed.split(";").map((s) => s.trim()).filter(Boolean);
  const phonePart = parts.find((p) => /(?:\(\d{3}\)|\d{3}[-.\s]\d{3})/.test(p));
  const addressPart = parts.find((p) => p !== phonePart) ?? parts[0] ?? null;
  return {
    address: addressPart || null,
    phone: phonePart || null,
  };
}

function significantTokens(title: string): Set<string> {
  return new Set(
    stripLocationFromTitle(title)
      .split(" ")
      .filter((w) => w.length > 2 && !TOKEN_STOP.has(w)),
  );
}

function tokenOverlapScore(a: string, b: string): number {
  const ta = significantTokens(a);
  const tb = significantTokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) {
    if (tb.has(t)) inter += 1;
  }
  return inter / Math.min(ta.size, tb.size);
}

function isStorefrontLikeExisting(row: ExistingBusiness): boolean {
  if (row.is_storefront) return true;
  if (row.category_slug && STOREFRONT_CATEGORY_SLUGS.has(row.category_slug)) {
    return true;
  }
  return false;
}

/** Chamber row is a fixed-location restaurant, shop, hotel, etc. — not a mobile service. */
export function isPhysicalRestaurantOrStorefront(candidate: DedupeCandidate): boolean {
  const category = candidate.category ?? "";
  const type = `${candidate.business_type ?? ""} ${candidate.title ?? ""}`;

  if (FOOD_CATEGORY_RE.test(category)) return true;
  if (RETAIL_CATEGORY_RE.test(category)) return true;

  if (FOOD_TYPE_RE.test(type)) return true;
  if (STOREFRONT_TYPE_RE.test(type)) return true;

  if (/tourist/i.test(category) && TOURIST_PHYSICAL_RE.test(type)) return true;

  if (isPlaceOnlyTitle(candidate.title)) return true;

  return false;
}

function isPlaceOnlyTitle(title: string): boolean {
  return PLACE_ONLY_TITLES.has(normTitle(title));
}

function containedNameMatch(
  candidateTitle: string,
  existingTitle: string,
  opts: { minSim: number; minLengthRatio: number },
): { match: boolean; score: number } {
  if (isPlaceOnlyTitle(candidateTitle)) {
    return { match: false, score: 0 };
  }

  const a = stripLocationFromTitle(candidateTitle);
  const b = stripLocationFromTitle(existingTitle);
  if (a.length < 4 || b.length < 4) return { match: false, score: 0 };

  const sim = nameSimilarity(a, b);
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  const contained =
    shorter.length >= 4 &&
    longer.includes(shorter) &&
    shorter.length / longer.length >= opts.minLengthRatio;

  if (!contained || sim < opts.minSim) return { match: false, score: sim };

  return { match: true, score: sim };
}

/**
 * Find the best matching existing business for a CSV/chamber row, if any.
 */
export function findExistingBusinessMatch(
  candidate: DedupeCandidate,
  existing: ExistingBusiness[],
): DedupeMatch | null {
  const slug = candidate.slug.trim().toLowerCase();
  const candidateCore = coreSlug(slug);
  const candidatePhone = normPhone(parseContact(candidate.contact_information).phone);
  const candidateHost = websiteHost(candidate.website);
  const physical = isPhysicalRestaurantOrStorefront(candidate);

  let best: DedupeMatch | null = null;

  const consider = (match: DedupeMatch) => {
    if (!best || match.score > best.score) best = match;
  };

  const placeOnly = isPlaceOnlyTitle(candidate.title);

  for (const row of existing) {
    const rowSlug = row.slug.toLowerCase();

    if (rowSlug === slug) {
      consider({ existing: row, reason: "exact_slug", score: 1 });
      continue;
    }

    if (candidatePhone) {
      const rowPhone = normPhone(row.phone);
      if (rowPhone && rowPhone === candidatePhone) {
        consider({ existing: row, reason: "phone", score: 0.97 });
      }
    }

    if (candidateHost) {
      const rowHost = websiteHost(row.website);
      if (rowHost && rowHost === candidateHost) {
        consider({ existing: row, reason: "website", score: 0.96 });
      }
    }

    if (placeOnly) continue;

    if (coreSlug(rowSlug) === candidateCore && candidateCore.length >= 4) {
      consider({ existing: row, reason: "core_slug", score: 0.99 });
    }

    const sim = nameSimilarity(candidate.title, row.title);
    if (sim >= 0.88) {
      consider({ existing: row, reason: "name_high", score: sim });
    }

    const storefrontLike = isStorefrontLikeExisting(row);

    if (storefrontLike && sim >= 0.8) {
      consider({
        existing: row,
        reason: "name_medium_storefront",
        score: sim,
      });
    }

    if (physical && storefrontLike && sim >= 0.68) {
      consider({
        existing: row,
        reason: "name_low_storefront",
        score: sim,
      });
    }

    const coreSim = nameSimilarity(
      stripLocationFromTitle(candidate.title),
      stripLocationFromTitle(row.title),
    );
    const coreThreshold = physical ? 0.85 : 0.9;
    if (coreSim >= coreThreshold) {
      consider({ existing: row, reason: "core_name", score: coreSim });
    }

    if (physical && storefrontLike && sim >= 0.72) {
      consider({
        existing: row,
        reason: "name_food_storefront",
        score: sim,
      });
    }

    const contained = containedNameMatch(candidate.title, row.title, {
      minSim: physical ? 0.65 : 0.72,
      minLengthRatio: physical ? 0.45 : 0.55,
    });
    if (contained.match && storefrontLike) {
      consider({
        existing: row,
        reason: "contained_name",
        score: contained.score,
      });
    }

    if (physical && storefrontLike) {
      const overlap = tokenOverlapScore(candidate.title, row.title);
      if (overlap >= 0.55) {
        consider({
          existing: row,
          reason: "token_overlap_storefront",
          score: 0.7 + overlap * 0.25,
        });
      }
    }
  }

  return best;
}

/**
 * Resolve a services-CSV row: duplicate of existing listing, reject physical listing, or import.
 */
export function resolveServiceCsvCandidate(
  candidate: DedupeCandidate,
  existing: ExistingBusiness[],
): CandidateResolution {
  const match = findExistingBusinessMatch(candidate, existing);
  if (match) return { action: "duplicate", match };

  if (isPhysicalRestaurantOrStorefront(candidate)) {
    return { action: "reject", reason: "physical_listing" };
  }

  return { action: "import" };
}
