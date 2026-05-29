/**
 * Apply search enrichment fields from docs/stores2.csv to existing businesses (match by slug).
 *
 * Usage:
 *   npx tsx scripts/sync-stores2-enrichment.ts           # dry-run
 *   npx tsx scripts/sync-stores2-enrichment.ts --apply
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CSV_PATH = "docs/stores2.csv";
const APPLY = process.argv.includes("--apply");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type CsvRow = {
  slug: string;
  title: string;
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

function parseJsonArray(raw: string, field: string, slug: string): string[] {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed === "[]") return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) throw new Error("not an array");
    return parsed.map(String);
  } catch {
    throw new Error(`Invalid JSON in ${field} for slug ${slug}: ${trimmed.slice(0, 80)}`);
  }
}

function buildPayload(row: CsvRow): Record<string, unknown> {
  const now = new Date().toISOString();
  const qa = row.qa_document?.trim() || null;
  const profile = row.search_profile?.trim() || null;
  const price = row.price_level?.trim();
  const payload: Record<string, unknown> = {
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
  if (qa) payload.qa_document_updated_at = now;
  if (profile) payload.search_profile_updated_at = now;
  return payload;
}

async function main() {
  const csv = parseCsv(readFileSync(CSV_PATH, "utf8"));
  console.log(`Loaded ${csv.length} rows from ${CSV_PATH}`);

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("id, slug, title")
    .is("archived_at", null);

  if (error) throw error;

  const bySlug = new Map((businesses ?? []).map((b) => [b.slug, b]));
  let matched = 0;
  let missing = 0;
  let updated = 0;
  let failed = 0;

  const missingSlugs: string[] = [];

  for (const row of csv) {
    const biz = bySlug.get(row.slug);
    if (!biz) {
      missing++;
      missingSlugs.push(row.slug);
      continue;
    }
    matched++;

    const payload = buildPayload(row);
    if (!APPLY) {
      if (matched <= 3) {
        console.log(`  [dry] ${row.slug}:`, {
          business_type: payload.business_type,
          item_tags: (payload.item_tags as string[]).length,
          qa_len: (payload.qa_document as string)?.length ?? 0,
        });
      }
      continue;
    }

    const { error: updateErr } = await supabase
      .from("businesses")
      .update(payload)
      .eq("id", biz.id);

    if (updateErr) {
      console.error(`  ✗ ${row.slug}: ${updateErr.message}`);
      failed++;
    } else {
      updated++;
      if (updated % 50 === 0) console.log(`  … ${updated} updated`);
    }
  }

  console.log("\n--- Summary ---");
  console.log(`CSV rows: ${csv.length}`);
  console.log(`Matched in DB: ${matched}`);
  console.log(`Missing slug in DB: ${missing}`);
  if (missingSlugs.length > 0 && missingSlugs.length <= 15) {
    console.log("Missing:", missingSlugs.join(", "));
  } else if (missingSlugs.length > 15) {
    console.log("Missing (first 15):", missingSlugs.slice(0, 15).join(", "), "…");
  }
  console.log(APPLY ? `Updated: ${updated}, failed: ${failed}` : "Dry run — pass --apply to write");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
