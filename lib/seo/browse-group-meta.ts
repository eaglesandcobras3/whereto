/** Natural noun phrase for SERP metas (avoids "Browse 171 food & drink"). */
const BROWSE_GROUP_META_NOUN: Record<string, string> = {
  food_and_drink: "food and drink spots",
  shopping: "shops and stores",
  things_to_do: "things to do",
  beauty_and_wellness: "beauty and wellness spots",
  medical: "health and medical providers",
  places_to_stay: "places to stay",
  professional: "professional and financial providers",
  home_services: "home service providers",
  creative_services: "creative service providers",
  automotive: "automotive businesses",
  marine: "marine businesses",
  family_and_education: "family and education providers",
  technology: "technology providers",
  retail_services: "retail service providers",
  rentals: "rental providers",
  restaurants_and_bars: "restaurants and bars",
  coffee_and_treats: "coffee shops and sweet treats",
  health_and_medical: "health and medical providers",
  professional_and_financial: "professional and financial providers",
};

export function browseGroupMetaNoun(groupSlug: string, title: string): string {
  return BROWSE_GROUP_META_NOUN[groupSlug] ?? `${title.trim().toLowerCase()} listings`;
}

/** Inventory-aware meta description for rollup / legacy browse-group hubs. */
export function buildBrowseGroupHubMetaDescription(input: {
  groupSlug: string;
  title: string;
  listingCount: number;
  townCount: number;
}): string {
  const noun = browseGroupMetaNoun(input.groupSlug, input.title);
  if (input.listingCount <= 0) {
    return `Explore ${noun} along Scenic 30A in South Walton, Florida — storefronts and service providers by town.`;
  }
  const towns =
    input.townCount > 0
      ? ` across ${input.townCount} ${input.townCount === 1 ? "town" : "towns"}`
      : "";
  return `Explore ${input.listingCount} ${noun} along Scenic 30A${towns}. Open a type below for the full by-town listing grid.`;
}
