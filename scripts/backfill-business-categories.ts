/**
 * Backfill `primary_category_id` for published businesses that are missing one.
 *
 * For full search enrichment (profile, tags, embeddings), use:
 *   npx tsx scripts/backfill-business-enrichment.ts
 *
 * Usage:
 *   npx tsx scripts/backfill-business-categories.ts              # dry-run: report what would change
 *   npx tsx scripts/backfill-business-categories.ts --apply      # actually update rows
 *   npx tsx scripts/backfill-business-categories.ts --reinfer    # also fix wrong legacy categories (e.g. shopping → jewelry)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { inferCategorySlug } from "../lib/search/infer-business-metadata";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const APPLY = process.argv.includes("--apply");
const REINFER = process.argv.includes("--reinfer");

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}${REINFER ? " (reinfer)" : ""}\n`);

  // Load category slug → id map
  const { data: cats, error: catErr } = await supabase
    .from("business_categories")
    .select("id, slug, title");
  if (catErr || !cats?.length) {
    console.error("Could not load business_categories:", catErr?.message);
    process.exit(1);
  }
  const catSlugById = new Map(cats.map((c) => [c.id as string, c.slug as string]));
  const catBySlug = new Map(cats.map((c) => [c.slug as string, c.id as string]));
  console.log(`Loaded ${cats.length} categories\n`);

  // Load businesses
  const PAGE = 1000;
  let from = 0;
  const candidates: Array<{
    id: string;
    title: string;
    slug: string;
    business_type: string | null;
    excerpt: string | null;
    is_service_business: boolean;
    town_slug: string | null;
    primary_category_id: string | null;
    current_slug: string | null;
  }> = [];

  for (;;) {
    const { data, error } = await supabase
      .from("businesses")
      .select("id, title, slug, business_type, excerpt, is_service_business, primary_category_id, towns ( slug )")
      .is("archived_at", null)
      .eq("status", "published")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("Query error:", error.message);
      break;
    }
    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      const town = r.towns as { slug?: string } | null;
      const primaryId = (r.primary_category_id as string | null) ?? null;
      candidates.push({
        id: String(r.id),
        title: String(r.title ?? ""),
        slug: String(r.slug ?? ""),
        business_type: (r.business_type as string | null) ?? null,
        excerpt: (r.excerpt as string | null) ?? null,
        is_service_business: Boolean(r.is_service_business),
        town_slug: town?.slug ?? null,
        primary_category_id: primaryId,
        current_slug: primaryId ? (catSlugById.get(primaryId) ?? null) : null,
      });
    }
    if ((data?.length ?? 0) < PAGE) break;
    from += PAGE;
  }

  const missing = REINFER
    ? candidates
    : candidates.filter((b) => !b.primary_category_id);

  console.log(
    REINFER
      ? `Checking ${missing.length} published businesses for category fixes`
      : `Found ${missing.length} published businesses with NULL primary_category_id`,
  );
  console.log();
  if (missing.length === 0) {
    console.log("Nothing to backfill.");
    return;
  }

  let matched = 0;
  let unmatched = 0;
  let skipped = 0;
  let updated = 0;
  let failed = 0;

  const unmatchedRows: typeof missing = [];

  for (const biz of missing) {
    const slug = inferCategorySlug(
      biz.title,
      [biz.business_type, biz.excerpt].filter(Boolean).join(". ") || null,
      biz.is_service_business,
    );
    const catId = slug ? catBySlug.get(slug) ?? null : null;

    if (REINFER && biz.current_slug === slug) {
      skipped++;
      continue;
    }

    if (!catId) {
      if (!biz.primary_category_id) {
        unmatched++;
        unmatchedRows.push(biz);
      }
      continue;
    }

    if (REINFER && biz.primary_category_id && biz.current_slug !== slug) {
      matched++;
      const catTitle = cats.find((c) => c.id === catId)?.title ?? slug;
      console.log(
        `  ↻ ${biz.title} (${biz.slug}): ${biz.current_slug ?? "none"} → ${slug} (${catTitle})`,
      );
    } else if (!biz.primary_category_id) {
      matched++;
      const catTitle = cats.find((c) => c.id === catId)?.title ?? slug;
      console.log(`  ✓ ${biz.title} (${biz.slug}) → ${catTitle}`);
    } else {
      skipped++;
      continue;
    }

    if (APPLY) {
      const { error: updateErr } = await supabase
        .from("businesses")
        .update({ primary_category_id: catId })
        .eq("id", biz.id);
      if (updateErr) {
        console.error(`    FAILED: ${updateErr.message}`);
        failed++;
      } else {
        updated++;
      }
    }
  }

  console.log("\n── Summary ──");
  if (REINFER) {
    console.log(`Checked:                ${missing.length}`);
    console.log(`Would change / changed: ${matched}`);
    console.log(`Unchanged:              ${skipped}`);
  } else {
    console.log(`Total missing category: ${missing.length}`);
    console.log(`Matched by heuristic:   ${matched}`);
  }
  console.log(`Unmatched:              ${unmatched}`);
  if (APPLY) {
    console.log(`Updated:                ${updated}`);
    console.log(`Failed:                 ${failed}`);
  }

  if (unmatchedRows.length > 0) {
    console.log("\n── Unmatched (need manual assignment) ──");
    for (const biz of unmatchedRows) {
      console.log(
        `  ? ${biz.title} (${biz.slug})${biz.business_type ? ` [type: ${biz.business_type}]` : ""}${biz.town_slug ? ` in ${biz.town_slug}` : ""}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
