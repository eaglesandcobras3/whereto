/**
 * Single-row Gemini seed verify + optional insert.
 * Used by admin business seed queue apply / force-apply.
 */

import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { nameSimilarity } from "@/lib/admin/duplicate-detection";
import { assignTagsFromListingText, formatAuditTags } from "@/lib/directory-audit/assign-tags-from-text";
import { buildGeminiAuditPrompt } from "@/lib/directory-audit/build-audit-prompt";
import {
  censusAddressQuery,
  parseCensusGeocodeResponse,
  shouldGeocodeRow,
} from "@/lib/directory-audit/census-geocode";
import type { CsvRow } from "@/lib/directory-audit/csv";
import { mergeAuditRow } from "@/lib/directory-audit/merge-audit-row";
import {
  firstCandidateText,
  groundingSourceUrls,
  hadGoogleSearch,
  parseGeminiAuditProposal,
} from "@/lib/directory-audit/parse-model-json";
import type { AllowedVocab } from "@/lib/directory-audit/types";
import {
  buildFreeOnboardSeoDescription,
  buildFreeOnboardSeoTitle,
  buildFreeOnboardSlug,
  buildFreeOnboardSearchKeywords,
} from "@/lib/listing-requests/free-onboard-derived";
import { slugifyBusinessTitle } from "@/lib/portal/slug";
import { buildSearchDocumentFields } from "@/lib/search/derive-search-document";

export type SeedBusinessInput = {
  title: string;
  town: string;
  area: string;
  is_storefront: boolean;
  is_service_business: boolean;
};

export type ProcessSeedOutcome =
  | "imported"
  | "force_imported"
  | "duplicate"
  | "needs_review"
  | "error";

export type ProcessSeedResult = {
  outcome: ProcessSeedOutcome;
  reason: string;
  auditStatus: string | null;
  auditConfidence: string | null;
  auditNotes: string | null;
  enriched: CsvRow;
  businessId: string | null;
  businessSlug: string | null;
};

type TownRow = { id: string; title: string; slug: string };
type AreaRow = { id: string; title: string; slug: string | null; town_id: string | null };
type CategoryRow = { id: string; title: string; slug: string };
type ExistingBusiness = {
  id: string;
  slug: string;
  title: string | null;
  town_id: string | null;
};

type LookupMaps = {
  towns: TownRow[];
  areas: AreaRow[];
  categories: CategoryRow[];
  townByTitle: Map<string, TownRow>;
  townBySlug: Map<string, TownRow>;
  areaByTitle: Map<string, AreaRow>;
  areaBySlug: Map<string, AreaRow>;
  categoryByTitle: Map<string, CategoryRow>;
};

type ExistingIndex = {
  bySlug: Map<string, ExistingBusiness>;
  byTitleTown: Map<string, ExistingBusiness>;
  byTownId: Map<string, ExistingBusiness[]>;
  slugSet: Set<string>;
};

const CENSUS_USER_AGENT = "WhereTo30A/1.0 (directory seed import; https://whereto30a.com)";
const FALLBACK_CATEGORY_TITLES = ["Professional Services", "Services", "Business Services"];

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function nullableText(raw: string | undefined): string | null {
  const value = (raw ?? "").trim();
  return value || null;
}

function nullableCoord(raw: string | undefined): number | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function boolString(value: boolean): string {
  return value ? "true" : "false";
}

function resolveTown(raw: string, maps: LookupMaps): TownRow | null {
  const value = raw.trim();
  if (!value) return null;
  return maps.townBySlug.get(normalizeSlug(value)) ?? maps.townByTitle.get(normalizeKey(value)) ?? null;
}

function resolveArea(raw: string, maps: LookupMaps): AreaRow | null {
  const value = raw.trim();
  if (!value) return null;
  return maps.areaBySlug.get(normalizeSlug(value)) ?? maps.areaByTitle.get(normalizeKey(value)) ?? null;
}

function preferredSlug(title: string, townSlug: string): string {
  const base = townSlug.trim() ? `${title} ${townSlug}` : title;
  return slugifyBusinessTitle(base) || "business";
}

function geminiApiKey(): string {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    ""
  );
}

function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash";
}

async function loadLookups(supabase: SupabaseClient): Promise<LookupMaps> {
  const [{ data: towns, error: townsErr }, { data: areas, error: areasErr }, { data: categories, error: catsErr }] =
    await Promise.all([
      supabase.from("towns").select("id, title, slug"),
      supabase.from("areas").select("id, title, slug, town_id"),
      supabase.from("business_categories").select("id, title, slug"),
    ]);
  if (townsErr) throw new Error(townsErr.message);
  if (areasErr) throw new Error(areasErr.message);
  if (catsErr) throw new Error(catsErr.message);

  const townRows: TownRow[] = (towns ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ""),
    slug: String(row.slug ?? ""),
  }));
  const areaRows: AreaRow[] = (areas ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ""),
    slug: row.slug == null ? null : String(row.slug),
    town_id: row.town_id == null ? null : String(row.town_id),
  }));
  const categoryRows: CategoryRow[] = (categories ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ""),
    slug: String(row.slug ?? ""),
  }));

  const areaBySlug = new Map<string, AreaRow>();
  for (const row of areaRows) {
    if (row.slug) areaBySlug.set(normalizeSlug(row.slug), row);
  }

  return {
    towns: townRows,
    areas: areaRows,
    categories: categoryRows,
    townByTitle: new Map(townRows.map((row) => [normalizeKey(row.title), row])),
    townBySlug: new Map(townRows.map((row) => [normalizeSlug(row.slug), row])),
    areaByTitle: new Map(areaRows.map((row) => [normalizeKey(row.title), row])),
    areaBySlug,
    categoryByTitle: new Map(categoryRows.map((row) => [normalizeKey(row.title), row])),
  };
}

async function loadExistingIndex(supabase: SupabaseClient): Promise<ExistingIndex> {
  const pageSize = 500;
  const rows: ExistingBusiness[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("businesses")
      .select("id, slug, title, town_id")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as ExistingBusiness[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  const byTownId = new Map<string, ExistingBusiness[]>();
  for (const row of rows) {
    const townId = row.town_id ?? "";
    const list = byTownId.get(townId) ?? [];
    list.push(row);
    byTownId.set(townId, list);
  }

  return {
    bySlug: new Map(rows.map((row) => [row.slug, row])),
    byTitleTown: new Map(rows.map((row) => [`${normalizeKey(row.title ?? "")}|${row.town_id ?? ""}`, row])),
    byTownId,
    slugSet: new Set(rows.map((row) => row.slug)),
  };
}

async function generateContent(prompt: string): Promise<Record<string, unknown>> {
  const apiKey = geminiApiKey();
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  const model = geminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    }),
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = json.error as { message?: string } | undefined;
    throw new Error(err?.message || res.statusText || `HTTP ${res.status}`);
  }
  return json;
}

async function auditSeedRow(
  row: CsvRow,
  allowed: AllowedVocab,
  allowedLists: { towns: string[]; areas: string[]; categories: string[] },
): Promise<CsvRow> {
  const basePrompt = buildGeminiAuditPrompt(row, allowedLists);
  let lastError = "unknown error";

  for (let attempt = 1; attempt <= 3; attempt++) {
    const prompt =
      attempt === 1
        ? basePrompt
        : `${basePrompt}\n\nAttempt ${attempt}: You MUST use Google Search again. Write research bullets, then the JSON code block.`;
    try {
      const payload = await generateContent(prompt);
      if (!hadGoogleSearch(payload)) {
        lastError = "Gemini did not run Google Search";
        continue;
      }
      const text = firstCandidateText(payload);
      const proposal = parseGeminiAuditProposal(text);
      const merged = mergeAuditRow(row, proposal, allowed, groundingSourceUrls(payload));
      if (merged.audit_status === "exists") {
        const tags = assignTagsFromListingText({
          title: merged.title,
          category: merged.category,
          excerpt: merged.excerpt,
          overview: merged.overview,
          search_keywords: merged.search_keywords,
          suggested_tags: merged.audit_suggested_tags,
        });
        merged.search_tags = formatAuditTags(tags);
      }
      return merged;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    ...row,
    audit_status: "error",
    audit_confidence: "low",
    audit_notes: lastError,
  };
}

async function geocodeIfNeeded(row: CsvRow): Promise<CsvRow> {
  if (!shouldGeocodeRow(row, true)) return row;
  const address = censusAddressQuery(row.location ?? "", row.town ?? "");
  if (!address) return row;
  try {
    const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
    url.searchParams.set("address", address);
    url.searchParams.set("benchmark", "Public_AR_Current");
    url.searchParams.set("format", "json");
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": CENSUS_USER_AGENT },
    });
    if (!res.ok) return row;
    const match = parseCensusGeocodeResponse(await res.json());
    if (!match) return row;
    return { ...row, map_lat: String(match.lat), map_lng: String(match.lng) };
  } catch {
    return row;
  }
}

function findExistingMatch(
  row: CsvRow,
  town: TownRow | null,
  existing: ExistingIndex,
): { business: ExistingBusiness; reason: string } | null {
  const titles = [...new Set([row.title.trim()].filter(Boolean))];
  const townSlug = town?.slug ?? "";
  const townId = town?.id ?? "";
  const townLabel = town?.title ?? "(any area)";

  for (const title of titles) {
    const wantSlug = preferredSlug(title, townSlug);
    const bySlug = existing.bySlug.get(wantSlug);
    if (bySlug) {
      return { business: bySlug, reason: `Slug already exists: ${bySlug.slug}` };
    }
  }

  for (const title of titles) {
    const byTitle = existing.byTitleTown.get(`${normalizeKey(title)}|${townId}`);
    if (byTitle) {
      return { business: byTitle, reason: `Same title already exists in ${townLabel}` };
    }
  }

  const townPeers = existing.byTownId.get(townId) ?? [];
  let best: { business: ExistingBusiness; score: number } | null = null;
  for (const peer of townPeers) {
    for (const title of titles) {
      const score = nameSimilarity(title, peer.title ?? "");
      if (score >= 0.92 && (!best || score > best.score)) {
        best = { business: peer, score };
      }
    }
  }
  if (best) {
    return {
      business: best.business,
      reason: `Similar title already exists in ${townLabel} (${best.business.title})`,
    };
  }
  return null;
}

function resolveCategory(
  row: CsvRow,
  maps: LookupMaps,
  force: boolean,
): CategoryRow | null {
  const direct = maps.categoryByTitle.get(normalizeKey(row.category ?? ""));
  if (direct) return direct;
  if (!force) return null;
  for (const title of FALLBACK_CATEGORY_TITLES) {
    const fallback = maps.categoryByTitle.get(normalizeKey(title));
    if (fallback) return fallback;
  }
  return maps.categories[0] ?? null;
}

function buildInsertRow(
  row: CsvRow,
  maps: LookupMaps,
  existing: ExistingIndex,
  opts: { force: boolean },
): {
  ok: true;
  insertRow: Record<string, unknown>;
  slug: string;
} | {
  ok: false;
  reason: string;
  duplicate?: ExistingBusiness;
} {
  const isStorefront = row.is_storefront === "true";
  const isServiceBusiness = row.is_service_business === "true";
  const serviceOnly = isServiceBusiness && !isStorefront;
  const town = serviceOnly ? null : resolveTown(row.town ?? "", maps);

  if (!serviceOnly && !town) {
    return { ok: false, reason: `Unknown town: ${row.town || "(blank)"}` };
  }

  const category = resolveCategory(row, maps, opts.force);
  if (!category) {
    return { ok: false, reason: `Unknown category: ${row.category || "(blank)"}` };
  }

  let area: AreaRow | null = null;
  if (!serviceOnly) {
    const areaRaw = nullableText(row.area);
    if (areaRaw) {
      area = resolveArea(areaRaw, maps);
      if (!area) return { ok: false, reason: `Unknown area: ${areaRaw}` };
    }
  }

  const existingMatch = findExistingMatch(row, town, existing);
  if (existingMatch) {
    return {
      ok: false,
      reason: existingMatch.reason,
      duplicate: existingMatch.business,
    };
  }

  const slug = buildFreeOnboardSlug(row.title, town?.slug ?? null, existing.slugSet);
  const searchTags = (row.search_tags ?? "")
    .split(/\s*\|\s*/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
  const searchKeywords =
    nullableText(row.search_keywords) ||
    buildFreeOnboardSearchKeywords({
      title: row.title,
      isStorefront,
      isServiceBusiness,
      categoryTitle: category.title,
      searchTags,
    });
  const searchDoc = buildSearchDocumentFields({
    title: row.title,
    excerpt: nullableText(row.excerpt),
    business_type: null,
    search_keywords: searchKeywords,
  });
  const finalTags = searchTags.length > 0 ? searchTags : searchDoc.search_tags;

  return {
    ok: true,
    slug,
    insertRow: {
      id: randomUUID(),
      title: row.title.trim(),
      slug,
      status: "published",
      town_id: town?.id ?? null,
      area_id: area?.id ?? null,
      primary_category_id: category.id,
      excerpt: nullableText(row.excerpt),
      overview: nullableText(row.overview),
      content: nullableText(row.overview),
      seo_title: nullableText(row.seo_title) ?? buildFreeOnboardSeoTitle(row.title, town?.title),
      seo_description:
        nullableText(row.seo_description) ?? buildFreeOnboardSeoDescription(row.excerpt ?? ""),
      search_keywords: searchKeywords,
      search_tags: finalTags,
      search_terms: searchDoc.search_terms,
      embedding_summary: searchDoc.embedding_summary,
      address: nullableText(row.location),
      phone: nullableText(row.phone),
      website: nullableText(row.website),
      map_lat: isStorefront ? nullableCoord(row.map_lat) : null,
      map_lng: isStorefront ? nullableCoord(row.map_lng) : null,
      is_storefront: isStorefront,
      is_service_business: isServiceBusiness,
      is_explorable: isStorefront,
      claim_status: "unclaimed",
      published_at: new Date().toISOString(),
    },
  };
}

function asAuditRow(input: SeedBusinessInput, townTitle: string, areaTitle: string): CsvRow {
  return {
    id: [
      input.title.trim(),
      input.town.trim(),
      input.area.trim(),
      boolString(input.is_storefront),
      boolString(input.is_service_business),
    ].join(" | "),
    title: input.title.trim(),
    slug: "",
    is_storefront: boolString(input.is_storefront),
    is_service_business: boolString(input.is_service_business),
    is_verified: "false",
    town: townTitle,
    area: areaTitle,
    category: "",
    search_tags: "",
    excerpt: "",
    overview: "",
    seo_title: "",
    seo_description: "",
    search_keywords: "",
    location: "",
    phone: "",
    website: "",
    map_lat: "",
    map_lng: "",
  };
}

export function validateSeedBusinessInput(input: SeedBusinessInput): string | null {
  const title = input.title.trim();
  if (!title) return "Title is required";
  if (!input.is_storefront && !input.is_service_business) {
    return "Select storefront, service business, or both";
  }
  if (input.is_storefront && !input.town.trim()) {
    return "Town is required for storefront listings";
  }
  if (!input.is_storefront && input.is_service_business && input.area.trim()) {
    return "Service-only listings cannot have an area";
  }
  return null;
}

/**
 * Verify one seed business with Gemini (+ Census for storefronts) and optionally insert.
 * When `force` is true, inserts even if audit_status is not `exists` (needs_review force-apply).
 * When `skipAudit` is true, uses `priorEnriched` instead of calling Gemini again.
 */
export async function processSeedBusiness(
  supabase: SupabaseClient,
  input: SeedBusinessInput,
  opts: {
    apply: boolean;
    force?: boolean;
    skipAudit?: boolean;
    priorEnriched?: CsvRow | null;
  },
): Promise<ProcessSeedResult> {
  const validationError = validateSeedBusinessInput(input);
  if (validationError) {
    const empty = asAuditRow(input, input.town, input.area);
    return {
      outcome: "error",
      reason: validationError,
      auditStatus: "error",
      auditConfidence: "low",
      auditNotes: validationError,
      enriched: empty,
      businessId: null,
      businessSlug: null,
    };
  }

  const maps = await loadLookups(supabase);
  const serviceOnly = input.is_service_business && !input.is_storefront;

  let townTitle = "";
  let areaTitle = "";
  if (input.town.trim()) {
    const town = resolveTown(input.town, maps);
    if (!town) {
      const empty = asAuditRow(input, input.town, input.area);
      return {
        outcome: "error",
        reason: `Unknown town: ${input.town}`,
        auditStatus: "error",
        auditConfidence: "low",
        auditNotes: `Unknown town: ${input.town}`,
        enriched: empty,
        businessId: null,
        businessSlug: null,
      };
    }
    townTitle = town.title;
  } else if (!serviceOnly) {
    const empty = asAuditRow(input, "", "");
    return {
      outcome: "error",
      reason: "Town is required for storefront listings",
      auditStatus: "error",
      auditConfidence: "low",
      auditNotes: "Town is required for storefront listings",
      enriched: empty,
      businessId: null,
      businessSlug: null,
    };
  }

  if (input.area.trim()) {
    const area = resolveArea(input.area, maps);
    if (!area) {
      const empty = asAuditRow(input, townTitle, input.area);
      return {
        outcome: "error",
        reason: `Unknown area: ${input.area}`,
        auditStatus: "error",
        auditConfidence: "low",
        auditNotes: `Unknown area: ${input.area}`,
        enriched: empty,
        businessId: null,
        businessSlug: null,
      };
    }
    areaTitle = area.title;
  }

  const allowed: AllowedVocab = {
    towns: new Set(maps.towns.map((row) => row.title).filter(Boolean)),
    areas: new Set(maps.areas.map((row) => row.title).filter(Boolean)),
    categories: new Set(maps.categories.map((row) => row.title).filter(Boolean)),
  };
  const allowedLists = {
    towns: [...allowed.towns].sort(),
    areas: [...allowed.areas].sort(),
    categories: [...allowed.categories].sort(),
  };

  const seedRow = asAuditRow(input, townTitle, areaTitle);
  let enriched: CsvRow;
  if (opts.skipAudit && opts.priorEnriched) {
    enriched = {
      ...opts.priorEnriched,
      is_storefront: boolString(input.is_storefront),
      is_service_business: boolString(input.is_service_business),
    };
  } else {
    enriched = await auditSeedRow(seedRow, allowed, allowedLists);
    enriched = await geocodeIfNeeded(enriched);
  }

  // Service-only stays unpinned to a town on insert regardless of Gemini town guess.
  if (serviceOnly) {
    enriched = { ...enriched, town: "", area: "" };
  }

  const auditStatus = enriched.audit_status?.trim() || null;
  const auditConfidence = enriched.audit_confidence?.trim() || null;
  const auditNotes = enriched.audit_notes?.trim() || null;
  const force = Boolean(opts.force);
  const verified = auditStatus === "exists";

  if (!force && !verified) {
    return {
      outcome: "needs_review",
      reason: `Verification did not pass (audit_status=${auditStatus || "blank"})`,
      auditStatus,
      auditConfidence,
      auditNotes,
      enriched,
      businessId: null,
      businessSlug: null,
    };
  }

  if (!opts.apply && !force) {
    return {
      outcome: "imported",
      reason: "Verified (dry — not inserted)",
      auditStatus,
      auditConfidence,
      auditNotes,
      enriched,
      businessId: null,
      businessSlug: null,
    };
  }

  const existing = await loadExistingIndex(supabase);
  const built = buildInsertRow(enriched, maps, existing, { force });
  if (!built.ok) {
    if (built.duplicate) {
      return {
        outcome: "duplicate",
        reason: built.reason,
        auditStatus,
        auditConfidence,
        auditNotes,
        enriched,
        businessId: built.duplicate.id,
        businessSlug: built.duplicate.slug,
      };
    }
    return {
      outcome: "needs_review",
      reason: built.reason,
      auditStatus,
      auditConfidence,
      auditNotes,
      enriched,
      businessId: null,
      businessSlug: null,
    };
  }

  const { error } = await supabase.from("businesses").insert(built.insertRow);
  if (error) {
    return {
      outcome: "error",
      reason: error.message,
      auditStatus,
      auditConfidence,
      auditNotes,
      enriched,
      businessId: null,
      businessSlug: null,
    };
  }

  try {
    const { syncMembershipsToPrimary } = await import(
      "@/lib/categories/business-category-memberships"
    );
    await syncMembershipsToPrimary(
      String(built.insertRow.id),
      (built.insertRow.primary_category_id as string | null) ?? null,
      supabase,
    );
  } catch (e) {
    console.error("seed memberships", e);
  }

  return {
    outcome: force && !verified ? "force_imported" : "imported",
    reason: force && !verified ? "Force-imported without verified exists status" : "Inserted",
    auditStatus,
    auditConfidence,
    auditNotes,
    enriched,
    businessId: String(built.insertRow.id),
    businessSlug: built.slug,
  };
}
