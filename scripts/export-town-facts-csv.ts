/**
 * Export town “at a glance” facts for manual editing.
 *
 * Columns match public.towns town_facts fields (plus slug / title).
 * Highlights are pipe-separated for easy spreadsheet editing.
 *
 * Usage:
 *   npx tsx scripts/export-town-facts-csv.ts
 *   npx tsx scripts/export-town-facts-csv.ts --file docs/town-facts.csv
 *   npx tsx scripts/export-town-facts-csv.ts --only-filled
 */

import { writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ONLY_FILLED = process.argv.includes("--only-filled");

function resolveOutputPath(): string {
  const fileIdx = process.argv.indexOf("--file");
  if (fileIdx === -1) return "docs/town-facts.csv";
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

const HEADERS = [
  "slug",
  "title",
  "at_a_glance_description",
  "walkability_rating",
  "walkability_subtext",
  "beach_type",
  "beach_type_subtext",
  "dining_rating",
  "dining_subtext",
  "getting_around_summary",
  "getting_around_subtext",
  "highlights",
  "beach_access_details",
  "getting_around_details",
  "dining_town_center_details",
  "parking_details",
] as const;

type TownFactsExportRow = {
  slug: string;
  title: string | null;
  at_a_glance_description: string | null;
  walkability_rating: string | null;
  walkability_subtext: string | null;
  beach_type: string | null;
  beach_type_subtext: string | null;
  dining_rating: string | null;
  dining_subtext: string | null;
  getting_around_summary: string | null;
  getting_around_subtext: string | null;
  highlights: string[] | null;
  beach_access_details: string | null;
  getting_around_details: string | null;
  dining_town_center_details: string | null;
  parking_details: string | null;
};

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

function formatHighlights(value: string[] | null | undefined): string {
  if (!value?.length) return "";
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" | ");
}

function text(value: string | null | undefined): string {
  return typeof value === "string" ? value : "";
}

function hasAnyFacts(row: TownFactsExportRow): boolean {
  return Boolean(
    text(row.at_a_glance_description) ||
      text(row.walkability_rating) ||
      text(row.beach_type) ||
      text(row.dining_rating) ||
      text(row.getting_around_summary) ||
      (row.highlights?.length ?? 0) > 0 ||
      text(row.beach_access_details) ||
      text(row.getting_around_details) ||
      text(row.dining_town_center_details) ||
      text(row.parking_details),
  );
}

function mapRow(row: TownFactsExportRow): Record<string, string> {
  return {
    slug: row.slug ?? "",
    title: text(row.title),
    at_a_glance_description: text(row.at_a_glance_description),
    walkability_rating: text(row.walkability_rating),
    walkability_subtext: text(row.walkability_subtext),
    beach_type: text(row.beach_type),
    beach_type_subtext: text(row.beach_type_subtext),
    dining_rating: text(row.dining_rating),
    dining_subtext: text(row.dining_subtext),
    getting_around_summary: text(row.getting_around_summary),
    getting_around_subtext: text(row.getting_around_subtext),
    highlights: formatHighlights(row.highlights),
    beach_access_details: text(row.beach_access_details),
    getting_around_details: text(row.getting_around_details),
    dining_town_center_details: text(row.dining_town_center_details),
    parking_details: text(row.parking_details),
  };
}

async function main() {
  const pageSize = 1000;
  const rows: TownFactsExportRow[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("towns")
      .select(
        [
          "slug",
          "title",
          "at_a_glance_description",
          "walkability_rating",
          "walkability_subtext",
          "beach_type",
          "beach_type_subtext",
          "dining_rating",
          "dining_subtext",
          "getting_around_summary",
          "getting_around_subtext",
          "highlights",
          "beach_access_details",
          "getting_around_details",
          "dining_town_center_details",
          "parking_details",
        ].join(", "),
      )
      .order("title", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Failed to load towns:", error.message);
      process.exit(1);
    }

    const batch = (data ?? []) as TownFactsExportRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  const filtered = ONLY_FILLED ? rows.filter(hasAnyFacts) : rows;
  const mapped = filtered
    .map(mapRow)
    .sort((a, b) => a.title.localeCompare(b.title) || a.slug.localeCompare(b.slug));

  writeFileSync(OUTPUT_PATH, stringifyCsv(HEADERS, mapped), "utf8");
  console.log(
    `Wrote ${mapped.length} town(s) to ${OUTPUT_PATH}` +
      (ONLY_FILLED ? " (only rows with at-a-glance data)" : ""),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
