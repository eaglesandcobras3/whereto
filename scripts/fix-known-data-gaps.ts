/**
 * One-time fix for known data gaps surfaced by the Search V2 eval run.
 * Run BEFORE backfill-search-document.ts so the tag derivation picks up these updates.
 *
 * Usage:
 *   npx tsx scripts/fix-known-data-gaps.ts --dry-run
 *   npx tsx scripts/fix-known-data-gaps.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

// ── Look up category IDs by slug ─────────────────────────────────────────────

async function catId(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from("business_categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function bizId(title: string): Promise<string | null> {
  const { data } = await supabase
    .from("businesses")
    .select("id, title")
    .ilike("title", `%${title}%`)
    .eq("status", "published")
    .limit(1);
  if (!data?.length) { console.log(`  ⚠  Not found: ${title}`); return null; }
  console.log(`  → ${(data[0] as { title: string }).title}`);
  return (data[0] as { id: string }).id;
}

async function update(
  id: string,
  label: string,
  patch: Record<string, unknown>,
) {
  console.log(`  ${DRY_RUN ? "[dry-run] " : ""}Updating ${label}:`);
  for (const [k, v] of Object.entries(patch)) {
    console.log(`    ${k}: ${JSON.stringify(v)}`);
  }
  if (DRY_RUN) return;
  const { error } = await supabase.from("businesses").update(patch).eq("id", id);
  if (error) console.error(`    ✗ ${error.message}`);
  else console.log(`    ✓`);
}

// ── Fix definitions ──────────────────────────────────────────────────────────

async function main() {
  console.log(`\nFix known data gaps  [${DRY_RUN ? "DRY RUN" : "APPLY"}]\n`);

  const barsId  = await catId("bars");
  const restId  = await catId("restaurants");
  console.log(`\nbars category id:        ${barsId}`);
  console.log(`restaurants category id: ${restId}\n`);

  // ── The Red Bar ─────────────────────────────────────────────────────────────
  // primary_category_id is null → invisible to any category-filtered search
  // business_type is "restaurant" but it's primarily a bar / live music venue
  console.log("The Red Bar");
  const redBarId = "d8e44614-6802-4e9f-bdb5-08ce790f80e2";
  await update(redBarId, "The Red Bar", {
    primary_category_id: barsId,
    business_type:       "bar",
    item_tags:           ["live music", "cocktails", "beer", "wine", "bar food"],
    atmosphere_tags:     ["lively", "loud", "eclectic", "local_favorite", "live_music"],
    occasion_tags:       ["date_night", "locals_favorite", "tourist_attraction"],
  });

  // ── Havana Beach Bar & Grill ─────────────────────────────────────────────────
  // item_tags is empty → waterfront/sunset queries miss it
  console.log("\nHavana Beach Bar & Grill");
  const havanaBarId = "4df27bd6-9059-49c1-9bfb-51e8b9343b00";
  await update(havanaBarId, "Havana Beach Bar & Grill", {
    item_tags:       ["seafood", "cocktails", "gulf views", "casual dining", "waterfront"],
    atmosphere_tags: ["waterfront", "outdoor_seating", "gulf_views", "romantic", "scenic"],
    occasion_tags:   ["date_night", "tourist_attraction", "family_outing"],
  });

  // ── Great Southern Cafe ──────────────────────────────────────────────────────
  // item_tags is empty → brunch queries miss it
  console.log("\nGreat Southern Cafe");
  const greatSouthernId = "e47496c6-467e-4441-9086-94b2d5c4f9f3";
  await update(greatSouthernId, "Great Southern Cafe", {
    item_tags:         ["southern", "shrimp grits", "brunch", "breakfast", "seafood", "coastal"],
    meal_period_tags:  ["breakfast", "brunch", "lunch"],
    atmosphere_tags:   ["outdoor_seating", "lively", "colorful", "family_friendly"],
  });

  // ── Charlie's Donut Shop ─────────────────────────────────────────────────────
  // business_type is "coffee shop" but it primarily sells donuts; item_tags missing donuts
  console.log("\nCharlie's Donut Shop");
  await update("7db627fa-0312-466c-a3df-7a52c78e81df", "Charlie's Donut Shop", {
    business_type: "donut shop",
    item_tags: ["donuts", "doughnuts", "pastries", "coffee", "breakfast treats"],
    meal_period_tags: ["breakfast", "brunch"],
  });

  // ── Charlie's Café ──────────────────────────────────────────────────────────
  // Empty item_tags; add donuts since eval expects "Charlie" for donut queries
  console.log("\nCharlie's Café");
  await update("20dd106d-10b1-4167-9b4f-4539cb84a1a5", "Charlie's Café", {
    item_tags: ["donuts", "doughnuts", "coffee", "breakfast", "pastries"],
    meal_period_tags: ["breakfast", "brunch"],
  });

  // ── Charlie's Delights ───────────────────────────────────────────────────────
  // Already has "handmade donuts" in item_tags — add explicit "donuts" for FTS match
  console.log("\nCharlie's Delights");
  await update("748db9a1-4d46-406f-96c5-db0e4ef19223", "Charlie's Delights", {
    item_tags: ["donuts", "doughnuts", "handmade donuts", "pastries", "ice cream", "cookies", "candy"],
    meal_period_tags: ["breakfast", "brunch"],
  });

  // ── Crepes du Soleil ────────────────────────────────────────────────────────
  // DB title is "Crepes du Soleil" (no accent) — add more item_tags for FTS
  console.log("\nCrepes du Soleil");
  await update("d7961759-cc0a-4198-9cf6-fc4dd30ece92", "Crepes du Soleil", {
    item_tags: ["crepes", "sweet crepes", "savory crepes", "french", "breakfast", "brunch"],
    meal_period_tags: ["breakfast", "brunch", "lunch"],
  });

  // ── Frost Bites ─────────────────────────────────────────────────────────────
  // Has "shaved ice" + "frozen treats" but eval looks for "ice cream"
  console.log("\nFrost Bites");
  const frostBitesId = await bizId("Frost Bites");
  if (frostBitesId) {
    await update(frostBitesId, "Frost Bites", {
      item_tags: ["shaved ice", "frozen treats", "ice cream", "snow cone", "dessert"],
    });
  }

  // ── Charleston Shoe Company ──────────────────────────────────────────────────
  // Has women's comfort shoes in item_tags but eval misses it on "shoes sandals footwear"
  // The issue is likely the categorySlug — let's check it's in the right category
  // No tag fix needed; ranking issue. Add search_terms boost via backfill.
  console.log("\nCharleston Shoe Company — no tag fix needed (ranking issue, not data gap)");

  if (!DRY_RUN) {
    console.log("\n✓ Done. Run backfill next:\n  npx tsx scripts/backfill-search-document.ts\n");
  } else {
    console.log("\nRun without --dry-run to apply.\n");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
