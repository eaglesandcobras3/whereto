/**
 * Move listings out of the legacy `services` business_category catch-all.
 *
 * Usage:
 *   npx tsx scripts/recategorize-services-bucket.ts           # dry-run
 *   npx tsx scripts/recategorize-services-bucket.ts --apply   # update DB
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { inferServicesBucketCategorySlug } from "../lib/business-categories/infer-services-bucket-category";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes("--apply");

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  const { data: servicesCat, error: catErr } = await supabase
    .from("business_categories")
    .select("id, slug")
    .eq("slug", "services")
    .maybeSingle();

  if (catErr || !servicesCat) {
    console.error("Could not load services category:", catErr?.message);
    process.exit(1);
  }

  const { data: cats, error: allCatErr } = await supabase
    .from("business_categories")
    .select("id, slug, title");
  if (allCatErr || !cats?.length) {
    console.error("Could not load categories:", allCatErr?.message);
    process.exit(1);
  }
  const catIdBySlug = new Map(cats.map((c) => [c.slug as string, c.id as string]));

  const { data: rows, error: bizErr } = await supabase
    .from("businesses")
    .select(
      "id, slug, title, excerpt, business_type, is_service_business, primary_category_id, service_categories ( slug )",
    )
    .eq("primary_category_id", servicesCat.id)
    .is("archived_at", null)
    .eq("status", "published")
    .order("title");

  if (bizErr) {
    console.error("Business query failed:", bizErr.message);
    process.exit(1);
  }

  const listings = rows ?? [];
  console.log(`Found ${listings.length} listings in services bucket\n`);

  const byTarget = new Map<string, number>();
  let updated = 0;
  let skipped = 0;

  for (const row of listings) {
    const r = row as Record<string, unknown>;
    const serviceCat = r.service_categories as { slug?: string } | null;
    const targetSlug = inferServicesBucketCategorySlug({
      slug: String(r.slug),
      title: String(r.title),
      excerpt: (r.excerpt as string | null) ?? null,
      business_type: (r.business_type as string | null) ?? null,
      is_service_business: Boolean(r.is_service_business),
      service_category_slug: serviceCat?.slug ?? null,
    });

    if (!targetSlug) {
      console.warn(`  SKIP (no target): ${r.title}`);
      skipped++;
      continue;
    }

    const targetId = catIdBySlug.get(targetSlug);
    if (!targetId) {
      console.warn(`  SKIP (unknown slug ${targetSlug}): ${r.title}`);
      skipped++;
      continue;
    }

    byTarget.set(targetSlug, (byTarget.get(targetSlug) ?? 0) + 1);
    const flag = r.is_service_business ? "SVC" : "STR";
    console.log(`  ${flag} ${String(r.title).slice(0, 50)} → ${targetSlug}`);

    if (APPLY) {
      const { error } = await supabase
        .from("businesses")
        .update({ primary_category_id: targetId })
        .eq("id", r.id);
      if (error) {
        console.error(`    FAILED ${r.slug}:`, error.message);
      } else {
        updated++;
      }
    }
  }

  console.log("\nTarget distribution:");
  for (const [slug, count] of [...byTarget.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(3)}  ${slug}`);
  }

  console.log(`\n${APPLY ? `Updated ${updated} rows` : `Would update ${listings.length - skipped} rows`}`);
  if (skipped) console.log(`Skipped: ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
