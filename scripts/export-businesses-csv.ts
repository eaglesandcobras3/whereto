/**
 * Export storefronts and/or service vendors for manual audit.
 *
 * Columns: title, slug, town, area, category, search_tags, excerpt, overview,
 * seo_title, seo_description, search_keywords, location, phone, website.
 *
 * Files are already split by listing kind (storefront vs service). Within each
 * file rows are sorted by category, then town, then title.
 *
 * Usage:
 *   npx tsx scripts/export-businesses-csv.ts                 # both CSVs under docs/
 *   npx tsx scripts/export-businesses-csv.ts --storefronts
 *   npx tsx scripts/export-businesses-csv.ts --services
 *   npx tsx scripts/export-businesses-csv.ts --all-statuses
 *   npx tsx scripts/export-businesses-csv.ts --include-archived
 *   npx tsx scripts/export-businesses-csv.ts --services --file path.csv
 */

import { writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ONLY_STOREFRONTS =
  process.argv.includes("--storefronts") && !process.argv.includes("--services");
const ONLY_SERVICES =
  process.argv.includes("--services") && !process.argv.includes("--storefronts");
const EXPORT_STOREFRONTS = ONLY_STOREFRONTS || (!ONLY_STOREFRONTS && !ONLY_SERVICES);
const EXPORT_SERVICES = ONLY_SERVICES || (!ONLY_STOREFRONTS && !ONLY_SERVICES);
const ALL_STATUSES = process.argv.includes("--all-statuses");
const INCLUDE_ARCHIVED = process.argv.includes("--include-archived");

function resolveOutputPath(kind: "storefront" | "service", defaultPath: string): string {
  const fileIdx = process.argv.indexOf("--file");
  if (fileIdx === -1) return defaultPath;

  const p = process.argv[fileIdx + 1];
  if (!p) throw new Error("--file requires a path");
  if (EXPORT_STOREFRONTS && EXPORT_SERVICES) {
    throw new Error("--file requires exactly one of --storefronts or --services");
  }
  if (kind === "storefront" && !EXPORT_STOREFRONTS) {
    throw new Error("Internal: storefront path requested but storefront export disabled");
  }
  if (kind === "service" && !EXPORT_SERVICES) {
    throw new Error("Internal: service path requested but service export disabled");
  }
  return p;
}

const STOREFRONTS_PATH = resolveOutputPath("storefront", "docs/storefronts-audit.csv");
const SERVICES_PATH = resolveOutputPath("service", "docs/services-audit.csv");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type Rel<T> = T | T[] | null;

type ExportRow = {
  title: string;
  slug: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  excerpt: string | null;
  overview: string | null;
  seo_title: string | null;
  seo_description: string | null;
  search_keywords: string | null;
  search_tags: string[] | null;
  towns: Rel<{ title: string }>;
  areas: Rel<{ title: string }>;
  business_categories: Rel<{ title: string; slug: string }>;
  service_categories: Rel<{ title: string; slug: string }>;
};

const SELECT = `
  title, slug, address, phone, website,
  excerpt, overview, seo_title, seo_description, search_keywords, search_tags,
  towns ( title ),
  areas ( title ),
  business_categories ( title, slug ),
  service_categories ( title, slug )
`;

const HEADERS = [
  "title",
  "slug",
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

function categoryLabel(row: ExportRow, kind: "storefront" | "service"): string {
  if (kind === "service") {
    const specialty = relOne(row.service_categories);
    if (specialty?.title?.trim()) return specialty.title.trim();
  }
  const category = relOne(row.business_categories);
  return category?.title?.trim() || "";
}

function mapRow(row: ExportRow, kind: "storefront" | "service"): Record<string, string> {
  const town = relOne(row.towns);
  const area = relOne(row.areas);
  return {
    title: row.title ?? "",
    slug: row.slug ?? "",
    town: town?.title?.trim() ?? "",
    area: area?.title?.trim() ?? "",
    category: categoryLabel(row, kind),
    search_tags: formatSearchTags(row.search_tags),
    excerpt: row.excerpt ?? "",
    overview: row.overview ?? "",
    seo_title: row.seo_title ?? "",
    seo_description: row.seo_description ?? "",
    search_keywords: row.search_keywords ?? "",
    location: row.address ?? "",
    phone: row.phone ?? "",
    website: row.website ?? "",
  };
}

function sortKey(row: Record<string, string>): string {
  return [
    row.category.toLowerCase() || "\uffff",
    row.town.toLowerCase() || "\uffff",
    row.title.toLowerCase(),
  ].join("\0");
}

async function fetchBusinesses(kind: "storefront" | "service"): Promise<ExportRow[]> {
  const pageSize = 500;
  const all: ExportRow[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("businesses")
      .select(SELECT)
      .order("title", { ascending: true })
      .range(from, from + pageSize - 1);

    if (!INCLUDE_ARCHIVED) {
      query = query.is("archived_at", null);
    }
    if (!ALL_STATUSES) {
      query = query.eq("status", "published");
    }
    if (kind === "storefront") {
      query = query.eq("is_storefront", true).eq("is_service_business", false);
    } else {
      query = query.eq("is_service_business", true).eq("is_storefront", false);
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

async function exportKind(kind: "storefront" | "service", path: string): Promise<void> {
  const rows = await fetchBusinesses(kind);
  const mapped = rows.map((r) => mapRow(r, kind)).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  writeFileSync(path, stringifyCsv(HEADERS, mapped), "utf8");
  console.log(`Wrote ${mapped.length} ${kind === "storefront" ? "storefronts" : "services"} → ${path}`);
}

async function main() {
  if (EXPORT_STOREFRONTS) {
    await exportKind("storefront", STOREFRONTS_PATH);
  }
  if (EXPORT_SERVICES) {
    await exportKind("service", SERVICES_PATH);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
