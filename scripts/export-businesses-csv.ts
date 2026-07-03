/**
 * Export storefronts and/or service vendors with location, categories, tags,
 * and search document fields to CSV for auditing.
 *
 * Usage:
 *   npx tsx scripts/export-businesses-csv.ts                 # both CSVs under docs/
 *   npx tsx scripts/export-businesses-csv.ts --storefronts
 *   npx tsx scripts/export-businesses-csv.ts --services
 *   npx tsx scripts/export-businesses-csv.ts --all-statuses    # include draft/unpublished
 *   npx tsx scripts/export-businesses-csv.ts --include-archived
 *   npx tsx scripts/export-businesses-csv.ts --services --file path.csv
 *
 * Round-trip: edit the CSV, then apply with import-businesses-audit-csv.ts
 * (matches by id when present, otherwise slug).
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
  id: string;
  slug: string;
  title: string;
  status: string | null;
  published_at: string | null;
  archived_at: string | null;
  featured: boolean | null;
  business_type: string | null;
  is_storefront: boolean | null;
  is_service_business: boolean | null;
  is_hidden_from_search: boolean | null;
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
  item_tags: string[] | null;
  dietary_tags: string[] | null;
  meal_period_tags: string[] | null;
  atmosphere_tags: string[] | null;
  occasion_tags: string[] | null;
  search_tags: string[] | null;
  towns: Rel<{ title: string; slug: string }>;
  areas: Rel<{ title: string; slug: string }>;
  business_categories: Rel<{ slug: string; title: string }>;
  service_categories: Rel<{ slug: string; title: string }>;
  intent_tags: string[] | null;
};

const SELECT = `
  id, slug, title, status, published_at, archived_at, featured,
  business_type, is_storefront, is_service_business, is_hidden_from_search,
  address, map_lat, map_lng, phone, website, service_area,
  excerpt, seo_title, seo_description, search_keywords, search_terms, embedding_summary,
  search_profile, qa_document, price_level,
  item_tags, dietary_tags, meal_period_tags, atmosphere_tags, occasion_tags, search_tags,
  towns ( title, slug ),
  areas ( title, slug ),
  business_categories ( slug, title ),
  service_categories ( slug, title ),
  intent_tags
`;

function relOne<T>(rel: Rel<T>): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function intentTagSlugs(row: ExportRow): string[] {
  const tags = row.intent_tags ?? [];
  return [...new Set(tags.filter((t) => typeof t === "string" && t.trim()))].sort();
}

function jsonField(value: string[] | null | undefined): string {
  return JSON.stringify(value ?? []);
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function stringifyCsv(headers: string[], rows: Record<string, string>[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(row[h] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
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

function textField(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

function boolField(value: boolean | null | undefined): string {
  if (value == null) return "";
  return value ? "true" : "false";
}

function listingKind(row: ExportRow): string {
  const storefront = row.is_storefront === true;
  const service = row.is_service_business === true;
  if (storefront && !service) return "storefront";
  if (service && !storefront) return "service";
  if (storefront && service) return "both";
  return "unset";
}

function mapListingMetaFields(row: ExportRow): Record<string, string> {
  return {
    listing_kind: listingKind(row),
    is_storefront: boolField(row.is_storefront),
    is_service_business: boolField(row.is_service_business),
    status: row.status ?? "",
    published_at: row.published_at ?? "",
    archived_at: row.archived_at ?? "",
    featured: boolField(row.featured),
  };
}

function mapSearchAndLocationFields(row: ExportRow): Record<string, string> {
  const town = relOne(row.towns);
  const area = relOne(row.areas);

  return {
    town_or_area: town?.title ?? "",
    town_slug: town?.slug ?? "",
    shopping_area: area?.title ?? "",
    shopping_area_slug: area?.slug ?? "",
    service_area: row.service_area ?? "",
    address: row.address ?? "",
    map_lat: textField(row.map_lat),
    map_lng: textField(row.map_lng),
    phone: row.phone ?? "",
    website: row.website ?? "",
    excerpt: row.excerpt ?? "",
    seo_title: row.seo_title ?? "",
    seo_description: row.seo_description ?? "",
    search_keywords: row.search_keywords ?? "",
    search_terms: row.search_terms ?? "",
    embedding_summary: row.embedding_summary ?? "",
    search_profile: row.search_profile ?? "",
    qa_document: row.qa_document ?? "",
    price_level: row.price_level ?? "",
    is_hidden_from_search: row.is_hidden_from_search ? "true" : "false",
  };
}

function mapTagFields(row: ExportRow): Record<string, string> {
  return {
    item_tags: jsonField(row.item_tags),
    dietary_tags: jsonField(row.dietary_tags),
    meal_period_tags: jsonField(row.meal_period_tags),
    atmosphere_tags: jsonField(row.atmosphere_tags),
    occasion_tags: jsonField(row.occasion_tags),
    search_tags: jsonField(row.search_tags),
    intent_tags: jsonField(intentTagSlugs(row)),
  };
}

function mapIdentityFields(row: ExportRow): Record<string, string> {
  return {
    title: row.title ?? "",
    slug: row.slug ?? "",
    id: row.id ?? "",
  };
}

function mapStorefrontRow(row: ExportRow): Record<string, string> {
  const category = relOne(row.business_categories);

  return {
    ...mapIdentityFields(row),
    ...mapListingMetaFields(row),
    ...mapSearchAndLocationFields(row),
    primary_category: category?.slug ?? "",
    primary_category_title: category?.title ?? "",
    business_type: row.business_type ?? "",
    ...mapTagFields(row),
  };
}

function mapServiceRow(row: ExportRow): Record<string, string> {
  const category = relOne(row.business_categories);
  const specialty = relOne(row.service_categories);

  return {
    ...mapIdentityFields(row),
    ...mapListingMetaFields(row),
    ...mapSearchAndLocationFields(row),
    primary_category: category?.slug ?? "",
    primary_category_title: category?.title ?? "",
    service_category: specialty?.slug ?? "",
    service_category_title: specialty?.title ?? "",
    business_type: row.business_type ?? "",
    ...mapTagFields(row),
  };
}

const STOREFRONT_HEADERS = [
  "title",
  "slug",
  "id",
  "listing_kind",
  "is_storefront",
  "is_service_business",
  "status",
  "published_at",
  "archived_at",
  "featured",
  "town_or_area",
  "town_slug",
  "shopping_area",
  "shopping_area_slug",
  "address",
  "map_lat",
  "map_lng",
  "phone",
  "website",
  "excerpt",
  "seo_title",
  "seo_description",
  "search_keywords",
  "search_terms",
  "embedding_summary",
  "search_profile",
  "qa_document",
  "price_level",
  "is_hidden_from_search",
  "primary_category",
  "primary_category_title",
  "business_type",
  "item_tags",
  "dietary_tags",
  "meal_period_tags",
  "atmosphere_tags",
  "occasion_tags",
  "search_tags",
  "intent_tags",
];

const SERVICE_HEADERS = [
  "title",
  "slug",
  "id",
  "listing_kind",
  "is_storefront",
  "is_service_business",
  "status",
  "published_at",
  "archived_at",
  "featured",
  "town_or_area",
  "town_slug",
  "service_area",
  "address",
  "map_lat",
  "map_lng",
  "phone",
  "website",
  "excerpt",
  "seo_title",
  "seo_description",
  "search_keywords",
  "search_terms",
  "embedding_summary",
  "search_profile",
  "qa_document",
  "price_level",
  "is_hidden_from_search",
  "primary_category",
  "primary_category_title",
  "service_category",
  "service_category_title",
  "business_type",
  "item_tags",
  "dietary_tags",
  "meal_period_tags",
  "atmosphere_tags",
  "occasion_tags",
  "search_tags",
  "intent_tags",
];

async function main() {
  if (EXPORT_STOREFRONTS) {
    const rows = await fetchBusinesses("storefront");
    const csv = stringifyCsv(STOREFRONT_HEADERS, rows.map(mapStorefrontRow));
    writeFileSync(STOREFRONTS_PATH, csv, "utf8");
    console.log(`Wrote ${rows.length} storefronts → ${STOREFRONTS_PATH}`);
  }

  if (EXPORT_SERVICES) {
    const rows = await fetchBusinesses("service");
    const csv = stringifyCsv(SERVICE_HEADERS, rows.map(mapServiceRow));
    writeFileSync(SERVICES_PATH, csv, "utf8");
    console.log(`Wrote ${rows.length} service vendors → ${SERVICES_PATH}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
