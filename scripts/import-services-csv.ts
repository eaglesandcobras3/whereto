/**
 * Import service businesses from a services/vendor CSV (same columns).
 * Deep dedupe against existing listings (slug, core slug, name, phone, website).
 *
 * Usage:
 *   npx tsx scripts/import-services-csv.ts                    # dry-run services.csv
 *   npx tsx scripts/import-services-csv.ts --vendors          # dry-run vendors.csv
 *   npx tsx scripts/import-services-csv.ts --file path.csv    # custom CSV
 *   npx tsx scripts/import-services-csv.ts --vendors --apply
 *   npx tsx scripts/import-services-csv.ts --vendors --apply --embeddings
 */

import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "fs";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import {
  parseContact,
  resolveServiceCsvCandidate,
  type DedupeMatch,
} from "../lib/admin/match-existing-business";

dotenv.config({ path: ".env.local" });

function resolveCsvPath(): { csvPath: string; reportPath: string; label: string } {
  const fileIdx = process.argv.indexOf("--file");
  if (fileIdx !== -1) {
    const p = process.argv[fileIdx + 1];
    if (!p) throw new Error("--file requires a path");
    const base = p.replace(/^.*\//, "").replace(/\.csv$/, "");
    return { csvPath: p, reportPath: `docs/${base}-import-report.md`, label: base };
  }
  if (process.argv.includes("--vendors")) {
    return {
      csvPath: "docs/vendors.csv",
      reportPath: "docs/vendors-import-report.md",
      label: "vendors",
    };
  }
  return {
    csvPath: "docs/services.csv",
    reportPath: "docs/services-import-report.md",
    label: "services",
  };
}

const { csvPath: CSV_PATH, reportPath: REPORT_PATH, label: CSV_LABEL } = resolveCsvPath();
const APPLY = process.argv.includes("--apply");
const RUN_EMBEDDINGS = process.argv.includes("--embeddings");
const REPORT = process.argv.includes("--report") || APPLY;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type CsvRow = {
  title: string;
  slug: string;
  town_or_area: string;
  shopping_area: string;
  category: string;
  description: string;
  excerpt: string;
  seo_title: string;
  seo_description: string;
  search_keywords: string;
  contact_information: string;
  website: string;
  source_url: string;
  markdown_writeup: string;
  business_type: string;
  item_tags: string;
  dietary_tags: string;
  meal_period_tags: string;
  atmosphere_tags: string;
  occasion_tags: string;
  qa_document: string;
  search_profile: string;
  price_level: string;
};

const TOWN_ALIASES: Record<string, string> = {
  Seagrove: "Seagrove Beach",
  WaterColor: "Watercolor",
  "Dune Allen Beach / Santa Rosa Beach": "Dune Allen Beach",
};

const FALLBACK_TOWN_TITLE = "Santa Rosa Beach";

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
    Object.fromEntries(header.map((h, idx) => [h, cells[idx] ?? ""])),
  ) as CsvRow[];
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveTownLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return FALLBACK_TOWN_TITLE;
  const first = trimmed.split(";")[0]?.split("/")[0]?.trim() ?? trimmed;
  return TOWN_ALIASES[first] ?? TOWN_ALIASES[trimmed] ?? first;
}

function parseJsonArray(raw: string, field: string, slug: string): string[] {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed === "[]") return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) throw new Error("not an array");
    return parsed.map(String);
  } catch {
    throw new Error(`Invalid JSON in ${field} for slug ${slug}`);
  }
}

function enrichmentFields(row: CsvRow): Record<string, unknown> {
  const now = new Date().toISOString();
  const qa = row.qa_document?.trim() || null;
  const profile = row.search_profile?.trim() || null;
  const price = row.price_level?.trim();
  const out: Record<string, unknown> = {
    business_type: row.business_type?.trim() || null,
    item_tags: parseJsonArray(row.item_tags, "item_tags", row.slug),
    dietary_tags: parseJsonArray(row.dietary_tags, "dietary_tags", row.slug),
    meal_period_tags: parseJsonArray(row.meal_period_tags, "meal_period_tags", row.slug),
    atmosphere_tags: parseJsonArray(row.atmosphere_tags, "atmosphere_tags", row.slug),
    occasion_tags: parseJsonArray(row.occasion_tags, "occasion_tags", row.slug),
    qa_document: qa,
    search_profile: profile,
    price_level: price && /^[1-4]$/.test(price) ? price : null,
  };
  if (qa) out.qa_document_updated_at = now;
  if (profile) out.search_profile_updated_at = now;
  return out;
}

function writeReport(
  duplicates: Array<{ row: CsvRow; match: DedupeMatch }>,
  rejected: CsvRow[],
  toInsert: CsvRow[],
) {
  const byReason = new Map<string, number>();
  for (const s of duplicates) {
    byReason.set(s.match.reason, (byReason.get(s.match.reason) ?? 0) + 1);
  }

  const lines = [
    `# ${CSV_LABEL} CSV import report`,
    "",
    `Source: \`${CSV_PATH}\``,
    "",
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## Summary",
    "",
    `| | Count |`,
    `| --- | --- |`,
    `| CSV rows | ${duplicates.length + rejected.length + toInsert.length} |`,
    `| Skipped (duplicate of existing listing) | ${duplicates.length} |`,
    `| Skipped (restaurant/storefront — not a service) | ${rejected.length} |`,
    `| To import as services | ${toInsert.length} |`,
    "",
    "## Duplicate match reasons",
    "",
    "| Reason | Count |",
    "| --- | --- |",
  ];
  for (const [reason, count] of [...byReason.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${reason} | ${count} |`);
  }
  lines.push(
    "",
    "## Duplicates (matched existing listing)",
    "",
    "| CSV title | CSV slug | Reason | Score | Existing title | Existing slug |",
    "| --- | --- | --- | --- | --- | --- |",
  );
  for (const { row, match } of duplicates) {
    lines.push(
      `| ${row.title.replace(/\|/g, "\\|")} | ${row.slug} | ${match.reason} | ${match.score.toFixed(2)} | ${match.existing.title.replace(/\|/g, "\\|")} | ${match.existing.slug} |`,
    );
  }
  lines.push(
    "",
    "## Rejected physical listings (restaurant/storefront/hotel/shop)",
    "",
    "| Title | Slug | Category | Business type |",
    "| --- | --- | --- | --- |",
  );
  for (const row of rejected) {
    lines.push(
      `| ${row.title.replace(/\|/g, "\\|")} | ${row.slug} | ${(row.category || "").replace(/\|/g, "\\|")} | ${(row.business_type || "").replace(/\|/g, "\\|")} |`,
    );
  }
  writeFileSync(REPORT_PATH, lines.join("\n") + "\n");
  console.log(`Wrote ${REPORT_PATH}`);
}

function runEmbeddingsAfterImport() {
  console.log("\nRunning embeddings for rows missing embedding_updated_at…");
  const r = spawnSync("npx", ["tsx", "scripts/generate-business-embeddings.ts", "--apply"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    throw new Error(`generate-business-embeddings exited with ${r.status ?? "unknown"}`);
  }
}

async function main() {
  const csv = parseCsv(readFileSync(CSV_PATH, "utf8"));
  console.log(`Loaded ${csv.length} rows from ${CSV_PATH}\n`);

  const [{ data: businesses, error: bErr }, { data: towns, error: tErr }, { data: cats, error: cErr }] =
    await Promise.all([
      supabase
        .from("businesses")
        .select(
          "id, title, slug, phone, website, is_storefront, is_service_business, business_categories ( slug )",
        )
        .is("archived_at", null),
      supabase.from("towns").select("id, title, slug"),
      supabase.from("business_categories").select("id, slug"),
    ]);

  if (bErr || tErr || cErr || !businesses || !towns || !cats) {
    throw bErr ?? tErr ?? cErr ?? new Error("fetch failed");
  }

  const servicesCat = cats.find((c) => c.slug === "services");
  if (!servicesCat) throw new Error('business_categories slug "services" not found');

  const townByTitle = new Map(towns.map((t) => [norm(t.title), t]));
  const fallbackTown = townByTitle.get(norm(FALLBACK_TOWN_TITLE));
  if (!fallbackTown) throw new Error(`Fallback town "${FALLBACK_TOWN_TITLE}" not found`);

  const existing = (businesses ?? []).map((b) => {
    const cat = b.business_categories as { slug?: string } | { slug?: string }[] | null;
    const c = Array.isArray(cat) ? cat[0] : cat;
    return {
      id: b.id,
      title: b.title,
      slug: b.slug,
      phone: b.phone,
      website: b.website,
      is_storefront: b.is_storefront,
      is_service_business: b.is_service_business,
      category_slug: c?.slug ?? null,
    };
  });

  const duplicates: Array<{ row: CsvRow; match: DedupeMatch }> = [];
  const rejected: CsvRow[] = [];
  const toInsert: CsvRow[] = [];

  for (const row of csv) {
    const resolution = resolveServiceCsvCandidate(
      {
        title: row.title,
        slug: row.slug,
        contact_information: row.contact_information,
        website: row.website,
        business_type: row.business_type,
        category: row.category,
      },
      existing,
    );
    if (resolution.action === "duplicate") {
      duplicates.push({ row, match: resolution.match });
      continue;
    }
    if (resolution.action === "reject") {
      rejected.push(row);
      continue;
    }
    toInsert.push(row);
  }

  const byReason = new Map<string, number>();
  for (const { match } of duplicates) {
    byReason.set(match.reason, (byReason.get(match.reason) ?? 0) + 1);
  }

  console.log("--- Summary ---");
  console.log(`CSV rows: ${csv.length}`);
  console.log(`Skipped (duplicate of storefront): ${duplicates.length}`);
  for (const [reason, count] of [...byReason.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason}: ${count}`);
  }
  console.log(`Skipped (physical listing, not a service): ${rejected.length}`);
  console.log(`To insert as services: ${toInsert.length}`);

  if (duplicates.length > 0) {
    console.log("\nSample duplicates:");
    for (const { row, match } of duplicates.slice(0, 8)) {
      console.log(
        `  ${row.title} → ${match.existing.title} [${match.reason} ${match.score.toFixed(2)}]`,
      );
    }
  }
  if (rejected.length > 0) {
    console.log("\nSample rejected physical:");
    for (const row of rejected.slice(0, 8)) {
      console.log(`  ${row.title} (${row.business_type || row.category})`);
    }
  }

  if (REPORT) writeReport(duplicates, rejected, toInsert);

  console.log(APPLY ? "\nMode: APPLY" : "\nDry run — pass --apply to write");

  if (!APPLY || toInsert.length === 0) return;

  const batchSize = 25;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize).map((row) => {
      const csvTownLabel = row.town_or_area?.trim() || "";
      const primaryTownLabel =
        csvTownLabel.split(";")[0]?.split("/")[0]?.trim() || "";
      const resolvedTitle = resolveTownLabel(primaryTownLabel || csvTownLabel);
      const town = townByTitle.get(norm(resolvedTitle)) ?? fallbackTown;
      const { address, phone } = parseContact(row.contact_information);
      const website = row.website?.trim() || null;
      const now = new Date().toISOString();

      return {
        id: randomUUID(),
        title: row.title,
        slug: row.slug,
        status: "published",
        town_id: town.id,
        area_id: null,
        primary_category_id: servicesCat.id,
        excerpt: row.excerpt?.trim() || row.description?.trim()?.slice(0, 300) || null,
        seo_title: row.seo_title?.trim() || null,
        seo_description: row.seo_description?.trim() || row.description?.trim() || null,
        search_keywords: row.search_keywords?.trim() || null,
        content: row.markdown_writeup?.trim() || null,
        phone,
        address,
        website,
        service_area: primaryTownLabel || null,
        is_storefront: false,
        is_service_business: true,
        claim_status: "unclaimed",
        published_at: now,
        ...enrichmentFields(row),
      };
    });

    const { error } = await supabase.from("businesses").insert(batch);
    if (error) throw new Error(`insert batch ${i}: ${error.message}`);
    inserted += batch.length;
    console.log(`  inserted ${inserted} / ${toInsert.length}`);
  }

  console.log(`\nInserted ${inserted} service listings (category: services).`);

  if (RUN_EMBEDDINGS) {
    runEmbeddingsAfterImport();
  } else {
    console.log("Run: npx tsx scripts/generate-business-embeddings.ts --apply");
    console.log("Or re-run with --embeddings to import + embed in one step.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
