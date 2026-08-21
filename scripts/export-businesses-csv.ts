/**
 * Export businesses for manual audit (storefronts + services in one file).
 *
 * Columns: id, title, slug, is_storefront, is_service_business, is_verified, town, area, category,
 * search_tags, excerpt, overview, seo_title, seo_description, search_keywords,
 * location, phone, website, map_lat, map_lng.
 *
 * Import skips content edits on verified listings. Coordinates apply only to storefronts
 * (including verified storefronts).
 *
 * Rows are sorted by category, then town, then title.
 *
 * Usage:
 *   npx tsx scripts/export-businesses-csv.ts
 *   npx tsx scripts/export-businesses-csv.ts --all-statuses
 *   npx tsx scripts/export-businesses-csv.ts --include-archived
 *   npx tsx scripts/export-businesses-csv.ts --file path.csv
 */

import { writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ALL_STATUSES = process.argv.includes("--all-statuses");
const INCLUDE_ARCHIVED = process.argv.includes("--include-archived");

function resolveOutputPath(): string {
  const fileIdx = process.argv.indexOf("--file");
  if (fileIdx === -1) return "docs/businesses-audit.csv";
  const p = process.argv[fileIdx + 1];
  if (!p) throw new Error("--file requires a path");
  return p;
}

const OUTPUT_PATH = resolveOutputPath();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type Rel<T> = T | T[] | null;

type ExportRow = {
  id: string;
  title: string;
  slug: string;
  is_storefront: boolean | null;
  is_service_business: boolean | null;
  is_verified: boolean | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  excerpt: string | null;
  overview: string | null;
  seo_title: string | null;
  seo_description: string | null;
  search_keywords: string | null;
  search_tags: string[] | null;
  map_lat: number | null;
  map_lng: number | null;
  towns: Rel<{ title: string }>;
  areas: Rel<{ title: string }>;
  business_categories: Rel<{ title: string; slug: string }>;
  service_categories: Rel<{ title: string; slug: string }>;
};

const SELECT = `
  id, title, slug, is_storefront, is_service_business, is_verified, address, phone, website,
  excerpt, overview, seo_title, seo_description, search_keywords, search_tags,
  map_lat, map_lng,
  towns ( title ),
  areas ( title ),
  business_categories!primary_category_id ( title, slug ),
  service_categories ( title, slug )
`;

const HEADERS = [
  "id",
  "title",
  "slug",
  "is_storefront",
  "is_service_business",
  "is_verified",
  "town",
  "area",
  "category",
  "search_tags",
  "excerpt",
  "overview",
  "seo_title",
  "seo_description",
  "search_keywords",
  "location",
  "phone",
  "website",
  "map_lat",
  "map_lng",
] as const;

function relOne<T>(rel: Rel<T>): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function stringifyCsv(headers: readonly string[], rows: Record<string, string>[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(row[h] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function formatSearchTags(tags: string[] | null | undefined): string {
  if (!tags?.length) return "";
  return [...new Set(tags.filter((t) => typeof t === "string" && t.trim()))]
    .sort()
    .join(" | ");
}

function formatBool(value: boolean | null | undefined): string {
  return value ? "true" : "false";
}

/** Prefer unified business category; fall back to legacy service specialty title. */
function categoryLabel(row: ExportRow): string {
  const category = relOne(row.business_categories);
  if (category?.title?.trim()) return category.title.trim();
  const specialty = relOne(row.service_categories);
  return specialty?.title?.trim() || "";
}

function formatCoord(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "";
  return String(value);
}

function mapRow(row: ExportRow): Record<string, string> {
  const town = relOne(row.towns);
  const area = relOne(row.areas);
  return {
    id: row.id ?? "",
    title: row.title ?? "",
    slug: row.slug ?? "",
    is_storefront: formatBool(row.is_storefront),
    is_service_business: formatBool(row.is_service_business),
    is_verified: formatBool(row.is_verified),
    town: town?.title?.trim() ?? "",
    area: area?.title?.trim() ?? "",
    category: categoryLabel(row),
    search_tags: formatSearchTags(row.search_tags),
    excerpt: row.excerpt ?? "",
    overview: row.overview ?? "",
    seo_title: row.seo_title ?? "",
    seo_description: row.seo_description ?? "",
    search_keywords: row.search_keywords ?? "",
    location: row.address ?? "",
    phone: row.phone ?? "",
    website: row.website ?? "",
    map_lat: formatCoord(row.map_lat),
    map_lng: formatCoord(row.map_lng),
  };
}

function sortKey(row: Record<string, string>): string {
  return [
    row.category.toLowerCase() || "\uffff",
    row.town.toLowerCase() || "\uffff",
    row.title.toLowerCase(),
  ].join("\0");
}

async function fetchBusinesses(): Promise<ExportRow[]> {
  const pageSize = 500;
  const all: ExportRow[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("businesses")
      .select(SELECT)
      .or("is_storefront.eq.true,is_service_business.eq.true")
      .order("title", { ascending: true })
      .range(from, from + pageSize - 1);

    if (!INCLUDE_ARCHIVED) {
      query = query.is("archived_at", null);
    }
    if (!ALL_STATUSES) {
      query = query.eq("status", "published");
    }

    const { data, error } = await query;
    if (error) throw error;

    const batch = (data ?? []) as ExportRow[];
    all.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

async function main() {
  const rows = await fetchBusinesses();
  const mapped = rows.map(mapRow).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  writeFileSync(OUTPUT_PATH, stringifyCsv(HEADERS, mapped), "utf8");

  const storefronts = mapped.filter((r) => r.is_storefront === "true").length;
  const services = mapped.filter((r) => r.is_service_business === "true").length;
  const both = mapped.filter(
    (r) => r.is_storefront === "true" && r.is_service_business === "true",
  ).length;
  console.log(`Wrote ${mapped.length} businesses → ${OUTPUT_PATH}`);
  console.log(`  is_storefront=${storefronts}, is_service_business=${services}, both=${both}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
