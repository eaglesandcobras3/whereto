import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isRentalIndexReady } from "@/lib/stays/eligibility";
import { RENTAL_TOWN_HUB_MIN_PROPERTIES } from "@/lib/stays/constants";
import { TOWNS_HUB_INCLUDE_OR_FILTER } from "@/lib/places/hub-browse-visibility";

const PAGE_SIZE = 1000;

/** Fetch index-eligible rental property rows for the sitemap. */
export async function fetchSitemapRentals(
  supabase: SupabaseClient,
): Promise<{ rentals: Record<string, unknown>[]; rentalTownHubs: Record<string, unknown>[] }> {
  const rentals: Record<string, unknown>[] = [];
  const townCounts = new Map<string, { slug: string; count: number; date_updated?: string }>();
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("rental_properties_view")
      .select(
        "slug, status, partner_status, description, local_context, excerpt, hero_image_url, primary_image_url, town_id, town_slug, bedrooms, bathrooms, sleeps, booking_url, content_rights_confirmed, is_hidden_from_search, duplicate_of_property_id, date_updated, published_at, date_created",
      )
      .eq("status", "published")
      .eq("partner_status", "active")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      // Table may not exist until migration is applied.
      console.error("sitemap: rentals", error.message);
      break;
    }

    const batch = (data ?? []) as Record<string, unknown>[];
    for (const row of batch) {
      if (!isRentalIndexReady(row as Parameters<typeof isRentalIndexReady>[0])) continue;
      rentals.push({
        slug: row.slug,
        date_updated: row.date_updated,
        published_at: row.published_at,
        date_created: row.date_created,
      });
      const townSlug = typeof row.town_slug === "string" ? row.town_slug.trim() : "";
      if (townSlug) {
        const prev = townCounts.get(townSlug);
        const updated =
          typeof row.date_updated === "string" ? row.date_updated : prev?.date_updated;
        townCounts.set(townSlug, {
          slug: townSlug,
          count: (prev?.count ?? 0) + 1,
          date_updated: updated,
        });
      }
    }

    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const rentalTownHubs = [...townCounts.values()]
    .filter((t) => t.count >= RENTAL_TOWN_HUB_MIN_PROPERTIES)
    .map((t) => ({
      slug: t.slug,
      date_updated: t.date_updated,
    }));

  let browsableTownSlugs: Set<string> | null = null;
  try {
    const { data: townRows } = await supabase
      .from("towns")
      .select("slug")
      .is("archived_at", null)
      .eq("status", "published")
      .or(TOWNS_HUB_INCLUDE_OR_FILTER);
    browsableTownSlugs = new Set(
      (townRows ?? [])
        .map((r) => String((r as { slug: string }).slug ?? "").trim())
        .filter(Boolean),
    );
  } catch {
    browsableTownSlugs = null;
  }

  const filteredRentalTownHubs =
    browsableTownSlugs && browsableTownSlugs.size > 0
      ? rentalTownHubs.filter((t) => browsableTownSlugs!.has(String(t.slug)))
      : rentalTownHubs;

  return { rentals, rentalTownHubs: filteredRentalTownHubs };
}
