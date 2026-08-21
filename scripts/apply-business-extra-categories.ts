/**
 * Apply reviewed extra-category suggestions (apply=yes rows).
 *
 *   npx tsx scripts/apply-business-extra-categories.ts --file tmp/suggested-extra-categories.csv
 *   npx tsx scripts/apply-business-extra-categories.ts --file tmp/suggested-extra-categories.csv --apply
 */

import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { parseCsv } from "../lib/directory-audit/csv";
import { replaceMemberships } from "../lib/categories/business-category-memberships";

dotenv.config({ path: ".env.local" });

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const file = argValue("--file");
  const apply = hasFlag("--apply");
  if (!file || !existsSync(file)) throw new Error(`Missing --file ${file ?? ""}`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: cats, error: catErr } = await supabase
    .from("business_categories")
    .select("id, slug, parent_category_id")
    .is("archived_at", null);
  if (catErr) throw new Error(catErr.message);
  const leafBySlug = new Map(
    (cats ?? [])
      .filter((c) => c.parent_category_id)
      .map((c) => [String(c.slug).toLowerCase(), String(c.id)]),
  );

  const rows = parseCsv(readFileSync(file, "utf8")).filter((r) =>
    ["yes", "true", "1"].includes((r.apply ?? "").trim().toLowerCase()),
  );
  console.log(`${rows.length} rows marked apply=yes (${apply ? "APPLY" : "dry-run"})`);

  for (const row of rows) {
    const businessId = (row.business_id ?? "").trim();
    if (!businessId) continue;
    const { data: biz, error } = await supabase
      .from("businesses")
      .select("id, primary_category_id, title")
      .eq("id", businessId)
      .maybeSingle();
    if (error || !biz) {
      console.warn(`skip ${businessId}: ${error?.message ?? "not found"}`);
      continue;
    }
    const primaryId = biz.primary_category_id ? String(biz.primary_category_id) : null;
    if (!primaryId) {
      console.warn(`skip ${biz.title}: no primary`);
      continue;
    }
    const extras = (row.suggested_extras ?? "")
      .split("|")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .map((slug) => leafBySlug.get(slug))
      .filter((id): id is string => Boolean(id));
    const categoryIds = [...new Set([primaryId, ...extras])].slice(0, 5);
    console.log(`${biz.title}: ${categoryIds.length} memberships`);
    if (apply) {
      await replaceMemberships(
        businessId,
        { primaryId, categoryIds },
        supabase as never,
      );
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
