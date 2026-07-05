/**
 * Primary search intent per live guide slug — used for hub grouping and cannibalization checks.
 * One row per primary keyword; supporting pages should link to the pillar, not compete on title/H1.
 */
export type GuideIntentCluster =
  | "first_timer"
  | "beach_access"
  | "family_travel"
  | "girls_trip"
  | "seasonal"
  | "dining"
  | "lodging"
  | "town_guide"
  | "logistics"
  | "editorial";

export type GuideIntentMapping = {
  slug: string;
  cluster: GuideIntentCluster;
  /** Primary query this page should own in SERPs. */
  primaryKeyword: string;
  /** Pillar slug when this is a supporting page (links up to pillar). */
  pillarSlug?: string;
};

/** Live guide slugs (from sitemap) with assigned intent — update when guides are added or retired. */
export const GUIDE_INTENT_MAP: GuideIntentMapping[] = [
  {
    slug: "ultimate-30a-first-timers-guide",
    cluster: "first_timer",
    primaryKeyword: "first time visiting 30A",
  },
  {
    slug: "public-beaches-30a",
    cluster: "beach_access",
    primaryKeyword: "30A beach access",
  },
  {
    slug: "can-you-drive-on-the-beach-in-30a",
    cluster: "beach_access",
    primaryKeyword: "drive on beach 30A",
    pillarSlug: "public-beaches-30a",
  },
  {
    slug: "family-friendly-30a-beach-vacation",
    cluster: "family_travel",
    primaryKeyword: "family vacation 30A",
  },
  {
    slug: "how-to-get-to-30a-florida",
    cluster: "logistics",
    primaryKeyword: "how to get to 30A",
  },
  {
    slug: "how-far-is-30a-from-destin",
    cluster: "logistics",
    primaryKeyword: "30A distance from Destin",
  },
  {
    slug: "where-to-buy-groceries-30a",
    cluster: "logistics",
    primaryKeyword: "groceries on 30A",
  },
  {
    slug: "guide-to-rosemary-beach-florida",
    cluster: "town_guide",
    primaryKeyword: "Rosemary Beach Florida guide",
  },
  {
    slug: "bachelorette-girls-trip-30a",
    cluster: "girls_trip",
    primaryKeyword: "girls trip 30A",
  },
  {
    slug: "why-is-it-called-30a",
    cluster: "editorial",
    primaryKeyword: "why is it called 30A",
  },
];

export const GUIDE_INTENT_CLUSTER_LABELS: Record<GuideIntentCluster, string> = {
  first_timer: "First-time planning",
  beach_access: "Beach access",
  family_travel: "Family travel",
  girls_trip: "Weekends with friends",
  seasonal: "Seasonal guides",
  dining: "Dining",
  lodging: "Where to stay",
  town_guide: "Town guides",
  logistics: "Getting around",
  editorial: "Local stories",
};

export function guideIntentForSlug(slug: string): GuideIntentMapping | undefined {
  return GUIDE_INTENT_MAP.find((m) => m.slug === slug);
}

export function guidesByCluster(
  slugs: string[],
): Partial<Record<GuideIntentCluster, GuideIntentMapping[]>> {
  const slugSet = new Set(slugs);
  const out: Partial<Record<GuideIntentCluster, GuideIntentMapping[]>> = {};
  for (const mapping of GUIDE_INTENT_MAP) {
    if (!slugSet.has(mapping.slug)) continue;
    const list = out[mapping.cluster] ?? [];
    list.push(mapping);
    out[mapping.cluster] = list;
  }
  return out;
}
