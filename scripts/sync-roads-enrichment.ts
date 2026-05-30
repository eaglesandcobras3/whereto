/**
 * Apply enrichment + content from docs/roads-deduped.csv to existing businesses.
 * Matches by slug, core slug, name, phone, website (same logic as dedupe import).
 *
 * Usage:
 *   npx tsx scripts/sync-roads-enrichment.ts           # dry-run
 *   npx tsx scripts/sync-roads-enrichment.ts --apply
 *   npx tsx scripts/sync-roads-enrichment.ts --apply --embeddings
 */

import { readFileSync } from "fs";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import {
  findExistingBusinessMatch,
  parseContact,
  type ExistingBusiness,
} from "../lib/admin/match-existing-business";

dotenv.config({ path: ".env.local" });

const CSV_PATH = "docs/roads-deduped.csv";
const APPLY = process.argv.includes("--apply");
const RUN_EMBEDDINGS = process.argv.includes("--embeddings");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type CsvRow = Record<string, string>;

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
  );
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

function buildPayload(row: CsvRow): Record<string, unknown> {
  const now = new Date().toISOString();
  const qa = row.qa_document?.trim() || null;
  const profile = row.search_profile?.trim() || null;
  const price = row.price_level?.trim();
  const { address, phone } = parseContact(row.contact_information);
  const website = row.website?.trim() || null;

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
    excerpt: row.excerpt?.trim() || null,
    seo_description: row.seo_description?.trim() || null,
    search_keywords: row.search_keywords?.trim() || null,
    content: row.markdown_writeup?.trim() || null,
    phone: phone || null,
    address: address || null,
    website,
    embedding_updated_at: null,
  };
  if (qa) payload.qa_document_updated_at = now;
  if (profile) payload.search_profile_updated_at = now;
  return payload;
}

function runEmbeddings() {
  console.log("\nRunning gap-only embeddings…");
  const r = spawnSync("npx", ["tsx", "local/generate-embeddings.ts"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    throw new Error(`generate-embeddings exited with ${r.status ?? "unknown"}`);
  }
}

async function main() {
  const csv = parseCsv(readFileSync(CSV_PATH, "utf8"));
  console.log(`Loaded ${csv.length} rows from ${CSV_PATH}\n`);

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select(
      "id, title, slug, phone, website, is_storefront, is_service_business, business_categories ( slug )",
    )
    .is("archived_at", null);

  if (error) throw error;

  const existing: ExistingBusiness[] = (businesses ?? []).map((b) => {
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

  let matched = 0;
  let unmatched = 0;
  let updated = 0;
  let failed = 0;
  const unmatchedSlugs: string[] = [];

  for (const row of csv) {
    const match = findExistingBusinessMatch(row as unknown as import("@/lib/admin/match-existing-business").DedupeCandidate, existing);
    if (!match) {
      unmatched++;
      unmatchedSlugs.push(row.slug);
      continue;
    }
    matched++;

    const payload = buildPayload(row);
    if (!APPLY) {
      if (matched <= 3) {
        console.log(`  [dry] ${row.title} → ${match.existing.slug} (${match.reason})`);
      }
      continue;
    }

    const { error: updateErr } = await supabase
      .from("businesses")
      .update(payload)
      .eq("id", match.existing.id);

    if (updateErr) {
      console.error(`  ✗ ${row.slug} → ${match.existing.slug}: ${updateErr.message}`);
      failed++;
    } else {
      updated++;
      if (updated % 50 === 0) console.log(`  … ${updated} updated`);
    }
  }

  console.log("\n--- Summary ---");
  console.log(`CSV rows: ${csv.length}`);
  console.log(`Matched: ${matched}`);
  console.log(`Unmatched: ${unmatched}`);
  if (unmatchedSlugs.length > 0 && unmatchedSlugs.length <= 10) {
    console.log(`Unmatched slugs: ${unmatchedSlugs.join(", ")}`);
  }
  console.log(APPLY ? `Updated: ${updated}, failed: ${failed}` : "Dry run — pass --apply to write");

  if (APPLY && RUN_EMBEDDINGS && updated > 0) {
    runEmbeddings();
  } else if (APPLY && updated > 0) {
    console.log("Run: npx tsx local/generate-embeddings.ts");
    console.log("Or re-run with --embeddings");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
