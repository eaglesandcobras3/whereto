/**
 * Ensure `hotels` business_category exists and move lodging listings out of professional_services.
 *
 * Usage:
 *   npx tsx scripts/fix-hotel-categories.ts
 *   npx tsx scripts/fix-hotel-categories.ts --apply
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

const HOTEL_SLUG_OVERRIDES: Record<string, string> = {
  "the-pearl-hotel-rosemary-beach": "hotels",
  "rosemary-beach-inn": "hotels",
  "hyatt-place-sandestin": "hotels",
  "residence-inn-by-marriott-sandestin": "hotels",
  "the-lodge-30a-seagrove-beach": "hotels",
};

const HOTEL_TITLE_PATTERN = /\b(hotel|inn|marriott|hyatt|resort|motel|lodging|suites)\b/i;

async function ensureHotelsCategoryId(): Promise<string> {
  const { data: existing } = await supabase
    .from("business_categories")
    .select("id")
    .eq("slug", "hotels")
    .maybeSingle();

  if (existing?.id) return String(existing.id);

  if (!APPLY) {
    console.log("Would create business_categories row: hotels (Hotels & lodging)");
    return "dry-run-hotels-id";
  }

  const { data: created, error } = await supabase
    .from("business_categories")
    .insert({
      id: randomUUID(),
      status: "published",
      title: "Hotels & lodging",
      slug: "hotels",
      is_hidden_from_search: false,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create hotels category: ${error?.message}`);
  }

  console.log("Created business_categories: hotels");
  return String(created.id);
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  const hotelsCategoryId = await ensureHotelsCategoryId();

  const { data: profCat } = await supabase
    .from("business_categories")
    .select("id")
    .eq("slug", "professional_services")
    .maybeSingle();

  const { data: candidates, error } = await supabase
    .from("businesses")
    .select("id, slug, title, primary_category_id, is_storefront")
    .is("archived_at", null)
    .eq("status", "published")
    .or(
      [
        ...Object.keys(HOTEL_SLUG_OVERRIDES).map((s) => `slug.eq.${s}`),
        profCat?.id ? `primary_category_id.eq.${profCat.id}` : "",
      ]
        .filter(Boolean)
        .join(","),
    );

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const toFix = (candidates ?? []).filter((row) => {
    const slug = String(row.slug);
    if (HOTEL_SLUG_OVERRIDES[slug]) return true;
    return HOTEL_TITLE_PATTERN.test(String(row.title));
  });

  console.log(`Found ${toFix.length} lodging listings to recategorize:\n`);

  for (const row of toFix) {
    console.log(`  ${row.title} (${row.slug}) → hotels`);

    if (APPLY && hotelsCategoryId !== "dry-run-hotels-id") {
      const { error: updateErr } = await supabase
        .from("businesses")
        .update({ primary_category_id: hotelsCategoryId })
        .eq("id", row.id);
      if (updateErr) console.error(`    FAILED: ${updateErr.message}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
