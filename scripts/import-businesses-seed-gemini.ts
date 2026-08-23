/**
 * Import new businesses from a minimal seed CSV by verifying each row with
 * Gemini + Google Search, deriving tags, Census-geocoding storefront pins,
 * writing an enriched CSV snapshot, and optionally inserting confirmed rows.
 *
 * Seed CSV headers:
 *   title,town,area,is_storefront,is_service_business
 *
 * town / area accept either title or slug (e.g. "Grayton Beach" or "grayton-beach").
 * Storefronts require a town. Service-only rows may leave town/area blank
 * (serves any area → town_id/area_id null on insert).
 *
 * Confirmed rows that already exist in the DB are written to a separate
 * `*-gemini-existing.csv` (with the real businesses.id) for a later
 * `import-businesses-audit-csv.ts` update pass.
 *
 * Usage:
 *   npx tsx scripts/import-businesses-seed-gemini.ts --file docs/businesses-seed-template.csv
 *   npx tsx scripts/import-businesses-seed-gemini.ts --file docs/businesses-seed-template.csv --apply
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { nameSimilarity } from "../lib/admin/duplicate-detection";
import { assignTagsFromListingText, formatAuditTags } from "../lib/directory-audit/assign-tags-from-text";
import { buildGeminiAuditPrompt } from "../lib/directory-audit/build-audit-prompt";
import {
  censusAddressQuery,
  parseCensusGeocodeResponse,
  shouldGeocodeRow,
} from "../lib/directory-audit/census-geocode";
import { parseCsv, stringifyCsv, type CsvRow } from "../lib/directory-audit/csv";
import { mergeAuditRow } from "../lib/directory-audit/merge-audit-row";
import {
  firstCandidateText,
  groundingSourceUrls,
  hadGoogleSearch,
  parseGeminiAuditProposal,
} from "../lib/directory-audit/parse-model-json";
import { OUTPUT_HEADERS, type AllowedVocab } from "../lib/directory-audit/types";
import {
  buildFreeOnboardSeoDescription,
  buildFreeOnboardSeoTitle,
  buildFreeOnboardSlug,
  buildFreeOnboardSearchKeywords,
} from "../lib/listing-requests/free-onboard-derived";
import { slugifyBusinessTitle } from "../lib/portal/slug";
import { buildSearchDocumentFields } from "../lib/search/derive-search-document";

dotenv.config({ path: ".env.local" });

type TownRow = { id: string; title: string; slug: string };
type AreaRow = { id: string; title: string; slug: string | null; town_id: string | null };
type CategoryRow = { id: string; title: string; slug: string };

type SeedRow = {
  title: string;
  town: string;
  area: string;
  is_storefront: string;
  is_service_business: string;
};

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

type ImportStatus =
  | "ready"
  | "duplicate_slug"
  | "duplicate_title_town"
  | "missing_town"
  | "missing_area"
  | "missing_category";

type ImportCandidate = {
  key: string;
  row: CsvRow;
  status: ImportStatus;
  reason: string;
  insertRow?: Record<string, unknown>;
  slug?: string;
  /** Existing businesses.id when this seed matched a duplicate (for post-import update CSV). */
  existingId?: string;
};

type ExistingIndex = {
  bySlug: Map<string, ExistingBusiness>;
  byTitleTown: Map<string, ExistingBusiness>;
  byTownId: Map<string, ExistingBusiness[]>;
  slugSet: Set<string>;
};

const REQUIRED_HEADERS = [
  "title",
  "town",
  "area",
  "is_storefront",
  "is_service_business",
] as const;

const CENSUS_USER_AGENT = "WhereTo30A/1.0 (directory seed import; https://whereto30a.com)";

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

const CSV_PATH = argValue("--file") ?? "docs/businesses-seed-template.csv";
const OUTPUT_PATH = argValue("--out") ?? CSV_PATH.replace(/\.csv$/i, "-gemini.csv");
const EXISTING_PATH =
  argValue("--existing-out") ?? OUTPUT_PATH.replace(/\.csv$/i, "-existing.csv");
const APPLY = hasFlag("--apply");
const LIMIT_RAW = argValue("--limit");
const LIMIT = LIMIT_RAW ? Math.max(1, Number(LIMIT_RAW) || 0) : null;
const FORCE = hasFlag("--force");
/** Skip Gemini/Census; rebuild insert + existing-update CSVs from a prior snapshot. */
const INSERT_ONLY = hasFlag("--insert-only");
const MODEL = argValue("--model") ?? process.env.GEMINI_MODEL?.trim() ?? "gemini-3.7-flash";
const DELAY_MS = Math.max(0, Number(argValue("--delay-ms") ?? "400") || 0);
const GEOCODE_DELAY_MS = Math.max(0, Number(argValue("--geocode-delay-ms") ?? "350") || 0);
const API_KEY =
  process.env.GEMINI_API_KEY?.trim() ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
  "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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

function parseBool(raw: string): boolean {
  const value = raw.trim().toLowerCase();
  if (value === "true" || value === "1" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  throw new Error(`Invalid boolean value: ${raw}`);
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

function makeSeedKey(row: SeedRow): string {
  return [
    row.title.trim(),
    row.town.trim(),
    row.area.trim(),
    row.is_storefront.trim().toLowerCase(),
    row.is_service_business.trim().toLowerCase(),
  ].join(" | ");
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

function asAuditRow(row: SeedRow, townTitle: string, areaTitle: string): CsvRow {
  return {
    id: "",
    title: row.title.trim(),
    slug: "",
    is_storefront: row.is_storefront.trim().toLowerCase(),
    is_service_business: row.is_service_business.trim().toLowerCase(),
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

function validateSeedHeaders(rows: CsvRow[]): void {
  const headerSet = new Set(Object.keys(rows[0] ?? {}));
  for (const header of REQUIRED_HEADERS) {
    if (!headerSet.has(header)) {
      throw new Error(`Missing required seed header: ${header}`);
    }
  }
}

type GeminiResponse = Record<string, unknown>;

async function generateContent(prompt: string): Promise<GeminiResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": API_KEY,
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

  const json = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    const err = json.error as { message?: string; status?: string } | undefined;
    const error = new Error(err?.message || res.statusText || `HTTP ${res.status}`) as Error & {
      status?: number;
    };
    error.status = res.status;
    throw error;
  }
  return json;
}

async function loadLookups(): Promise<LookupMaps> {
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

async function loadExistingBusinesses(): Promise<ExistingBusiness[]> {
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

  return rows;
}

function loadPrior(path: string): Map<string, CsvRow> {
  if (!existsSync(path)) return new Map();
  const rows = parseCsv(readFileSync(path, "utf8"));
  const map = new Map<string, CsvRow>();
  for (const row of rows) {
    const key = row.id?.trim();
    if (key) map.set(key, row);
  }
  return map;
}

async function auditSeedRow(
  row: CsvRow,
  allowed: AllowedVocab,
  allowedLists: { towns: string[]; areas: string[]; categories: string[] },
): Promise<CsvRow> {
  const prompt = buildGeminiAuditPrompt(row, allowedLists);
  try {
    const payload = await generateContent(prompt);
    if (!hadGoogleSearch(payload)) {
      return {
        ...row,
        audit_status: "error",
        audit_confidence: "",
        audit_sources: "",
        audit_notes: "Gemini did not run Google Search",
        audit_suggested_tags: "",
      };
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
    const lastError = err instanceof Error ? err.message : String(err);
    return {
      ...row,
      audit_status: "error",
      audit_confidence: "",
      audit_sources: "",
      audit_notes: lastError.slice(0, 500),
      audit_suggested_tags: "",
    };
  }
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
  url.searchParams.set("address", address);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");
  const res = await fetch(url, {
    headers: { "User-Agent": CENSUS_USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Census HTTP ${res.status}`);
  const json = (await res.json()) as unknown;
  const match = parseCensusGeocodeResponse(json);
  if (!match) return null;
  return { lat: match.lat, lng: match.lng };
}

/** Fill map_lat/map_lng for confirmed storefronts via US Census geocoder. */
async function geocodeStorefrontRows(rows: CsvRow[]): Promise<{
  filled: number;
  skipped: number;
  missed: number;
}> {
  let filled = 0;
  let skipped = 0;
  let missed = 0;
  const targets = rows.filter((row) => shouldGeocodeRow(row, true));

  console.log(`\nCensus geocode  storefronts to pin: ${targets.length}`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!shouldGeocodeRow(row, true)) {
      skipped += 1;
      continue;
    }
    const query = censusAddressQuery(row.location ?? "", row.town ?? "");
    process.stdout.write(`[geocode ${filled + missed + 1}/${targets.length}] ${row.title} … `);
    try {
      const match = await geocodeAddress(query);
      if (!match) {
        console.log("no match");
        missed += 1;
      } else {
        row.map_lat = String(match.lat);
        row.map_lng = String(match.lng);
        filled += 1;
        console.log(`${match.lat},${match.lng}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`error: ${message}`);
      missed += 1;
    }
    if (GEOCODE_DELAY_MS && i < rows.length - 1) await sleep(GEOCODE_DELAY_MS);
  }

  console.log(`  filled: ${filled}  missed: ${missed}  skipped: ${skipped}`);
  return { filled, skipped, missed };
}

function preferredSlug(title: string, townSlug: string): string {
  const base = townSlug.trim() ? `${title} ${townSlug}` : title;
  return slugifyBusinessTitle(base) || "business";
}

/** Seed key is `title | town | area | storefront | service`. */
function seedTitleFromRowId(id: string): string {
  const first = id.split(" | ")[0]?.trim() ?? "";
  return first;
}

function findExistingMatch(
  row: CsvRow,
  town: TownRow | null,
  existing: ExistingIndex,
): { business: ExistingBusiness; reason: string; status: "duplicate_slug" | "duplicate_title_town" } | null {
  const auditedTitle = row.title.trim();
  const seedTitle = seedTitleFromRowId(row.id ?? "") || auditedTitle;
  const titles = [...new Set([auditedTitle, seedTitle].filter(Boolean))];
  const townSlug = town?.slug ?? "";
  const townId = town?.id ?? "";
  const townLabel = town?.title ?? "(any area)";

  for (const title of titles) {
    const wantSlug = preferredSlug(title, townSlug);
    const bySlug = existing.bySlug.get(wantSlug);
    if (bySlug) {
      return {
        business: bySlug,
        reason: `Slug already exists: ${bySlug.slug}`,
        status: "duplicate_slug",
      };
    }
  }

  for (const title of titles) {
    const titleTownKey = `${normalizeKey(title)}|${townId}`;
    const byTitle = existing.byTitleTown.get(titleTownKey);
    if (byTitle) {
      return {
        business: byTitle,
        reason: `Same title already exists in ${townLabel}`,
        status: "duplicate_title_town",
      };
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
      status: "duplicate_title_town",
    };
  }

  return null;
}

function buildImportCandidate(
  row: CsvRow,
  maps: LookupMaps,
  existing: ExistingIndex,
): ImportCandidate {
  const key = row.id?.trim() || row.title.trim();
  if ((row.audit_status ?? "") !== "exists") {
    return {
      key,
      row,
      status: "missing_category",
      reason: `audit_status=${row.audit_status || "blank"} (not inserted)`,
    };
  }

  const isStorefront = parseBool(row.is_storefront);
  const isServiceBusiness = parseBool(row.is_service_business);
  const serviceOnly = isServiceBusiness && !isStorefront;

  // Service-only listings serve any area — never pin town/area on insert.
  const town = serviceOnly ? null : resolveTown(row.town ?? "", maps);
  if (!serviceOnly && !town) {
    return { key, row, status: "missing_town", reason: `Unknown town: ${row.town || "(blank)"}` };
  }

  const category = maps.categoryByTitle.get(normalizeKey(row.category ?? ""));
  if (!category) {
    return {
      key,
      row,
      status: "missing_category",
      reason: `Unknown category: ${row.category || "(blank)"}`,
    };
  }

  let area: AreaRow | null = null;
  if (!serviceOnly) {
    const areaRaw = nullableText(row.area);
    if (areaRaw) {
      area = resolveArea(areaRaw, maps);
      if (!area) {
        return { key, row, status: "missing_area", reason: `Unknown area: ${areaRaw}` };
      }
    }
  }

  const existingMatch = findExistingMatch(row, town, existing);
  if (existingMatch) {
    return {
      key,
      row,
      status: existingMatch.status,
      reason: existingMatch.reason,
      slug: existingMatch.business.slug,
      existingId: existingMatch.business.id,
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
      categoryTitle: row.category,
      searchTags,
    });
  const searchDoc = buildSearchDocumentFields({
    title: row.title,
    excerpt: nullableText(row.excerpt),
    business_type: null,
    search_keywords: searchKeywords,
  });
  const finalTags = searchTags.length > 0 ? searchTags : searchDoc.search_tags;
  const mapLat = isStorefront ? nullableCoord(row.map_lat) : null;
  const mapLng = isStorefront ? nullableCoord(row.map_lng) : null;

  const insertRow: Record<string, unknown> = {
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
    map_lat: mapLat,
    map_lng: mapLng,
    is_storefront: isStorefront,
    is_service_business: isServiceBusiness,
    is_explorable: isStorefront,
    claim_status: "unclaimed",
    published_at: new Date().toISOString(),
  };

  return { key, row, status: "ready", reason: "ready", insertRow, slug };
}

async function main() {
  if (INSERT_ONLY && FORCE) {
    console.error("Use either --insert-only or --force, not both.");
    process.exit(1);
  }
  if (!INSERT_ONLY && !API_KEY) {
    console.error("Missing GEMINI_API_KEY in .env.local");
    process.exit(1);
  }
  if (!existsSync(CSV_PATH)) {
    console.error(`Seed CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const seedRows = parseCsv(readFileSync(CSV_PATH, "utf8"));
  if (seedRows.length === 0) {
    console.error(`No rows in ${CSV_PATH}`);
    process.exit(1);
  }
  validateSeedHeaders(seedRows);

  const maps = await loadLookups();

  const normalizedSeeds = seedRows.map((row, index) => {
    const seed: SeedRow = {
      title: (row.title ?? "").trim(),
      town: (row.town ?? "").trim(),
      area: (row.area ?? "").trim(),
      is_storefront: (row.is_storefront ?? "").trim(),
      is_service_business: (row.is_service_business ?? "").trim(),
    };
    if (!seed.title) throw new Error(`Row ${index + 2}: title is required`);
    const storefront = parseBool(seed.is_storefront);
    const service = parseBool(seed.is_service_business);
    if (!storefront && !service) {
      throw new Error(`Row ${index + 2}: at least one of is_storefront or is_service_business must be true`);
    }
    const serviceOnly = service && !storefront;
    if (seed.town) {
      const town = resolveTown(seed.town, maps);
      if (!town) {
        throw new Error(`Row ${index + 2}: unknown town (title or slug): ${seed.town}`);
      }
    } else if (!serviceOnly) {
      throw new Error(`Row ${index + 2}: town is required for storefront listings`);
    }
    if (seed.area) {
      if (serviceOnly) {
        throw new Error(`Row ${index + 2}: service-only listings cannot have an area (leave blank)`);
      }
      const area = resolveArea(seed.area, maps);
      if (!area) {
        throw new Error(`Row ${index + 2}: unknown area (title or slug): ${seed.area}`);
      }
    }
    return seed;
  });

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

  // Resolve seed slug/title → canonical titles so Gemini stays on the allowed vocab.
  // Service-only blank town stays blank (any-area); storefronts always have a town.
  const inputRows = normalizedSeeds.map((seed) => {
    const town = seed.town ? resolveTown(seed.town, maps) : null;
    const area = seed.area ? resolveArea(seed.area, maps) : null;
    const auditRow = asAuditRow(seed, town?.title ?? "", area?.title ?? "");
    auditRow.id = makeSeedKey(seed);
    return auditRow;
  });

  const prior = FORCE ? new Map<string, CsvRow>() : loadPrior(OUTPUT_PATH);
  const outputById = new Map(prior);
  const queued = INSERT_ONLY
    ? []
    : inputRows.filter((row) => !prior.get(row.id)?.audit_status);
  const work = LIMIT ? queued.slice(0, LIMIT) : queued;

  console.log(`Gemini seed import  model=${MODEL}${INSERT_ONLY ? " (insert-only)" : ""}`);
  console.log(`Input: ${CSV_PATH} (${inputRows.length} rows)`);
  console.log(`Output snapshot: ${OUTPUT_PATH}`);
  console.log(`Queued: ${work.length}  already done: ${inputRows.length - queued.length}`);

  function writeSnapshot() {
    const rows = inputRows.map((row) => outputById.get(row.id) ?? row);
    writeFileSync(OUTPUT_PATH, stringifyCsv(OUTPUT_HEADERS, rows), "utf8");
  }

  let geoStats = { filled: 0, missed: 0, skipped: 0 };

  if (!INSERT_ONLY) {
    for (let i = 0; i < work.length; i++) {
      const row = work[i];
      process.stdout.write(`[${i + 1}/${work.length}] ${row.title} … `);
      const result = await auditSeedRow(row, allowed, allowedLists);
      outputById.set(row.id, result);
      console.log(result.audit_status || "pending");
      writeSnapshot();
      if (DELAY_MS && i < work.length - 1) await sleep(DELAY_MS);
    }

    writeSnapshot();

    const rowsForGeo = inputRows.map((row) => outputById.get(row.id) ?? row);
    geoStats = await geocodeStorefrontRows(rowsForGeo);
    for (const row of rowsForGeo) {
      outputById.set(row.id, row);
    }
    writeSnapshot();
  } else if (!existsSync(OUTPUT_PATH)) {
    console.error(`--insert-only requires an existing snapshot: ${OUTPUT_PATH}`);
    process.exit(1);
  }

  const finalRows = inputRows.map((row) => outputById.get(row.id) ?? row);
  if (INSERT_ONLY) {
    geoStats = {
      filled: finalRows.filter((r) => r.map_lat?.trim() && r.map_lng?.trim()).length,
      missed: finalRows.filter(
        (r) =>
          r.audit_status === "exists" &&
          r.is_storefront === "true" &&
          r.location?.trim() &&
          !r.map_lat?.trim(),
      ).length,
      skipped: 0,
    };
  }

  const existingBusinesses = await loadExistingBusinesses();
  const byTownId = new Map<string, ExistingBusiness[]>();
  for (const row of existingBusinesses) {
    const townId = row.town_id ?? "";
    const list = byTownId.get(townId) ?? [];
    list.push(row);
    byTownId.set(townId, list);
  }
  const existing: ExistingIndex = {
    bySlug: new Map(existingBusinesses.map((row) => [row.slug, row])),
    byTitleTown: new Map(
      existingBusinesses.map((row) => [`${normalizeKey(row.title ?? "")}|${row.town_id ?? ""}`, row]),
    ),
    byTownId,
    slugSet: new Set(existingBusinesses.map((row) => row.slug)),
  };

  const candidates = finalRows.map((row) => buildImportCandidate(row, maps, existing));
  const ready = candidates.filter((candidate) => candidate.status === "ready");
  const duplicates = candidates.filter(
    (candidate) => candidate.status === "duplicate_slug" || candidate.status === "duplicate_title_town",
  );
  const notExists = finalRows.filter((row) => row.audit_status !== "exists").length;
  const skippedDuplicates = duplicates.length;
  const missingLookups = candidates.filter(
    (candidate) =>
      candidate.status === "missing_town" ||
      candidate.status === "missing_area" ||
      candidate.status === "missing_category",
  ).length;

  // Enriched rows that matched existing listings — ready for audit CSV update import.
  const existingUpdateRows: CsvRow[] = duplicates
    .filter((candidate) => candidate.existingId)
    .map((candidate) => ({
      ...candidate.row,
      id: candidate.existingId!,
      slug: candidate.slug ?? candidate.row.slug ?? "",
    }));
  if (existingUpdateRows.length > 0) {
    writeFileSync(EXISTING_PATH, stringifyCsv(OUTPUT_HEADERS, existingUpdateRows), "utf8");
  }

  console.log("\nInsert summary");
  console.log(`  confirmed exists: ${finalRows.filter((row) => row.audit_status === "exists").length}`);
  console.log(`  not inserted (non-exists/error): ${notExists}`);
  console.log(`  ready to insert: ${ready.length}`);
  console.log(`  skipped duplicates: ${skippedDuplicates}`);
  console.log(`  skipped lookup issues: ${missingLookups}`);
  console.log(`  census pins filled: ${geoStats.filled}  missed: ${geoStats.missed}`);
  if (existingUpdateRows.length > 0) {
    console.log(`  existing update CSV: ${EXISTING_PATH} (${existingUpdateRows.length} rows)`);
  }

  for (const candidate of candidates.filter((item) => item.status !== "ready").slice(0, 20)) {
    console.log(`  - ${candidate.key}: ${candidate.reason}`);
  }

  if (APPLY && ready.length > 0) {
    const batchSize = 25;
    let inserted = 0;
    for (let i = 0; i < ready.length; i += batchSize) {
      const batch = ready.slice(i, i + batchSize).map((candidate) => candidate.insertRow!);
      const { error } = await supabase.from("businesses").insert(batch);
      if (error) throw new Error(`Insert batch ${i}: ${error.message}`);
      const { syncMembershipsToPrimary } = await import(
        "../lib/categories/business-category-memberships"
      );
      for (const row of batch) {
        const id = String(row.id ?? "");
        const primary = (row.primary_category_id as string | null) ?? null;
        if (id) {
          try {
            await syncMembershipsToPrimary(id, primary, supabase);
          } catch (e) {
            console.warn(`membership sync failed for ${id}:`, e);
          }
        }
      }
      inserted += batch.length;
      console.log(`  inserted ${inserted} / ${ready.length}`);
    }
  } else if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to insert confirmed rows.");
  }

  if (existingUpdateRows.length > 0) {
    console.log(
      `\nExisting matches written to ${EXISTING_PATH}. Review, then:\n` +
        `  npx tsx scripts/import-businesses-audit-csv.ts --file ${EXISTING_PATH}\n` +
        `  npx tsx scripts/import-businesses-audit-csv.ts --file ${EXISTING_PATH} --apply`,
    );
  }

  const reportPath = OUTPUT_PATH.replace(/\.csv$/i, "-import-report.md");
  const reportLines = [
    "# Gemini seed import report",
    "",
    `Source: \`${CSV_PATH}\``,
    `Snapshot: \`${OUTPUT_PATH}\``,
    existingUpdateRows.length > 0 ? `Existing updates: \`${EXISTING_PATH}\`` : null,
    `Mode: ${APPLY ? "apply" : "dry-run"}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    "| | Count |",
    "| --- | --- |",
    `| Seed rows | ${seedRows.length} |`,
    `| Confirmed exists | ${finalRows.filter((row) => row.audit_status === "exists").length} |`,
    `| Ready to insert | ${ready.length} |`,
    `| Non-exists / errors | ${notExists} |`,
    `| Duplicate skips | ${skippedDuplicates} |`,
    `| Existing update CSV rows | ${existingUpdateRows.length} |`,
    `| Lookup skips | ${missingLookups} |`,
    `| Census pins filled | ${geoStats.filled} |`,
    `| Census pins missed | ${geoStats.missed} |`,
    "",
  ].filter((line): line is string => line != null);

  if (ready.length > 0) {
    reportLines.push(
      "## Ready",
      "",
      "| Title | Town | Category | Slug | Lat | Lng |",
      "| --- | --- | --- | --- | --- | --- |",
    );
    for (const candidate of ready) {
      reportLines.push(
        `| ${candidate.row.title.replace(/\|/g, "\\|")} | ${candidate.row.town.replace(/\|/g, "\\|")} | ${candidate.row.category.replace(/\|/g, "\\|")} | ${(candidate.slug ?? "").replace(/\|/g, "\\|")} | ${(candidate.row.map_lat ?? "").replace(/\|/g, "\\|")} | ${(candidate.row.map_lng ?? "").replace(/\|/g, "\\|")} |`,
      );
    }
    reportLines.push("");
  }

  if (existingUpdateRows.length > 0) {
    reportLines.push(
      "## Existing (update CSV)",
      "",
      "| Title | Existing id | Slug | Reason |",
      "| --- | --- | --- | --- |",
    );
    for (const candidate of duplicates) {
      reportLines.push(
        `| ${candidate.row.title.replace(/\|/g, "\\|")} | ${(candidate.existingId ?? "").replace(/\|/g, "\\|")} | ${(candidate.slug ?? "").replace(/\|/g, "\\|")} | ${candidate.reason.replace(/\|/g, "\\|")} |`,
      );
    }
    reportLines.push("");
  }

  const skipped = candidates.filter(
    (candidate) =>
      candidate.status !== "ready" &&
      candidate.status !== "duplicate_slug" &&
      candidate.status !== "duplicate_title_town",
  );
  if (skipped.length > 0) {
    reportLines.push("## Skipped", "", "| Title | Reason |", "| --- | --- |");
    for (const candidate of skipped) {
      reportLines.push(
        `| ${candidate.row.title.replace(/\|/g, "\\|")} | ${candidate.reason.replace(/\|/g, "\\|")} |`,
      );
    }
    reportLines.push("");
  }

  writeFileSync(reportPath, reportLines.join("\n") + "\n", "utf8");
  console.log(`Wrote ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
