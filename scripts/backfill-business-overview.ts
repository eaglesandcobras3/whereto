/**
 * Copy the overview / opening paragraph from businesses.content into businesses.overview.
 *
 * Deterministic only — no OpenAI, no content rewrites. Leaves `content` unchanged.
 *
 * Prerequisites:
 *   Apply scripts/migrations/businesses-overview.sql (adds `overview` column).
 *
 * Usage:
 *   npx tsx scripts/backfill-business-overview.ts --dry-run
 *   npx tsx scripts/backfill-business-overview.ts --apply
 *   npx tsx scripts/backfill-business-overview.ts --apply --force   # overwrite existing overview
 *   npx tsx scripts/backfill-business-overview.ts --apply --limit 20
 *   npx tsx scripts/backfill-business-overview.ts --apply --id <uuid>
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { extractOverviewFromContent } from "../lib/business/extract-overview";

dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run") || !process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const limitIdx = process.argv.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Math.max(1, Number(process.argv[limitIdx + 1]) || 0) : null;
const idIdx = process.argv.indexOf("--id");
const SINGLE_ID = idIdx >= 0 ? process.argv[idIdx + 1] : undefined;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type Row = {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  overview: string | null;
};

const PAGE = 100;
const SELECT = "id, title, slug, content, overview";

async function loadTargets(): Promise<Row[]> {
  const out: Row[] = [];

  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("businesses")
      .select(SELECT)
      .is("archived_at", null)
      .not("content", "is", null)
      .neq("content", "")
      .order("title")
      .range(from, from + PAGE - 1);

    if (SINGLE_ID) {
      q = supabase.from("businesses").select(SELECT).eq("id", SINGLE_ID);
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as Row[];
    if (batch.length === 0) break;

    for (const row of batch) {
      if (!FORCE && row.overview?.trim()) continue;
      out.push(row);
      if (LIMIT && out.length >= LIMIT) return out;
    }

    if (SINGLE_ID || batch.length < PAGE) break;
  }

  return out;
}

async function main() {
  console.log(`\nBackfill business overview  [${DRY_RUN ? "DRY RUN" : "APPLY"}${FORCE ? " · FORCE" : ""}]`);
  console.log("─".repeat(60));

  const rows = await loadTargets();
  console.log(`Candidates: ${rows.length}`);

  let updated = 0;
  let skippedEmpty = 0;
  let unchanged = 0;
  let errors = 0;

  for (const row of rows) {
    const overview = extractOverviewFromContent(row.content, row.title);
    if (!overview) {
      skippedEmpty++;
      continue;
    }

    if (row.overview === overview) {
      unchanged++;
      continue;
    }

    if (DRY_RUN) {
      const preview = overview.length > 120 ? `${overview.slice(0, 117)}...` : overview;
      console.log(`  · ${row.slug}: ${preview.replace(/\n/g, " / ")}`);
      updated++;
      continue;
    }

    const { error } = await supabase
      .from("businesses")
      .update({ overview })
      .eq("id", row.id);

    if (error) {
      console.error(`  ✗ ${row.slug}: ${error.message}`);
      errors++;
      continue;
    }

    updated++;
    if (updated % 50 === 0) console.log(`  … ${updated} written`);
  }

  console.log("─".repeat(60));
  console.log(
    `Done. ${DRY_RUN ? "Would update" : "Updated"}: ${updated} · no overview extractable: ${skippedEmpty} · already same: ${unchanged} · errors: ${errors}`,
  );
  if (DRY_RUN) console.log("Re-run with --apply to write.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
