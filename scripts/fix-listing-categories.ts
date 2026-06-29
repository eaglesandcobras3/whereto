/**
 * One-off listing category corrections (slug → business_categories.slug).
 *
 * Usage:
 *   npx tsx scripts/fix-listing-categories.ts
 *   npx tsx scripts/fix-listing-categories.ts --apply
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes("--apply");

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/** Ensure rows exist before applying business updates. */
const ENSURE_CATEGORIES: Array<{ slug: string; title: string }> = [
  { slug: "events", title: "Events & venues" },
];

const LISTING_CATEGORY_FIXES: Record<string, string> = {
  "rosemary-beach-town-hall": "events",
  "playa-bowls-rosemary-beach": "desserts",
  "playa-bowls-watercolor": "desserts",
  "marble-slab-creamery-watercolor": "ice_cream",
  "marble-slab-creamery-30avenue": "ice_cream",
  "bote-grayton-beach-fl": "shopping",
  "adaro-art-watersound": "shopping",
  "paradise-fitness": "fitness",
  "lagree-30a": "fitness",
  "grand-fitness": "fitness",
  "ascension-sacred-heart-primary-care-watersound": "medical_clinics",
};

async function ensureCategory(slug: string, title: string): Promise<string> {
  const { data: existing } = await supabase
    .from("business_categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing?.id) return String(existing.id);

  if (!APPLY) {
    console.log(`Would create business_categories: ${slug} (${title})`);
    return `dry-run-${slug}`;
  }

  const id = randomUUID();
  const { data: created, error } = await supabase
    .from("business_categories")
    .insert({ id, status: "published", title, slug, is_hidden_from_search: false })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create ${slug}: ${error?.message}`);
  }

  console.log(`Created business_categories: ${slug}`);
  return String(created.id);
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  const catIdBySlug = new Map<string, string>();
  for (const cat of ENSURE_CATEGORIES) {
    catIdBySlug.set(cat.slug, await ensureCategory(cat.slug, cat.title));
  }

  const { data: allCats } = await supabase.from("business_categories").select("id, slug");
  for (const row of allCats ?? []) {
    catIdBySlug.set(String(row.slug), String(row.id));
  }

  for (const [businessSlug, targetSlug] of Object.entries(LISTING_CATEGORY_FIXES)) {
    const targetId = catIdBySlug.get(targetSlug);
    if (!targetId || targetId.startsWith("dry-run-")) {
      console.warn(`SKIP ${businessSlug}: missing category ${targetSlug}`);
      continue;
    }

    const { data: biz } = await supabase
      .from("businesses")
      .select("id, title, primary_category_id, business_categories ( slug )")
      .eq("slug", businessSlug)
      .maybeSingle();

    if (!biz) {
      console.warn(`SKIP ${businessSlug}: not found`);
      continue;
    }

    const current = (biz.business_categories as { slug?: string } | null)?.slug ?? "?";
    console.log(`${biz.title} (${businessSlug}): ${current} → ${targetSlug}`);

    if (APPLY) {
      const { error } = await supabase
        .from("businesses")
        .update({ primary_category_id: targetId })
        .eq("id", biz.id);
      if (error) console.error(`  FAILED: ${error.message}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
