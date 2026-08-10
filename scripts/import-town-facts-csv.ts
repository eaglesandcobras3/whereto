/**
 * Import town “at a glance” facts from a CSV (e.g. docs/updated-at-a-glance.csv).
 * Matches rows by `slug` and updates town_facts columns on public.towns.
 *
 * Highlights: pipe-separated (`A | B | C`) — same format as export-town-facts-csv.ts.
 *
 * Usage:
 *   npx tsx scripts/import-town-facts-csv.ts --file docs/updated-at-a-glance.csv
 *   npx tsx scripts/import-town-facts-csv.ts --file docs/updated-at-a-glance.csv --apply
 *
 * Dry-run by default.
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

function resolveCsvPath(): string {
  const fileIdx = process.argv.indexOf("--file");
  const path = fileIdx >= 0 ? process.argv[fileIdx + 1] : "docs/updated-at-a-glance.csv";
  if (!path) {
    console.error(
      "Usage: npx tsx scripts/import-town-facts-csv.ts --file path.csv [--apply]",
    );
    process.exit(1);
  }
  return path;
}

const CSV_PATH = resolveCsvPath();
const APPLY = process.argv.includes("--apply");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const FACT_COLUMNS = [
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

const REQUIRED_HEADERS = ["slug", ...FACT_COLUMNS] as const;

type CsvRow = Record<string, string>;

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
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
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      if (ch === "\r") i++;
      continue;
    }
    if (ch === "\r") {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.replace(/^\uFEFF/, "").trim());
  return rows.slice(1).map((cells) => {
    const out: CsvRow = {};
    for (let i = 0; i < headers.length; i++) {
      out[headers[i]] = (cells[i] ?? "").trim();
    }
    return out;
  });
}

function parseHighlights(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function highlightsEqual(a: string[] | null | undefined, b: string[]): boolean {
  const left = (a ?? []).map((x) => x.trim()).filter(Boolean);
  if (left.length !== b.length) return false;
  return left.every((item, i) => item === b[i]);
}

function buildPatch(csv: CsvRow): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const col of FACT_COLUMNS) {
    if (col === "highlights") {
      patch.highlights = parseHighlights(csv.highlights ?? "");
    } else {
      patch[col] = normalizeText(csv[col]);
    }
  }
  // Keep public town intro in sync with the stronger at-a-glance description.
  const glance = patch.at_a_glance_description as string | null;
  if (glance) patch.excerpt = glance;
  return patch;
}

function diffPatch(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
): string[] {
  const changed: string[] = [];
  for (const col of FACT_COLUMNS) {
    if (col === "highlights") {
      if (
        !highlightsEqual(
          existing.highlights as string[] | null,
          patch.highlights as string[],
        )
      ) {
        changed.push(col);
      }
      continue;
    }
    const before = normalizeText(existing[col] as string | null);
    const after = patch[col] as string | null;
    if (before !== after) changed.push(col);
  }
  if ("excerpt" in patch) {
    const before = normalizeText(existing.excerpt as string | null);
    const after = patch.excerpt as string | null;
    if (before !== after) changed.push("excerpt");
  }
  return changed;
}

async function main() {
  const raw = readFileSync(CSV_PATH, "utf8");
  const csvRows = parseCsv(raw);
  if (csvRows.length === 0) {
    console.error(`No data rows in ${CSV_PATH}`);
    process.exit(1);
  }

  const headers = Object.keys(csvRows[0]);
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    console.error(`CSV missing required columns: ${missingHeaders.join(", ")}`);
    process.exit(1);
  }

  console.log(`${APPLY ? "APPLY" : "DRY-RUN"} — ${csvRows.length} row(s) from ${CSV_PATH}`);

  let updated = 0;
  let unchanged = 0;
  let missing = 0;
  let failed = 0;

  for (const csv of csvRows) {
    const slug = (csv.slug ?? "").trim();
    if (!slug) {
      console.warn("  skip: empty slug");
      failed++;
      continue;
    }

    const { data: existing, error } = await supabase
      .from("towns")
      .select(["id", "slug", "title", "excerpt", ...FACT_COLUMNS].join(", "))
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error(`  ${slug}: load failed — ${error.message}`);
      failed++;
      continue;
    }
    if (!existing) {
      console.warn(`  ${slug}: no matching town`);
      missing++;
      continue;
    }

    const existingRow = existing as unknown as Record<string, unknown> & { id: string };
    const patch = buildPatch(csv);
    const changed = diffPatch(existingRow, patch);
    if (changed.length === 0) {
      console.log(`  ${slug}: unchanged`);
      unchanged++;
      continue;
    }

    console.log(`  ${slug}: would update [${changed.join(", ")}]`);
    if (!APPLY) {
      updated++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from("towns")
      .update(patch)
      .eq("id", existingRow.id);

    if (updateErr) {
      console.error(`  ${slug}: update failed — ${updateErr.message}`);
      failed++;
      continue;
    }
    console.log(`  ${slug}: updated`);
    updated++;
  }

  console.log(
    `\nDone. updated=${updated} unchanged=${unchanged} missing=${missing} failed=${failed}` +
      (APPLY ? "" : " (dry-run; pass --apply to write)"),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
