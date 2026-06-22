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
import {
  buildSearchDocumentFields,
  type SearchDocumentSource,
} from "../lib/search/derive-search-document";

dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH = 50;
const idArgIdx = process.argv.indexOf("--id");
const SINGLE_ID = idArgIdx >= 0 ? process.argv[idArgIdx + 1] : undefined;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

type BusinessRow = SearchDocumentSource & { id: string };

async function fetchPage(page: number): Promise<BusinessRow[]> {
  const select =
    "id, title, excerpt, business_type, search_keywords, item_tags, dietary_tags, atmosphere_tags, occasion_tags, meal_period_tags";

  if (SINGLE_ID) {
    const { data, error } = await supabase
      .from("businesses")
      .select(select)
      .eq("id", SINGLE_ID)
      .eq("status", "published")
      .is("archived_at", null);
    if (error) throw new Error(error.message);
    return (data ?? []) as BusinessRow[];
  }

  const { data, error } = await supabase
    .from("businesses")
    .select(select)
    .eq("status", "published")
    .is("archived_at", null)
    .range(page * BATCH, (page + 1) * BATCH - 1)
    .order("title");

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

    const updates: Array<{ id: string } & ReturnType<typeof buildSearchDocumentFields>> = [];

    for (const row of rows) {
      const fields = buildSearchDocumentFields(row);

      if (DRY_RUN) {
        console.log(`\n  ${row.title ?? row.id}`);
        console.log(`    search_tags:       [${fields.search_tags.join(", ")}]`);
        console.log(`    search_terms:      ${fields.search_terms.slice(0, 80)}`);
        console.log(`    embedding_summary: ${fields.embedding_summary.slice(0, 80)}...`);
      } else {
        updates.push({ id: row.id, ...fields });
      }
    }

    if (!DRY_RUN && updates.length > 0) {
      for (const u of updates) {
        const { error } = await supabase
          .from("businesses")
          .update({
            search_tags: u.search_tags,
            search_terms: u.search_terms,
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
