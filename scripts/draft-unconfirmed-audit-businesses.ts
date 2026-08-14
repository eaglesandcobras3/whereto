/**
 * Move all closed/cannot_confirm audit rows to draft in Supabase and remove
 * them from the audit CSVs (including Art of Things duplicate).
 *
 * Usage:
 *   npx tsx scripts/draft-unconfirmed-audit-businesses.ts --apply
 */

import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { parseCsv, stringifyCsv } from "../lib/directory-audit/csv";

dotenv.config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const GEMINI_PATH = "docs/businesses-audit-gemini.csv";
const EXPORT_PATH = "docs/businesses-audit.csv";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

function stripCsv(path: string, removeIds: Set<string>) {
  const rows = parseCsv(readFileSync(path, "utf8"));
  const headers = Object.keys(rows[0] ?? {});
  const kept = rows.filter((r) => !removeIds.has(r.id));
  writeFileSync(path, stringifyCsv(headers, kept), "utf8");
  console.log(`${path}: ${rows.length} → ${kept.length} (removed ${rows.length - kept.length})`);
}

async function main() {
  const geminiRows = parseCsv(readFileSync(GEMINI_PATH, "utf8"));
  const targets = geminiRows.filter((r) => {
    const status = r.audit_status?.trim();
    return (status === "closed" || status === "cannot_confirm") && Boolean(r.id?.trim());
  });
  const removeIds = new Set(targets.map((r) => r.id));

  console.log(`Draft closed/cannot_confirm  [${APPLY ? "APPLY" : "DRY RUN"}]`);
  console.log(`Targets: ${targets.length}`);
  for (const r of targets) {
    console.log(`  ${r.audit_status}  ${r.title}`);
  }

  if (!APPLY) {
    console.log("\nRe-run with --apply to draft in Supabase and strip CSVs.");
    return;
  }

  let ok = 0;
  const errors: string[] = [];
  for (const r of targets) {
    const { error } = await supabase.from("businesses").update({ status: "draft" }).eq("id", r.id);
    if (error) errors.push(`${r.title}: ${error.message}`);
    else ok += 1;
  }
  console.log(`\nSupabase draft updated: ${ok}; errors: ${errors.length}`);
  for (const e of errors.slice(0, 10)) console.log(`  ! ${e}`);

  stripCsv(GEMINI_PATH, removeIds);
  stripCsv(EXPORT_PATH, removeIds);

  writeFileSync(
    "docs/businesses-audit-closed-cannot-confirm.md",
    [
      "# Directory audit — closed & cannot_confirm",
      "",
      `All **${targets.length}** closed/cannot_confirm rows were moved to \`draft\` in Supabase`,
      `and removed from the audit CSVs on ${new Date().toISOString()}.`,
      "",
      "Includes Art of Things Seaside, FL (duplicate of The Art of Simple).",
      "",
      "## Drafted",
      "",
      ...targets.map((r) => `- \`${r.audit_status}\` ${r.title} (\`${r.id}\`)`),
      "",
    ].join("\n"),
  );
  writeFileSync("docs/businesses-audit-closed-cannot-confirm.csv", "audit_status,title,id\n");

  if (errors.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
