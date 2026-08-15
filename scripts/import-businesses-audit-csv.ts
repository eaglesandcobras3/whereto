/**
 * Apply edits from an audit CSV (from export-businesses-csv.ts) back to Supabase.
 * Matches each row by `id` when present, otherwise by `slug`. Updates only changed columns.
 *
 * Supports the slim audit export columns:
 *   title, slug, is_storefront, is_service_business, town, area, category,
 *   search_tags, excerpt, overview, seo_title, seo_description, search_keywords,
 *   location, phone, website, map_lat, map_lng
 *
 * Verified listings: content columns are ignored. `map_lat` / `map_lng` still apply
 * when the existing row is a storefront. Service-only rows never get coordinate updates.
 *
 * Also accepts the older wide export (town_slug, primary_category, item_tags, …)
 * and the previous split files (docs/storefronts-audit.csv / docs/services-audit.csv).
 *
 * Usage:
 *   npx tsx scripts/import-businesses-audit-csv.ts --file docs/businesses-audit.csv
 *   npx tsx scripts/import-businesses-audit-csv.ts --file docs/businesses-audit.csv --apply
 *   npx tsx scripts/import-businesses-audit-csv.ts --file docs/businesses-audit.csv --apply --reembed
 *
 * Dry-run by default. Does not create new listings — only updates existing rows.
 */

import { readFileSync, writeFileSync } from "fs";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { buildSearchDocumentFields } from "../lib/search/derive-search-document";

dotenv.config({ path: ".env.local" });

function resolveCsvPath(): string {
  const fileIdx = process.argv.indexOf("--file");
  const path = fileIdx >= 0 ? process.argv[fileIdx + 1] : undefined;
  if (!path) {
    console.error("Usage: npx tsx scripts/import-businesses-audit-csv.ts --file path.csv [--apply] [--reembed]");
    process.exit(1);
  }
  return path;
}

const CSV_PATH = resolveCsvPath();
const APPLY = process.argv.includes("--apply");
const REEMBED = process.argv.includes("--reembed");
const REPORT = process.argv.includes("--report") || APPLY;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type CsvRow = Record<string, string>;

type ExistingRow = {
  id: string;
  slug: string;
  title: string | null;
  status: string | null;
  published_at: string | null;
  archived_at: string | null;
  featured: boolean | null;
  is_storefront: boolean | null;
  is_service_business: boolean | null;
  is_verified: boolean | null;
  is_hidden_from_search: boolean | null;
  town_id: string | null;
  area_id: string | null;
  primary_category_id: string | null;
  service_category_id: string | null;
  address: string | null;
  map_lat: number | null;
  map_lng: number | null;
  phone: string | null;
  website: string | null;
  service_area: string | null;
  excerpt: string | null;
  overview: string | null;
  seo_title: string | null;
  seo_description: string | null;
  search_keywords: string | null;
  search_terms: string | null;
  embedding_summary: string | null;
  search_profile: string | null;
  qa_document: string | null;
  price_level: string | null;
  business_type: string | null;
  item_tags: string[] | null;
  dietary_tags: string[] | null;
  meal_period_tags: string[] | null;
  atmosphere_tags: string[] | null;
  occasion_tags: string[] | null;
  search_tags: string[] | null;
};

const EXISTING_SELECT = `
  id, slug, title, status, published_at, archived_at, featured,
  is_storefront, is_service_business, is_verified, is_hidden_from_search,
  town_id, area_id, primary_category_id, service_category_id,
  address, map_lat, map_lng, phone, website, service_area,
  excerpt, overview, seo_title, seo_description, search_keywords, search_terms, embedding_summary,
  search_profile, qa_document, price_level, business_type,
  item_tags, dietary_tags, meal_period_tags, atmosphere_tags, occasion_tags, search_tags
`;

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      if (ch === "\r") i++;
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((c) => c.length > 0)) rows.push(row);
  }
  const [header, ...body] = rows;
  return body.map((cells) =>
    Object.fromEntries(header.map((h, idx) => [h.trim(), cells[idx] ?? ""])),
  );
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBool(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  throw new Error(`Invalid boolean: ${raw}`);
}

function parseJsonArray(raw: string, field: string, key: string): string[] {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed === "[]") return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) throw new Error("not an array");
    return parsed.map(String);
  } catch {
    throw new Error(`Invalid JSON in ${field} for ${key}`);
  }
}

/** Accept JSON arrays or slim export `tag1 | tag2` / comma-separated lists. */
function parseTagList(raw: string, field: string, key: string): string[] {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed === "[]") return [];
  if (trimmed.startsWith("[")) {
    return parseJsonArray(trimmed, field, key)
      .map((t) =>
        t
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, ""),
      )
      .filter(Boolean);
  }
  const parts = trimmed.split(/\s*\|\s*|\s*,\s*/);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const tag = part
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

function arraysEqual(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
  const aa = [...(a ?? [])].map(String).sort();
  const bb = [...(b ?? [])].map(String).sort();
  return JSON.stringify(aa) === JSON.stringify(bb);
}

function nullableText(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const v = raw.trim();
  return v ? v : null;
}

function nullableIso(raw: string): string | null {
  const v = raw?.trim();
  return v ? v : null;
}

function nullableNumber(raw: string): number | null {
  const v = raw?.trim();
  if (!v) return null;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`Invalid number: ${raw}`);
  return n;
}

/** Match DB column numeric(12,8). */
const COORD_SCALE = 8;
const COORD_EPS = 5e-9; // half of 1e-8

function roundCoord(n: number): number {
  const f = 10 ** COORD_SCALE;
  return Math.round(n * f) / f;
}

function nullableCoord(raw: string): number | null {
  const n = nullableNumber(raw);
  return n == null ? null : roundCoord(n);
}

function asCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return null;
  return roundCoord(n);
}

/** Coordinates are stored as numeric(12,8); compare at that scale. */
function coordinatesEqual(a: number | null, b: number | null): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) < COORD_EPS;
}

function hasColumn(row: CsvRow, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(row, key);
}

async function loadLookupMaps() {
  const [{ data: towns }, { data: areas }, { data: cats }, { data: svcCats }] = await Promise.all([
    supabase.from("towns").select("id, title, slug"),
    supabase.from("areas").select("id, title, slug, town_id"),
    supabase.from("business_categories").select("id, slug, title"),
    supabase.from("service_categories").select("id, slug, title"),
  ]);

  const townBySlug = new Map((towns ?? []).map((t) => [t.slug, t.id]));
  const townByTitle = new Map((towns ?? []).map((t) => [norm(t.title), t.id]));
  const areaBySlug = new Map((areas ?? []).map((a) => [a.slug, a.id]));
  const areaByTitle = new Map((areas ?? []).map((a) => [norm(a.title), a.id]));
  const catBySlug = new Map((cats ?? []).map((c) => [c.slug, c.id]));
  const catByTitle = new Map((cats ?? []).map((c) => [norm(c.title), c.id]));
  const svcBySlug = new Map((svcCats ?? []).map((c) => [c.slug, c.id]));
  const svcByTitle = new Map((svcCats ?? []).map((c) => [norm(c.title), c.id]));

  return {
    townBySlug,
    townByTitle,
    areaBySlug,
    areaByTitle,
    catBySlug,
    catByTitle,
    svcBySlug,
    svcByTitle,
  };
}

async function loadExistingIndex(): Promise<{ byId: Map<string, ExistingRow>; bySlug: Map<string, ExistingRow> }> {
  const byId = new Map<string, ExistingRow>();
  const bySlug = new Map<string, ExistingRow>();
  const pageSize = 500;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("businesses")
      .select(EXISTING_SELECT)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data ?? []) as ExistingRow[];
    for (const row of batch) {
      byId.set(row.id, row);
      bySlug.set(row.slug, row);
    }
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return { byId, bySlug };
}

function resolveTownId(
  row: CsvRow,
  maps: Awaited<ReturnType<typeof loadLookupMaps>>,
): string | null | undefined {
  const slug = row.town_slug?.trim();
  if (slug) return maps.townBySlug.get(slug) ?? null;

  const title = (row.town ?? row.town_or_area)?.trim();
  if (title) {
    const id = maps.townByTitle.get(norm(title));
    if (!id) throw new Error(`Unknown town: ${title}`);
    return id;
  }

  if (
    (hasColumn(row, "town") && row.town === "") ||
    (hasColumn(row, "town_or_area") && row.town_or_area === "" && row.town_slug === "")
  ) {
    return null;
  }
  return undefined;
}

function resolveAreaId(
  row: CsvRow,
  maps: Awaited<ReturnType<typeof loadLookupMaps>>,
): string | null | undefined {
  const slug = row.shopping_area_slug?.trim();
  if (slug) return maps.areaBySlug.get(slug) ?? null;

  const title = (row.area ?? row.shopping_area)?.trim();
  if (title) {
    const id = maps.areaByTitle.get(norm(title));
    if (!id) throw new Error(`Unknown area: ${title}`);
    return id;
  }

  if (
    (hasColumn(row, "area") && row.area === "") ||
    (hasColumn(row, "shopping_area") && row.shopping_area === "" && row.shopping_area_slug === "")
  ) {
    return null;
  }
  return undefined;
}

function resolveCategoryIds(
  row: CsvRow,
  existing: ExistingRow,
  maps: Awaited<ReturnType<typeof loadLookupMaps>>,
): { primary?: string | null; service?: string | null } {
  const out: { primary?: string | null; service?: string | null } = {};

  if (hasColumn(row, "primary_category")) {
    const slug = row.primary_category.trim();
    out.primary = slug ? (maps.catBySlug.get(slug) ?? null) : null;
    if (slug && out.primary == null) throw new Error(`Unknown primary_category: ${slug}`);
  }

  if (hasColumn(row, "service_category")) {
    const slug = row.service_category.trim();
    out.service = slug ? (maps.svcBySlug.get(slug) ?? null) : null;
    if (slug && out.service == null) throw new Error(`Unknown service_category: ${slug}`);
  }

  if (hasColumn(row, "category") && !hasColumn(row, "primary_category") && !hasColumn(row, "service_category")) {
    const title = row.category.trim();
    if (!title) {
      if (existing.is_service_business && !existing.is_storefront) {
        out.service = null;
      } else {
        out.primary = null;
      }
    } else {
      const svcId = maps.svcByTitle.get(norm(title));
      const catId = maps.catByTitle.get(norm(title));
      if (!svcId && !catId) throw new Error(`Unknown category: ${title}`);

      // Match export: services prefer specialty title; storefronts use business category only.
      if (existing.is_service_business && !existing.is_storefront) {
        if (svcId) out.service = svcId;
        else out.primary = catId ?? null;
      } else if (catId) {
        out.primary = catId;
      } else {
        throw new Error(`Unknown storefront category: ${title}`);
      }
    }
  }

  return out;
}

function matchExisting(
  row: CsvRow,
  index: Awaited<ReturnType<typeof loadExistingIndex>>,
): ExistingRow | null {
  const id = row.id?.trim();
  if (id) return index.byId.get(id) ?? null;
  const slug = row.slug?.trim();
  if (slug) return index.bySlug.get(slug) ?? null;
  return null;
}

function buildPatch(
  row: CsvRow,
  existing: ExistingRow,
  maps: Awaited<ReturnType<typeof loadLookupMaps>>,
): { patch: Record<string, unknown>; changes: string[]; matchKey: string } {
  const patch: Record<string, unknown> = {};
  const changes: string[] = [];
  const matchKey = row.id?.trim() || row.slug?.trim() || existing.slug;
  const now = new Date().toISOString();
  const verified = Boolean(existing.is_verified);
  const storefront = Boolean(existing.is_storefront);

  function setIfChanged(field: string, next: unknown, prev: unknown, label?: string) {
    const same =
      Array.isArray(next) || Array.isArray(prev)
        ? arraysEqual(next as string[] | null, prev as string[] | null)
        : next === prev;
    if (!same) {
      patch[field] = next;
      changes.push(label ?? field);
    }
  }

  // Pins: storefronts only (including verified). Ignore blank CSV cells so we do not wipe coords.
  if (storefront) {
    if (hasColumn(row, "map_lat") && row.map_lat.trim()) {
      const next = nullableCoord(row.map_lat);
      const prev = asCoord(existing.map_lat);
      if (!coordinatesEqual(next, prev)) setIfChanged("map_lat", next, existing.map_lat);
    }
    if (hasColumn(row, "map_lng") && row.map_lng.trim()) {
      const next = nullableCoord(row.map_lng);
      const prev = asCoord(existing.map_lng);
      if (!coordinatesEqual(next, prev)) setIfChanged("map_lng", next, existing.map_lng);
    }
  }

  if (verified) {
    return { patch, changes, matchKey };
  }

  setIfChanged("title", nullableText(row.title), existing.title);
  setIfChanged("slug", nullableText(row.slug), existing.slug);

  if (hasColumn(row, "status")) {
    setIfChanged("status", nullableText(row.status), existing.status);
  }
  if (hasColumn(row, "published_at")) {
    setIfChanged("published_at", nullableIso(row.published_at), existing.published_at);
  }
  if (hasColumn(row, "archived_at")) {
    setIfChanged("archived_at", nullableIso(row.archived_at), existing.archived_at);
  }

  if (row.featured?.trim()) {
    setIfChanged("featured", parseBool(row.featured), existing.featured);
  }
  if (row.is_hidden_from_search?.trim()) {
    setIfChanged("is_hidden_from_search", parseBool(row.is_hidden_from_search), existing.is_hidden_from_search);
  }
  if (row.is_storefront?.trim()) {
    setIfChanged("is_storefront", parseBool(row.is_storefront), existing.is_storefront);
  }
  if (row.is_service_business?.trim()) {
    setIfChanged("is_service_business", parseBool(row.is_service_business), existing.is_service_business);
  }

  const townId = resolveTownId(row, maps);
  if (townId !== undefined) setIfChanged("town_id", townId, existing.town_id, "town");

  const areaId = resolveAreaId(row, maps);
  if (areaId !== undefined) setIfChanged("area_id", areaId, existing.area_id, "area");

  const cats = resolveCategoryIds(row, existing, maps);
  if (cats.primary !== undefined) {
    setIfChanged("primary_category_id", cats.primary, existing.primary_category_id, "category");
  }
  if (cats.service !== undefined) {
    setIfChanged("service_category_id", cats.service, existing.service_category_id, "service_category");
  }

  const addressRaw = hasColumn(row, "location")
    ? row.location
    : hasColumn(row, "address")
      ? row.address
      : undefined;
  if (addressRaw !== undefined) {
    setIfChanged("address", nullableText(addressRaw), existing.address, "location");
  }

  if (hasColumn(row, "phone")) setIfChanged("phone", nullableText(row.phone), existing.phone);
  if (hasColumn(row, "website")) setIfChanged("website", nullableText(row.website), existing.website);
  if (hasColumn(row, "service_area")) {
    setIfChanged("service_area", nullableText(row.service_area), existing.service_area);
  }
  if (hasColumn(row, "excerpt")) setIfChanged("excerpt", nullableText(row.excerpt), existing.excerpt);
  if (hasColumn(row, "overview")) setIfChanged("overview", nullableText(row.overview), existing.overview);
  if (hasColumn(row, "seo_title")) setIfChanged("seo_title", nullableText(row.seo_title), existing.seo_title);
  if (hasColumn(row, "seo_description")) {
    setIfChanged("seo_description", nullableText(row.seo_description), existing.seo_description);
  }
  if (hasColumn(row, "search_keywords")) {
    setIfChanged("search_keywords", nullableText(row.search_keywords), existing.search_keywords);
  }
  if (hasColumn(row, "search_profile")) {
    setIfChanged("search_profile", nullableText(row.search_profile), existing.search_profile);
  }
  if (hasColumn(row, "qa_document")) {
    setIfChanged("qa_document", nullableText(row.qa_document), existing.qa_document);
  }
  if (hasColumn(row, "business_type")) {
    setIfChanged("business_type", nullableText(row.business_type), existing.business_type);
  }

  if (hasColumn(row, "price_level")) {
    const pl = row.price_level?.trim();
    setIfChanged("price_level", pl && /^[1-4]$/.test(pl) ? pl : null, existing.price_level);
  }

  const tagFields = [
    "item_tags",
    "dietary_tags",
    "meal_period_tags",
    "atmosphere_tags",
    "occasion_tags",
  ] as const;
  for (const field of tagFields) {
    if (hasColumn(row, field)) {
      const next = parseJsonArray(row[field] ?? "", field, matchKey);
      setIfChanged(field, next, existing[field]);
    }
  }

  if (patch.qa_document !== undefined) patch.qa_document_updated_at = now;
  if (patch.search_profile !== undefined) patch.search_profile_updated_at = now;

  const merged = { ...existing, ...patch };
  const slimSearchTags = hasColumn(row, "search_tags");

  if (slimSearchTags) {
    const nextTags = parseTagList(row.search_tags ?? "", "search_tags", matchKey).sort();
    setIfChanged("search_tags", nextTags, existing.search_tags);
  }

  const tagFieldsChanged = tagFields.some((f) => patch[f] !== undefined);
  const derivedInputsChanged =
    patch.title !== undefined ||
    patch.excerpt !== undefined ||
    patch.search_keywords !== undefined ||
    patch.business_type !== undefined ||
    patch.search_tags !== undefined ||
    tagFieldsChanged;

  // Wide CSV without an explicit search_tags column: always re-derive tags from enrichment columns.
  const shouldRefreshDerived = derivedInputsChanged || (!slimSearchTags && tagFields.some((f) => hasColumn(row, f)));

  if (shouldRefreshDerived) {
    const derived = buildSearchDocumentFields({
      title: (patch.title as string | null | undefined) ?? merged.title,
      excerpt: (patch.excerpt as string | null | undefined) ?? merged.excerpt,
      business_type: (patch.business_type as string | null | undefined) ?? merged.business_type,
      search_keywords:
        (patch.search_keywords as string | null | undefined) ?? merged.search_keywords,
      item_tags: (patch.item_tags as string[] | null | undefined) ?? merged.item_tags,
      dietary_tags: (patch.dietary_tags as string[] | null | undefined) ?? merged.dietary_tags,
      atmosphere_tags:
        (patch.atmosphere_tags as string[] | null | undefined) ?? merged.atmosphere_tags,
      occasion_tags: (patch.occasion_tags as string[] | null | undefined) ?? merged.occasion_tags,
      meal_period_tags:
        (patch.meal_period_tags as string[] | null | undefined) ?? merged.meal_period_tags,
    });
    if (!slimSearchTags) {
      setIfChanged("search_tags", derived.search_tags, existing.search_tags);
    }
    setIfChanged("search_terms", derived.search_terms, existing.search_terms);
    setIfChanged("embedding_summary", derived.embedding_summary, existing.embedding_summary);
  }

  return { patch, changes, matchKey };
}

async function main() {
  const csvRows = parseCsv(readFileSync(CSV_PATH, "utf8"));
  const maps = await loadLookupMaps();
  const index = await loadExistingIndex();

  const unchanged: string[] = [];
  const updated: Array<{ key: string; changes: string[]; id: string }> = [];
  const missing: string[] = [];
  const errors: Array<{ key: string; message: string }> = [];
  const touchedIds: string[] = [];

  for (const row of csvRows) {
    const key = row.id?.trim() || row.slug?.trim() || row.title?.trim() || "(blank row)";
    try {
      const existing = matchExisting(row, index);
      if (!existing) {
        missing.push(key);
        continue;
      }

      const { patch, changes, matchKey } = buildPatch(row, existing, maps);
      if (changes.length === 0) {
        unchanged.push(matchKey);
        continue;
      }

      if (APPLY) {
        const { error } = await supabase.from("businesses").update(patch).eq("id", existing.id);
        if (error) throw new Error(error.message);
        touchedIds.push(existing.id);
      }

      updated.push({ key: matchKey, changes, id: existing.id });
    } catch (err) {
      errors.push({ key, message: err instanceof Error ? err.message : String(err) });
    }
  }

  console.log(`\nAudit CSV import  [${APPLY ? "APPLY" : "DRY RUN"}]`);
  console.log(`Source: ${CSV_PATH}`);
  console.log(`Verified listings: content ignored; storefront coordinates still apply.`);
  console.log(`Service-only listings: coordinates ignored.`);
  console.log(`Rows: ${csvRows.length}`);
  console.log(`Updated: ${updated.length}`);
  console.log(`Unchanged: ${unchanged.length}`);
  console.log(`Missing: ${missing.length}`);
  console.log(`Errors: ${errors.length}`);

  for (const u of updated.slice(0, 20)) {
    console.log(`  ~ ${u.key}: ${u.changes.join(", ")}`);
  }
  if (updated.length > 20) console.log(`  ... and ${updated.length - 20} more`);

  for (const m of missing.slice(0, 10)) console.log(`  ? not found: ${m}`);
  for (const e of errors.slice(0, 10)) console.log(`  ! ${e.key}: ${e.message}`);

  if (!APPLY && updated.length > 0) {
    console.log("\nRe-run with --apply to write changes.");
  }

  if (APPLY && REEMBED && touchedIds.length > 0) {
    console.log(`\nRe-embedding ${touchedIds.length} updated listings...`);
  }

  if (REPORT) {
    const reportPath = CSV_PATH.replace(/\.csv$/i, "-import-report.md");
    const lines = [
      `# Audit CSV import report`,
      "",
      `Source: \`${CSV_PATH}\``,
      `Mode: ${APPLY ? "apply" : "dry-run"}`,
      `Generated: ${new Date().toISOString()}`,
      "",
      "## Summary",
      "",
      `| | Count |`,
      `| --- | --- |`,
      `| CSV rows | ${csvRows.length} |`,
      `| Updated | ${updated.length} |`,
      `| Unchanged | ${unchanged.length} |`,
      `| Not found | ${missing.length} |`,
      `| Errors | ${errors.length} |`,
      "",
    ];
    if (updated.length) {
      lines.push("## Updates", "", "| Match key | Changes |", "| --- | --- |");
      for (const u of updated) {
        lines.push(`| ${u.key.replace(/\|/g, "\\|")} | ${u.changes.join(", ").replace(/\|/g, "\\|")} |`);
      }
      lines.push("");
    }
    writeFileSync(reportPath, lines.join("\n") + "\n");
    console.log(`\nWrote ${reportPath}`);
  }

  if (APPLY && REEMBED && touchedIds.length > 0) {
    const uniqueIds = [...new Set(touchedIds)];
    for (const id of uniqueIds) {
      const proc = spawnSync(
        "npx",
        ["tsx", "scripts/generate-business-embeddings.ts", "--apply", "--id", id],
        { stdio: "inherit", cwd: process.cwd() },
      );
      if (proc.status !== 0) {
        console.error(`Embedding failed for ${id}`);
      }
    }
  }

  if (errors.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
