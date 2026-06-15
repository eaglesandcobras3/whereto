/**
 * Backfill search_tags, search_terms, and embedding_summary on published businesses.
 *
 * Derives all three fields from existing columns — does NOT change item_tags, embeddings,
 * or any other column. Human tag review (operator work) fills gaps that this script cannot.
 *
 * Usage:
 *   npx tsx scripts/backfill-search-document.ts --dry-run   # print changes, no writes
 *   npx tsx scripts/backfill-search-document.ts             # apply to staging/prod
 *   npx tsx scripts/backfill-search-document.ts --id <uuid> # single business
 *
 * Run after: supabase/migrations/20260614000000_search_document_v2.sql
 * Run before: supabase/migrations/20260614000200_search_businesses_v2.sql (Phase 3)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DRY_RUN  = process.argv.includes("--dry-run");
const BATCH    = 50;
const idArgIdx = process.argv.indexOf("--id");
const SINGLE_ID = idArgIdx >= 0 ? process.argv[idArgIdx + 1] : undefined;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

// ── Vocabulary tags inferred from business_type ───────────────────────────────
// Only emits tags that exist in search_tags_vocabulary so the CI check stays green.
// Operators must add remaining tags manually via admin.
const BUSINESS_TYPE_TAG_INFERENCES: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /coffee|cafe|espresso|latte/i,          tag: "coffee" },
  { pattern: /golf\s*course|golf\s*club|putting/i,   tag: "golf" },
  { pattern: /bookstore|book\s*store|book\s*shop/i,  tag: "books" },
  { pattern: /cart\s*rental|lsv\s*rental|mobility\s*rental/i, tag: "mobility_rental" },
];

type BusinessRow = {
  id: string;
  title: string | null;
  excerpt: string | null;
  business_type: string | null;
  search_keywords: string | null;
  item_tags: string[] | null;
  dietary_tags: string[] | null;
  atmosphere_tags: string[] | null;
  occasion_tags: string[] | null;
  meal_period_tags: string[] | null;
};

function deriveTags(row: BusinessRow): string[] {
  const tags = new Set<string>([
    ...(row.item_tags ?? []),
    ...(row.dietary_tags ?? []),
    ...(row.atmosphere_tags ?? []),
    ...(row.occasion_tags ?? []),
    ...(row.meal_period_tags ?? []),
  ].filter(Boolean));

  const bt = row.business_type ?? "";
  for (const { pattern, tag } of BUSINESS_TYPE_TAG_INFERENCES) {
    if (pattern.test(bt)) tags.add(tag);
  }

  // Also check title for mobility rental clues when business_type is generic
  if (/cart\s*rental|lsv\s*rental/i.test(row.title ?? "")) {
    tags.add("mobility_rental");
  }

  // Fallback: if no tags derived at all, split business_type into tokens so the
  // business is at least findable by its type. E.g. "fine dining restaurant" → ["fine", "dining", "restaurant"]
  if (tags.size === 0 && row.business_type) {
    row.business_type.toLowerCase().split(/[\s,]+/).filter(w => w.length > 3).forEach(w => tags.add(w));
  }

  return [...tags].filter(s => s.length > 0);
}

function deriveTerms(row: BusinessRow): string {
  const parts = [row.business_type, row.search_keywords].filter(Boolean) as string[];
  const tokens = parts.join(" ").split(/\s+/).filter(Boolean);
  return [...new Set(tokens)].join(" ");
}

function deriveSummary(row: BusinessRow): string {
  const parts = [row.title, row.excerpt].filter(Boolean) as string[];
  return parts.join(". ").slice(0, 500);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function fetchPage(page: number): Promise<BusinessRow[]> {
  const query = supabase
    .from("businesses")
    .select("id, title, excerpt, business_type, search_keywords, item_tags, dietary_tags, atmosphere_tags, occasion_tags, meal_period_tags")
    .eq("status", "published")
    .is("archived_at", null)
    .range(page * BATCH, (page + 1) * BATCH - 1)
    .order("title");

  if (SINGLE_ID) {
    const { data, error } = await supabase
      .from("businesses")
      .select("id, title, excerpt, business_type, search_keywords, item_tags, dietary_tags, atmosphere_tags, occasion_tags, meal_period_tags")
      .eq("id", SINGLE_ID)
      .eq("status", "published")
      .is("archived_at", null);
    if (error) throw new Error(error.message);
    return (data ?? []) as BusinessRow[];
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as BusinessRow[];
}

async function main() {
  console.log(`\nBackfill search document  [${DRY_RUN ? "DRY RUN" : "APPLY"}]`);
  console.log("─".repeat(60));

  let page = 0;
  let total = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const rows = await fetchPage(page);
    if (rows.length === 0) break;
    total += rows.length;

    const updates: Array<{ id: string; search_tags: string[]; search_terms: string; embedding_summary: string }> = [];

    for (const row of rows) {
      const search_tags      = deriveTags(row);
      const search_terms     = deriveTerms(row);
      const embedding_summary = deriveSummary(row);

      if (DRY_RUN) {
        console.log(`\n  ${row.title ?? row.id}`);
        console.log(`    search_tags:       [${search_tags.join(", ")}]`);
        console.log(`    search_terms:      ${search_terms.slice(0, 80)}`);
        console.log(`    embedding_summary: ${embedding_summary.slice(0, 80)}...`);
      } else {
        updates.push({ id: row.id, search_tags, search_terms, embedding_summary });
      }
    }

    if (!DRY_RUN && updates.length > 0) {
      for (const u of updates) {
        const { error } = await supabase
          .from("businesses")
          .update({
            search_tags:       u.search_tags,
            search_terms:      u.search_terms,
            embedding_summary: u.embedding_summary,
          })
          .eq("id", u.id);

        if (error) {
          console.error(`  ✗ ${u.id}: ${error.message}`);
          skipped++;
        } else {
          updated++;
          process.stdout.write(".");
        }
      }
    }

    if (SINGLE_ID || rows.length < BATCH) break;
    page++;
  }

  console.log(`\n\nDone. total=${total} updated=${updated} skipped=${skipped}`);

  if (DRY_RUN) {
    console.log("\nRun without --dry-run to apply.");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
