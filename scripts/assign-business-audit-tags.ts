/**
 * Prefer Gemini `audit_suggested_tags` (matched to vocab), then fill gaps with
 * keyword rules on title/category/excerpt/overview.
 *
 * Run after Gemini audit (and preferably after you've reviewed copy).
 * Overwrites search_tags for exists + skipped_verified rows. Leaves
 * cannot_confirm / closed / error rows unchanged.
 *
 * Usage:
 *   npx tsx scripts/assign-business-audit-tags.ts
 *   npx tsx scripts/assign-business-audit-tags.ts --file docs/businesses-audit-gemini.csv
 */

import { readFileSync, writeFileSync } from "fs";
import {
  assignTagsFromListingText,
  formatAuditTags,
} from "../lib/directory-audit/assign-tags-from-text";
import { parseCsv, stringifyCsv } from "../lib/directory-audit/csv";

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

const FILE = argValue("--file") ?? "docs/businesses-audit-gemini.csv";

function main() {
  const rows = parseCsv(readFileSync(FILE, "utf8"));
  if (rows.length === 0) {
    console.error(`No rows in ${FILE}`);
    process.exit(1);
  }
  const headers = Object.keys(rows[0] ?? {});
  let updated = 0;
  let skipped = 0;
  let empty = 0;

  for (const row of rows) {
    const status = row.audit_status?.trim() ?? "";
    if (status !== "exists" && status !== "skipped_verified") {
      skipped += 1;
      continue;
    }

    const tags = assignTagsFromListingText({
      title: row.title,
      category: row.category,
      excerpt: row.excerpt,
      overview: row.overview,
      search_keywords: row.search_keywords,
      suggested_tags: row.audit_suggested_tags,
    });
    row.search_tags = formatAuditTags(tags);
    updated += 1;
    if (tags.length === 0) empty += 1;
  }

  writeFileSync(FILE, stringifyCsv(headers, rows), "utf8");
  console.log(`Assigned tags on ${updated} rows (${empty} still empty), skipped ${skipped}`);
  console.log(`Wrote ${FILE}`);
}

main();
