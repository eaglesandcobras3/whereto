/**
 * Creates the "Fitness & Health" category and migrates fitness businesses
 * out of the coarse "activities" bucket.
 *
 * Why: "activities" contains both water sports/rentals AND fitness studios,
 * causing the category_fitness routing rule to return Power Movement for
 * boat-charter or water-sport queries (and vice versa). A dedicated category
 * lets routing be precise.
 *
 * Businesses moved: yoga studios, pilates, gyms, fitness studios.
 * Businesses left in activities: bike/paddleboard rentals, water sports,
 *   theaters, arcades, arcade-type venues.
 *
 * Run order:
 *   npx tsx scripts/migrate-fitness-category.ts --dry-run   # preview
 *   npx tsx scripts/migrate-fitness-category.ts             # apply
 *
 * After running: update SEARCH_V2 routing rule (category_fitness → "fitness")
 * and re-run backfill if search_tags need refreshing.
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

const FITNESS_TYPES = /yoga|pilates|fitness|gym|wellness studio/i;

async function main() {
  console.log(`\nMigrate fitness businesses → "Fitness & Health" category  [${DRY_RUN ? "DRY RUN" : "APPLY"}]\n`);

  // ── 1. Resolve or create the fitness category ──────────────────────────────
  let { data: existing } = await supabase
    .from("business_categories")
    .select("id, slug, title")
    .eq("slug", "fitness")
    .maybeSingle();

  let fitnessCatId: string;
  if (existing) {
    console.log(`✓ Category exists: ${existing.title} (${existing.id})`);
    fitnessCatId = existing.id as string;
  } else {
    console.log(`→ Creating "Fitness & Health" category (slug: fitness)`);
    if (!DRY_RUN) {
      const newId = randomUUID();
      const { data: created, error } = await supabase
        .from("business_categories")
        .insert({ id: newId, title: "Fitness & Health", slug: "fitness", status: "published" })
        .select("id")
        .single();
      if (error) throw new Error(`Create category: ${error.message}`);
      fitnessCatId = (created as { id: string }).id;
      console.log(`  Created id: ${fitnessCatId}`);
    } else {
      fitnessCatId = "<new-id>";
    }
  }

  // ── 2. Find activities category ────────────────────────────────────────────
  const { data: activitiesCat } = await supabase
    .from("business_categories")
    .select("id")
    .eq("slug", "activities")
    .maybeSingle();

  if (!activitiesCat) throw new Error("activities category not found");
  const activitiesId = (activitiesCat as { id: string }).id;

  // ── 3. Find fitness businesses currently in activities ─────────────────────
  const { data: candidates } = await supabase
    .from("businesses")
    .select("id, title, business_type")
    .eq("status", "published")
    .is("archived_at", null)
    .eq("primary_category_id", activitiesId);

  const toMove = ((candidates ?? []) as Array<{ id: string; title: string | null; business_type: string | null }>)
    .filter(b => FITNESS_TYPES.test(b.business_type ?? "") || FITNESS_TYPES.test(b.title ?? ""));

  console.log(`\nBusinesses to move (${toMove.length}):`);
  for (const b of toMove) {
    console.log(`  ${(b.title ?? "").padEnd(45)} | ${b.business_type ?? "—"}`);
  }

  if (toMove.length === 0) {
    console.log("  Nothing to move.");
    return;
  }

  if (!DRY_RUN) {
    const { error } = await supabase
      .from("businesses")
      .update({ primary_category_id: fitnessCatId })
      .in("id", toMove.map(b => b.id));
    if (error) throw new Error(`Update businesses: ${error.message}`);
    console.log(`\n✓ Moved ${toMove.length} businesses to "Fitness & Health".`);
    console.log(`\nNext steps:`);
    console.log(`  1. The category_fitness routing rule in data/search-query-rules.json`);
    console.log(`     already uses categorySlug: "fitness" — no code change needed.`);
    console.log(`  2. Run backfill if search_tags need refreshing:`);
    console.log(`     npx tsx scripts/backfill-search-document.ts`);
    console.log(`  3. (Optional) Re-embed affected businesses for semantic accuracy:`);
    console.log(`     npx tsx local/generate-embeddings.ts`);
  } else {
    console.log(`\nRun without --dry-run to apply.`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
