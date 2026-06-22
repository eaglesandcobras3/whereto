#!/usr/bin/env tsx
/**
 * Pull completed RankScore articles into public.guides.
 *
 * Usage:
 *   npm run sync:rankscore              # sync new/updated articles
 *   npm run sync:rankscore -- --dry-run # preview without DB writes
 *   npm run sync:rankscore -- --limit 5 # cap articles scanned from RankScore
 */

import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { getRankScoreConfig } from "../lib/rankscore/config";
import { syncRankScoreGuides } from "../lib/rankscore/sync-guides";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitIdx = process.argv.indexOf("--limit");
  const maxArticles =
    limitIdx !== -1 ? Number(process.argv[limitIdx + 1]) : undefined;

  if (limitIdx !== -1 && (!Number.isFinite(maxArticles) || maxArticles! <= 0)) {
    console.error("--limit requires a positive number");
    process.exit(1);
  }

  if (!getRankScoreConfig()) {
    console.error("Missing RANKSCORE_API_BASE or RANKSCORE_API_KEY");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(
    dryRun
      ? "RankScore → guides sync (dry run)\n"
      : "RankScore → guides sync\n",
  );

  const result = await syncRankScoreGuides(supabase, { dryRun, maxArticles });

  console.log(`Scanned:  ${result.scanned}`);
  console.log(`Fetched:  ${result.fetched}`);
  console.log(`Created:  ${result.created}`);
  console.log(`Updated:  ${result.updated}`);
  console.log(`Skipped:  ${result.skipped}`);
  if (result.errors.length) {
    console.log(`Errors:   ${result.errors.length}`);
    for (const err of result.errors) console.log(`  - ${err}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
