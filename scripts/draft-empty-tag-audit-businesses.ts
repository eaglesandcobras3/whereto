/**
 * Draft the two empty-tag audit rows and remove them from audit CSVs.
 *
 * Usage:
 *   npx tsx scripts/draft-empty-tag-audit-businesses.ts --apply
 */

import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { parseCsv, stringifyCsv } from "../lib/directory-audit/csv";

dotenv.config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const TITLES = new Set(["Panhandle Assistant Care", "Walton County Tourism Department"]);
const GEMINI_PATH = "docs/businesses-audit-gemini.csv";
const EXPORT_PATH = "docs/businesses-audit.csv";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const rows = parseCsv(readFileSync(GEMINI_PATH, "utf8"));
  const targets = rows.filter((r) => TITLES.has((r.title || "").trim()) && Boolean(r.id?.trim()));
  console.log(`Draft empty-tag listings  [${APPLY ? "APPLY" : "DRY RUN"}]`);
  console.log(`Targets: ${targets.length}`);
  for (const r of targets) {
    console.log(`  ${r.title} (${r.id}) tags="${r.search_tags || ""}"`);
  }
  if (targets.length !== 2) {
    console.error("Expected exactly 2 targets");
    process.exit(1);
  }
  if (!APPLY) {
    console.log("\nRe-run with --apply to draft in Supabase and strip CSVs.");
    return;
  }

  for (const r of targets) {
    const { error } = await supabase.from("businesses").update({ status: "draft" }).eq("id", r.id);
    if (error) {
      console.error(`! ${r.title}: ${error.message}`);
      process.exit(1);
    }
  }
  console.log("Supabase: both set to draft");

  const removeIds = new Set(targets.map((r) => r.id));
  for (const path of [GEMINI_PATH, EXPORT_PATH]) {
    const all = parseCsv(readFileSync(path, "utf8"));
    const headers = Object.keys(all[0] ?? {});
    const kept = all.filter((r) => !removeIds.has(r.id));
    writeFileSync(path, stringifyCsv(headers, kept), "utf8");
    console.log(`${path}: ${all.length} → ${kept.length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
