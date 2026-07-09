import type { DiscoverListingRow } from "@/lib/discovery-filters/types";

const CATEGORY_KIND: Record<string, string> = {
  restaurants: "Restaurant",
  bars: "Bar",
  coffee_shops: "Coffee shop",
  ice_cream: "Ice cream shop",
  donut_shops: "Donut shop",
  desserts: "Bakery",
  shopping: "Shop",
  specialty_retail: "Market",
  boutiques: "Boutique",
  jewelry: "Jewelry shop",
  footwear: "Shoe store",
  activities: "Activity",
  entertainment: "Entertainment",
  hotels: "Hotel",
  beauty_wellness: "Spa",
  spas: "Spa",
  hair_salons: "Salon",
  nail_salons: "Nail salon",
  fitness: "Gym",
};

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function businessKind(listing: DiscoverListingRow): string {
  if (listing.category_slug && CATEGORY_KIND[listing.category_slug]) {
    return CATEGORY_KIND[listing.category_slug];
  }
  if (listing.business_type?.trim()) {
    return titleCase(listing.business_type.trim());
  }
  return "Place";
}

export type DiscoverMatchReasonInput = {
  listing: DiscoverListingRow;
  anchorTownSlugs?: string[];
  labelForSlug: (slug: string) => string;
};

export function formatDiscoverMatchReason({
  listing,
  anchorTownSlugs,
  labelForSlug,
}: DiscoverMatchReasonInput): string | null {
  const matched = listing.tag_match?.matched ?? [];
  const kind = businessKind(listing);

  let lead: string | null = null;
  if (matched.length) {
    const tagLabels = matched.map(labelForSlug);
    lead =
      tagLabels.length === 1
        ? `${kind} with ${tagLabels[0]}`
        : `${kind} with ${tagLabels.join(", ")}`;
  } else if (listing.town_name) {
    lead = kind;
  }

  if (!listing.town_name) return lead;

  const isAnchor = Boolean(
    listing.town_slug && anchorTownSlugs?.includes(listing.town_slug),
  );
  const hasAnchorZone = Boolean(anchorTownSlugs?.length);

  const townPhrase =
    hasAnchorZone && !isAnchor
      ? `in ${listing.town_name} (nearby)`
      : `in ${listing.town_name}`;

  return lead ? `${lead} ${townPhrase}` : townPhrase;
}
