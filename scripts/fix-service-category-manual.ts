/**
 * One-off: assign specialty for listings the batch classifier skipped.
 *   npx tsx scripts/fix-service-category-manual.ts
 *   npx tsx scripts/fix-service-category-manual.ts --apply
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");

const FIXES: Array<{ titlePattern: string; slug: string }> = [
  { titlePattern: "Clark Partington", slug: "legal" },
  { titlePattern: "Gentiva Hospice", slug: "health_medical" },
  { titlePattern: "James Sater", slug: "insurance" },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const supabase = createClient(url, key);

  const { data: cats, error: cErr } = await supabase
    .from("service_categories")
    .select("id, slug")
    .is("archived_at", null)
    .eq("status", "published");
  if (cErr) throw cErr;
  const bySlug = new Map((cats ?? []).map((c) => [c.slug, c.id]));

  for (const fix of FIXES) {
    const catId = bySlug.get(fix.slug);
    if (!catId) {
      console.error(`Category slug not in DB: ${fix.slug} — apply migrations first.`);
      process.exit(1);
    }
    const { data: rows, error: fErr } = await supabase
      .from("businesses")
      .select("id, title, service_category_id, service_categories ( slug )")
      .ilike("title", `%${fix.titlePattern}%`)
      .eq("is_service_business", true)
      .is("archived_at", null);
    if (fErr) throw fErr;
    if (!rows?.length) {
      console.warn(`No listing matched: ${fix.titlePattern}`);
      continue;
    }
    for (const row of rows) {
      const sc = row.service_categories as { slug?: string } | { slug?: string }[] | null;
      const current = Array.isArray(sc) ? sc[0]?.slug : sc?.slug;
      console.log(
        `${APPLY ? "APPLY" : "DRY"} ${row.title}: ${current ?? "(none)"} → ${fix.slug}`,
      );
      if (APPLY) {
        const { error } = await supabase
          .from("businesses")
          .update({ service_category_id: catId })
          .eq("id", row.id);
        if (error) throw error;
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
