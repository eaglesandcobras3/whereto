/** Visible editorial intros for markup-heavy browse pages (text-HTML ratio). */

export function categoryHubIntro(
  categoryTitle: string,
  listingCount: number,
  townCount: number,
): string {
  const lower = categoryTitle.toLowerCase();
  const townLine =
    townCount > 0
      ? `${townCount} ${townCount === 1 ? "town" : "towns"} along the corridor`
      : "towns along the corridor";
  return `This hub groups ${listingCount} ${lower} across ${townLine} on Scenic Highway 30A in South Walton, Florida. Listings are organized by town so you can compare what is actually nearby, not just what surfaces in a generic map search. Open any card for practical details, then follow the town link when you want beach access, parking context, and where to eat after.`;
}

export function areaPageIntro(
  areaTitle: string,
  typeLabel: string,
  townName?: string | null,
): string {
  const townPhrase = townName ? ` in ${townName}` : " along 30A";
  return `${areaTitle} is a ${typeLabel.toLowerCase()}${townPhrase} that many visitors use as a day-one anchor: shopping, dining, and the walkable center of a beach town rather than a single stop on the highway. The listings below are curated for this area. Use them to shortlist places before you arrive, then open the town guide for beach access, parking, and how the week actually feels here.`;
}

export function townPageIntro(townName: string, descriptor: string): string {
  return `${townName} sits on Florida's Scenic Highway 30A in South Walton. ${descriptor} Use the categories below to see restaurants, coffee, activities, and shops tied to this town, then open our guides when you want trip-planning context beyond a single listing.`;
}

export function hubTownsIntro(): string {
  return "Scenic Highway 30A strings together distinct beach communities, each with its own architecture, dining scene, and beach-access reality. Pick a town below to see local businesses by category, nearby areas and districts, and editorial guides linked to that community. If you are new to the corridor, compare two or three towns before you book. Seaside and Rosemary feel different from Grayton or Santa Rosa Beach, and the right match depends on how you want the week to run.";
}

export function hubTownsCompareIntro(): string {
  return "Not sure which town fits? Families often gravitate toward Seaside and WaterColor for walkability. Girls trips and date nights lean Rosemary and Alys. Grayton and Santa Rosa Beach feel more laid-back. Use the links below to match your trip style, then open individual town pages for listings and local context.";
}

export function hubAreasIntro(): string {
  return "Beyond the beach, 30A is built around walkable town centers, shopping districts, and gathering spots that shape how visitors spend an afternoon. Each area page groups nearby restaurants, shops, and activities so you can plan around a place, not just a pin on the map. Open a town guide from any area when you need parking context, beach access, and where to eat after you browse.";
}

export function hubBusinessesIntro(): string {
  return "This directory covers storefront and venue listings along Scenic Highway 30A: restaurants, coffee shops, bars, boutiques, activities, and in-town services with a physical presence. Search by name, browse daily featured picks, or jump to a category hub when you know the type of place you want. Listings are curated for orientation. Confirm hours and availability with the business before you visit.";
}

export function hubGuidesIntro(): string {
  return "Our guides are written for trip planning and on-the-ground decisions: first-timer overviews, town-specific notes, dining angles, and beach-day context for South Walton. Start with the featured planning guide if you are new to 30A, then open town pages when you want listings grouped by community.";
}

const GUIDE_CLUSTER_INTROS: Partial<Record<string, string>> = {
  first_timer:
    "New to the corridor? These guides cover when to visit, how to get here, and how to choose a home base.",
  beach_access:
    "Public access points, parking realities, and beach rules — the practical details every 30A visitor needs.",
  family_travel:
    "Kid-friendly towns, beaches, and pacing tips for a week that works for the whole group.",
  girls_trip:
    "Walkable towns, dining, and photo-worthy stops for a friends weekend on the Emerald Coast.",
  town_guide: "Deep dives on individual communities — vibe, logistics, and what makes each town distinct.",
  logistics: "Airports, groceries, distances, and the small planning details that save time on arrival day.",
  editorial: "Local context and stories that help you understand how 30A got its name and character.",
};

export function hubGuidesClusterIntro(cluster: string): string {
  return (
    GUIDE_CLUSTER_INTROS[cluster] ??
    "Editorial guides for planning and exploring Scenic Highway 30A."
  );
}

export function hubServicesIntro(): string {
  return "Browse by specialty, then filter by town when you need someone who actually works in your neighborhood. Listings summarize service area and contact paths. Confirm scope, licensing, and scheduling with the provider before you hire.";
}

export function businessListingIntro(
  name: string,
  categoryName?: string | null,
  townName?: string | null,
): string {
  const categoryPhrase = categoryName ? `${categoryName.toLowerCase()} ` : "";
  const townPhrase = townName ? ` in ${townName}` : " along Scenic Highway 30A";
  return `${name} is listed as a ${categoryPhrase}business${townPhrase} on WhereTo30A. The summary and facts below are for traveler orientation. Confirm hours, pricing, reservations, and availability directly with the business before you visit.`;
}
