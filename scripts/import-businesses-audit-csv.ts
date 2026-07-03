/**
 * Apply edits from an audit CSV (from export-businesses-csv.ts) back to Supabase.
 * Matches each row by `id` when present, otherwise by `slug`. Updates only changed columns.
 *
 * Usage:
 *   npx tsx scripts/import-businesses-audit-csv.ts --file docs/storefronts-audit.csv
 *   npx tsx scripts/import-businesses-audit-csv.ts --file docs/services-audit.csv --apply
 *   npx tsx scripts/import-businesses-audit-csv.ts --file docs/storefronts-audit.csv --apply --reembed
 *
 * Dry-run by default. Does not create new listings — only updates existing rows.
 * Read-only export columns (listing_kind, *_title, intent_tags, derived search_* when
 * enrichment inputs change) are ignored or re-derived automatically.
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
  is_storefront, is_service_business, is_hidden_from_search,
  town_id, area_id, primary_category_id, service_category_id,
  address, map_lat, map_lng, phone, website, service_area,
  excerpt, seo_title, seo_description, search_keywords, search_terms, embedding_summary,
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

function arraysEqual(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}

function nullableText(raw: string): string | null {
  const v = raw?.trim();
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

async function loadLookupMaps() {
  const [{ data: towns }, { data: areas }, { data: cats }, { data: svcCats }] = await Promise.all([
    supabase.from("towns").select("id, title, slug"),
    supabase.from("areas").select("id, title, slug, town_id"),
    supabase.from("business_categories").select("id, slug"),
    supabase.from("service_categories").select("id, slug"),
  ]);

  const townBySlug = new Map((towns ?? []).map((t) => [t.slug, t.id]));
  const townByTitle = new Map((towns ?? []).map((t) => [norm(t.title), t.id]));
  const areaBySlug = new Map((areas ?? []).map((a) => [a.slug, a.id]));
  const areaByTitle = new Map((areas ?? []).map((a) => [norm(a.title), a.id]));
  const catBySlug = new Map((cats ?? []).map((c) => [c.slug, c.id]));
  const svcBySlug = new Map((svcCats ?? []).map((c) => [c.slug, c.id]));

  return { townBySlug, townByTitle, areaBySlug, areaByTitle, catBySlug, svcBySlug };
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
  const title = row.town_or_area?.trim();
  if (title) return maps.townByTitle.get(norm(title)) ?? null;
  if (row.town_slug === "" && row.town_or_area === "") return null;
  return undefined;
}

function resolveAreaId(
  row: CsvRow,
  maps: Awaited<ReturnType<typeof loadLookupMaps>>,
): string | null | undefined {
  const slug = row.shopping_area_slug?.trim();
  if (slug) return maps.areaBySlug.get(slug) ?? null;
  const title = row.shopping_area?.trim();
  if (title) return maps.areaByTitle.get(norm(title)) ?? null;
  if (row.shopping_area_slug === "" && row.shopping_area === "") return null;
  return undefined;
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

  setIfChanged("title", nullableText(row.title), existing.title);
  setIfChanged("slug", nullableText(row.slug), existing.slug);
  setIfChanged("status", nullableText(row.status), existing.status);
  setIfChanged("published_at", nullableIso(row.published_at), existing.published_at);
  setIfChanged("archived_at", nullableIso(row.archived_at), existing.archived_at);

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
  if (townId !== undefined) setIfChanged("town_id", townId, existing.town_id);

  const areaId = resolveAreaId(row, maps);
  if (areaId !== undefined) setIfChanged("area_id", areaId, existing.area_id);

  if (row.primary_category?.trim()) {
    const catId = maps.catBySlug.get(row.primary_category.trim()) ?? null;
    setIfChanged("primary_category_id", catId, existing.primary_category_id, "primary_category");
  } else if (row.primary_category === "") {
    setIfChanged("primary_category_id", null, existing.primary_category_id, "primary_category");
  }

  if (row.service_category !== undefined) {
    const slug = row.service_category?.trim();
    const svcId = slug ? (maps.svcBySlug.get(slug) ?? null) : null;
    setIfChanged("service_category_id", svcId, existing.service_category_id, "service_category");
  }

  setIfChanged("address", nullableText(row.address), existing.address);
  setIfChanged("map_lat", nullableNumber(row.map_lat), existing.map_lat);
  setIfChanged("map_lng", nullableNumber(row.map_lng), existing.map_lng);
  setIfChanged("phone", nullableText(row.phone), existing.phone);
  setIfChanged("website", nullableText(row.website), existing.website);
  setIfChanged("service_area", nullableText(row.service_area), existing.service_area);
  setIfChanged("excerpt", nullableText(row.excerpt), existing.excerpt);
  setIfChanged("seo_title", nullableText(row.seo_title), existing.seo_title);
  setIfChanged("seo_description", nullableText(row.seo_description), existing.seo_description);
  setIfChanged("search_keywords", nullableText(row.search_keywords), existing.search_keywords);
  setIfChanged("search_profile", nullableText(row.search_profile), existing.search_profile);
  setIfChanged("qa_document", nullableText(row.qa_document), existing.qa_document);
  setIfChanged("business_type", nullableText(row.business_type), existing.business_type);

  if (row.price_level !== undefined) {
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
    if (row[field] !== undefined) {
      const next = parseJsonArray(row[field] ?? "", field, matchKey);
      setIfChanged(field, next, existing[field]);
    }
  }

  if (patch.qa_document !== undefined) patch.qa_document_updated_at = now;
  if (patch.search_profile !== undefined) patch.search_profile_updated_at = now;

  const merged = { ...existing, ...patch };
  const derived = buildSearchDocumentFields({
    title: merged.title,
    excerpt: merged.excerpt,
    business_type: merged.business_type,
    search_keywords: merged.search_keywords,
    item_tags: merged.item_tags,
    dietary_tags: merged.dietary_tags,
    atmosphere_tags: merged.atmosphere_tags,
    occasion_tags: merged.occasion_tags,
    meal_period_tags: merged.meal_period_tags,
  });

  setIfChanged("search_tags", derived.search_tags, existing.search_tags);
  setIfChanged("search_terms", derived.search_terms, existing.search_terms);
  setIfChanged("embedding_summary", derived.embedding_summary, existing.embedding_summary);

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
