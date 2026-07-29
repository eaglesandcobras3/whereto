/**
 * Export search_tags_vocabulary to CSV.
 * Run: npx tsx scripts/export-business-tags-csv.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { writeFileSync } from "fs";

dotenv.config({ path: ".env.local" });

function csvEscape(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  const { data, error } = await supabase
    .from("search_tags_vocabulary")
    .select("tag, description")
    .order("tag", { ascending: true });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const rows = (data ?? []).map((r) =>
    [r.tag, r.description ?? ""]
      .map((x) => csvEscape(String(x)))
      .join(","),
  );

  const outPath = "docs/business-search-tags.csv";
  const csv = ["tag,description", ...rows].join("\n") + "\n";
  writeFileSync(outPath, csv);
  console.log(`Wrote ${rows.length} tags to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
