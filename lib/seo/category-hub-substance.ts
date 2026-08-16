import {
  CATEGORY_HUB_FEATURED_NAME_COUNT,
  CATEGORY_HUB_MIN_LISTINGS_FOR_INDEX,
} from "@/lib/seo/category-hub-constants";

export type CategoryHubInventory = {
  title: string;
  slug: string;
  excerpt?: string | null;
  listingCount: number;
  /** Town display names already represented on the hub (sorted). */
  townNames: string[];
  regionalCount: number;
  /** Optional featured listing names for callouts. */
  featuredNames?: string[];
};

/** Priority categories with hand-tuned body (Travel & Lifestyle voice). */
const SEEDED_BODY: Record<string, string> = {
  restaurants: `When we are deciding where to eat on 30A, I start with the town we are already in — or the one we can walk to after the beach — then widen out if we want a specific vibe. Rosemary and Seaside feel different from Grayton or Inlet Beach, and the right dinner depends on whether it is kids first, a girls night, or something easy after a long sun day. Use the town sections below to compare what is actually nearby, then open a listing for hours and reservations.`,
  shopping: `Shopping on 30A is less about one mall and more about the walkable town centers — boutiques, gifts, and local stores tucked into places you are already wandering. I usually pick a town for the afternoon and let the street do the work: Rosemary for a polished stroll, Seaside for a classic 30A browse, then fill gaps with whatever else is close. The listings below are grouped that way so you can shortlist without bouncing between map pins.`,
  coffee_shops: `Coffee is how our 30A mornings start — a quick stop before the beach, or a slower sit when the kids need a reset. Each town has its own little ritual, so I care more about what is near our home base than chasing a single “best” cup. Browse by town below, then open a shop for the practical details before you go.`,
  bars: `For a drink on 30A, I think about the night first: casual after the beach, a date-night sit-down, or somewhere the adults can linger while the kids are down. Towns change the vibe more than the menu sometimes — what works in Seaside is not always what we want in Grayton. Use the town sections to compare options close to where you are staying.`,
  activities: `When we want something beyond the beach — bikes, water sports, a rainy-day plan — I look at what is actually based near our town first. 30A activities are spread out, and “nearby” beats a long corridor drive with sandy kids in the car. The hubs below group operators by town so you can build a day that fits where you are already planted.`,
  shopping_boutiques: `Boutique browsing is one of my favorite low-pressure 30A afternoons — especially when we can park once and walk. Start with the town you are already in, then hop a town over if you still have energy. Listings below keep the storefronts organized that way.`,
};

function formatTownList(townNames: string[]): string {
  if (townNames.length === 0) return "";
  if (townNames.length === 1) return townNames[0]!;
  if (townNames.length === 2) return `${townNames[0]} and ${townNames[1]}`;
  if (townNames.length === 3) {
    return `${townNames[0]}, ${townNames[1]}, and ${townNames[2]}`;
  }
  return `${townNames.slice(0, 3).join(", ")}, and ${townNames.length - 3} more`;
}

function featuredClause(names: string[] | undefined): string {
  const trimmed = (names ?? []).map((n) => n.trim()).filter(Boolean).slice(0, CATEGORY_HUB_FEATURED_NAME_COUNT);
  if (trimmed.length === 0) return "";
  if (trimmed.length === 1) return ` Places called out on this hub include ${trimmed[0]}.`;
  if (trimmed.length === 2) return ` Places called out on this hub include ${trimmed[0]} and ${trimmed[1]}.`;
  return ` Places called out on this hub include ${trimmed[0]}, ${trimmed[1]}, and ${trimmed[2]}.`;
}

/** Whether a hub should be indexed / sitemapped. */
export function isCategoryHubIndexEligible(listingCount: number): boolean {
  return listingCount >= CATEGORY_HUB_MIN_LISTINGS_FOR_INDEX;
}

/** Short always-visible hero line — inventory-aware, not a title-only template. */
export function buildCategoryHubHeroDescription(input: CategoryHubInventory): string {
  const lower = input.title.toLowerCase();
  const towns = formatTownList(input.townNames);
  if (input.listingCount <= 0) {
    return `We are still gathering ${lower} along Scenic Highway 30A in South Walton. Check back as listings are published.`;
  }
  if (towns) {
    return `${input.listingCount} ${lower} along Scenic Highway 30A — including coverage in ${towns}${
      input.regionalCount > 0 ? `, plus ${input.regionalCount} regional providers` : ""
    }.`;
  }
  if (input.regionalCount > 0) {
    return `${input.listingCount} ${lower} serving Scenic Highway 30A and South Walton — many by appointment or mobile.`;
  }
  return `${input.listingCount} ${lower} listed along Scenic Highway 30A in South Walton, Florida.`;
}

/**
 * Primary editorial body for the hub.
 * Prefers DB excerpt, then seeded voice copy, then inventory-aware fallback.
 */
export function buildCategoryHubEditorialBody(input: CategoryHubInventory): string {
  const excerpt = input.excerpt?.trim();
  if (excerpt && excerpt.length >= 40) return excerpt;

  const seeded = SEEDED_BODY[input.slug];
  if (seeded) return seeded;

  const lower = input.title.toLowerCase();
  const towns = formatTownList(input.townNames);
  const featured = featuredClause(input.featuredNames);

  if (towns) {
    return `This ${lower} hub is organized the way we actually plan days on 30A — by town first, so you can see what is near Rosemary Beach, Seaside, or wherever you are based, instead of a single undifferentiated list. Right now it covers ${input.listingCount} listings across ${towns}${
      input.regionalCount > 0
        ? `, with ${input.regionalCount} more regional or by-appointment providers`
        : ""
    }.${featured} Open any card for practical details, then follow a town link when you want beach access and local context.`;
  }

  return `This ${lower} hub collects ${input.listingCount} listings that serve Scenic Highway 30A and South Walton${
    input.regionalCount > 0 ? `, including ${input.regionalCount} regional or by-appointment providers` : ""
  }.${featured} Use it to shortlist options, then confirm hours and availability with each business.`;
}

/** Collapsible supporting intro — distinct from the editorial body. */
export function buildCategoryHubSupportingIntro(input: CategoryHubInventory): string {
  const lower = input.title.toLowerCase();
  const towns = formatTownList(input.townNames);
  if (towns) {
    return `Listings below are grouped by town (${towns}) so you can compare what is actually nearby. Regional providers without a single storefront town appear in their own section.`;
  }
  return `Browse ${lower} serving the 30A corridor. Confirm hours, pricing, and availability directly with each business before you go.`;
}

/** Unique meta description from inventory (audit overrides still win upstream). */
export function buildCategoryHubMetaDescription(input: CategoryHubInventory): string {
  const lower = input.title.toLowerCase();
  const towns = formatTownList(input.townNames);
  if (input.listingCount <= 0) {
    return `Browse ${lower} along Scenic 30A in South Walton, Florida as listings are published.`;
  }
  if (towns) {
    return `Browse ${input.listingCount} ${lower} on 30A by town — including ${towns}. Local storefronts and regional providers across South Walton.`;
  }
  return `Browse ${input.listingCount} ${lower} serving Scenic Highway 30A and South Walton, Florida. Compare options, then confirm details with each business.`;
}

export function buildCategoryHubTitleSegment(input: CategoryHubInventory): string {
  if (input.townNames.length >= 2) {
    return `${input.title} on 30A: By Town Across South Walton`;
  }
  if (input.townNames.length === 1) {
    return `${input.title} on 30A: ${input.townNames[0]} & Nearby`;
  }
  return `${input.title} on 30A, Florida`;
}

/** True when the hub renders a dedicated editorial block (excerpt, seed, or generated body). */
export function categoryHubHasEditorialBlock(input: CategoryHubInventory): boolean {
  return buildCategoryHubEditorialBody(input).trim().length >= 80;
}
