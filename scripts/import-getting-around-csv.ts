/**
 * Import inter-town “getting around” copy from docs/getting_around.csv
 * into the top-row Getting Around metric (summary + subtext).
 * Also clears unused detail-card fields: beach_access_details, getting_around_details.
 *
 * Usage:
 *   npx tsx scripts/import-getting-around-csv.ts --file docs/getting_around.csv
 *   npx tsx scripts/import-getting-around-csv.ts --file docs/getting_around.csv --apply
 *
 * Dry-run by default.
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

function resolveCsvPath(): string {
  const fileIdx = process.argv.indexOf("--file");
  const path = fileIdx >= 0 ? process.argv[fileIdx + 1] : "docs/getting_around.csv";
  if (!path) {
    console.error(
      "Usage: npx tsx scripts/import-getting-around-csv.ts --file path.csv [--apply]",
    );
    process.exit(1);
  }
  return path;
}

const CSV_PATH = resolveCsvPath();
const APPLY = process.argv.includes("--apply");

const TITLE_TO_SLUG: Record<string, string> = {
  Seaside: "seaside",
  "Rosemary Beach": "rosemary-beach",
  "Alys Beach": "alys-beach",
  WaterColor: "watercolor",
  Watersound: "watersound",
  WaterSound: "watersound",
  "Grayton Beach": "grayton-beach",
  "Santa Rosa Beach": "santa-rosa-beach",
  Sandestin: "sandestin",
  "Inlet Beach": "inlet-beach",
  "Seacrest Beach": "seacrest-beach",
  "Seagrove Beach": "seagrove-beach",
  "Blue Mountain Beach": "blue-mountain-beach",
  "Gulf Place": "gulf-place",
  "Dune Allen Beach": "dune-allen-beach",
  "Carillon Beach": "carillon-beach",
  "Miramar Beach": "miramar-beach",
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** "Walk / Bike" → "Walk • Bike" to match existing metric style. */
function normalizeSummary(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" • ");
}

async function main() {
  const raw = readFileSync(CSV_PATH, "utf8");
  const csvRows = parseCsv(raw);
  if (csvRows.length === 0) {
    console.error(`No data rows in ${CSV_PATH}`);
    process.exit(1);
  }

  const required = ["town", "getting_to_other_30a_towns", "getting_around_description"];
  const headers = Object.keys(csvRows[0]);
  const missingHeaders = required.filter((h) => !headers.includes(h));
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
    const title = (csv.town ?? "").trim();
    const slug = TITLE_TO_SLUG[title];
    if (!slug) {
      console.warn(`  skip: unknown town title ${JSON.stringify(title)}`);
      failed++;
      continue;
    }

    const patch = {
      getting_around_summary: normalizeSummary(csv.getting_to_other_30a_towns ?? ""),
      // Description belongs on the top-row Getting Around metric subtext.
      getting_around_subtext: normalizeText(csv.getting_around_description),
      // Detail-card fields are unused; clear them.
      getting_around_details: null as string | null,
      beach_access_details: null as string | null,
    };

    const { data: existing, error } = await supabase
      .from("towns")
      .select(
        "id, slug, title, getting_around_summary, getting_around_subtext, getting_around_details, beach_access_details",
      )
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

    const before = {
      getting_around_summary: normalizeText(existing.getting_around_summary),
      getting_around_subtext: normalizeText(existing.getting_around_subtext),
      getting_around_details: normalizeText(existing.getting_around_details),
      beach_access_details: normalizeText(existing.beach_access_details),
    };
    const changed = (
      Object.keys(patch) as Array<keyof typeof patch>
    ).filter((key) => before[key] !== patch[key]);

    if (changed.length === 0) {
      console.log(`  ${slug}: unchanged`);
      unchanged++;
      continue;
    }

    console.log(`  ${slug}: would update [${changed.join(", ")}]`);
    console.log(`    summary: ${JSON.stringify(patch.getting_around_summary)}`);
    if (!APPLY) {
      updated++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from("towns")
      .update(patch)
      .eq("id", existing.id);

    if (updateErr) {
      console.error(`  ${slug}: update failed — ${updateErr.message}`);
      failed++;
      continue;
    }
    console.log(`  ${slug}: updated`);
    updated++;
  }

  // Clear leftover detail-card fields on any other towns not in this CSV.
  const { data: leftovers, error: leftoverErr } = await supabase
    .from("towns")
    .select("id, slug, beach_access_details, getting_around_details")
    .or("beach_access_details.not.is.null,getting_around_details.not.is.null");

  if (leftoverErr) {
    console.error(`leftover clear failed — ${leftoverErr.message}`);
    failed++;
  } else {
    const csvSlugs = new Set(
      csvRows
        .map((r) => TITLE_TO_SLUG[(r.town ?? "").trim()])
        .filter(Boolean),
    );
    for (const row of leftovers ?? []) {
      if (csvSlugs.has(row.slug)) continue;
      const hasBeach = normalizeText(row.beach_access_details);
      const hasAround = normalizeText(row.getting_around_details);
      if (!hasBeach && !hasAround) continue;
      console.log(`  ${row.slug}: would clear leftover detail fields`);
      if (!APPLY) {
        updated++;
        continue;
      }
      const { error: clearErr } = await supabase
        .from("towns")
        .update({ beach_access_details: null, getting_around_details: null })
        .eq("id", row.id);
      if (clearErr) {
        console.error(`  ${row.slug}: clear failed — ${clearErr.message}`);
        failed++;
        continue;
      }
      console.log(`  ${row.slug}: cleared detail fields`);
      updated++;
    }
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
