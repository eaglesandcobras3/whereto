/**
 * Feature-flag resolution (no `next/headers`) — safe for client components and Edge middleware.
 * Flags are PostHog-only; missing remote values fall back to DEFAULT_FLAGS.
 */

/** PostHog flag keys. */
export const FEATURE_FLAG_KEYS = [
  "search",
  "discover",
  "discover_nl",
  "discover_maps",
  "ask",
  "search_inspector",
  "onboard",
  "community_tips",
  "area_facts",
  "rentals",
  "rental_partners",
  "business_photos",
  "admin_business_direct_edit",
  "business_maps",
  "town_maps",
  "feedback",
  "category_hub_seo",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FLAGS: FeatureFlags = {
  search: false,
  discover: false,
  discover_nl: false,
  discover_maps: false,
  ask: false,
  search_inspector: false,
  onboard: false,
  community_tips: false,
  area_facts: true,
  rentals: false,
  rental_partners: false,
  business_photos: false,
  admin_business_direct_edit: false,
  business_maps: false,
  town_maps: false,
  feedback: false,
  category_hub_seo: false,
};

export type DiscoveryFlags = Pick<FeatureFlags, "search" | "ask">;

export function toDiscoveryFlags(flags: FeatureFlags): DiscoveryFlags {
  return {
    search: flags.search === true,
    ask: flags.ask === true,
  };
}

function pickKnownFlags(
  remote: Partial<Record<string, boolean>> | null | undefined,
): Partial<FeatureFlags> {
  const picked: Partial<FeatureFlags> = {};
  for (const key of FEATURE_FLAG_KEYS) {
    const value = remote?.[key];
    if (value === true || value === false) picked[key] = value;
  }
  return picked;
}

/** Merge PostHog evaluation into code defaults. */
export function resolveFeatureFlags(
  posthogFlags: Partial<Record<string, boolean>> | null | undefined,
): FeatureFlags {
  return {
    ...DEFAULT_FLAGS,
    ...pickKnownFlags(posthogFlags),
  };
}

export function isAskEnabled(flags: DiscoveryFlags | FeatureFlags): boolean {
  return flags.ask === true;
}

export function isSearchEnabled(flags: DiscoveryFlags | FeatureFlags): boolean {
  return flags.search === true;
}

export function isDiscoverEnabled(flags: FeatureFlags): boolean {
  return flags.discover === true;
}

/** Natural-language query expansion for `/discover` (requires `discover`). */
export function isDiscoverNlEnabled(flags: FeatureFlags): boolean {
  return flags.discover === true && flags.discover_nl === true;
}

/** Map-first storefront discover UI (requires `discover`). Services stay list-only. */
export function isDiscoverMapsEnabled(flags: FeatureFlags): boolean {
  return flags.discover === true && flags.discover_maps === true;
}

export function isSearchInspectorEnabled(flags: FeatureFlags): boolean {
  return flags.search_inspector === true;
}

export function isOnboardEnabled(flags: FeatureFlags): boolean {
  return flags.onboard === true;
}

/** Admin review queue — always on (free intake is fully ramped). */
export function isReviewQueueEnabled(_flags?: FeatureFlags): boolean {
  return true;
}

/** Community text tips on businesses, towns, areas, and guides (optional stars; moderated). */
export function isCommunityTipsEnabled(flags: FeatureFlags): boolean {
  return flags.community_tips === true;
}

/** Area profile “at a glance” section (DB-backed facts below the hero). */
export function isAreaFactsEnabled(flags: FeatureFlags): boolean {
  return flags.area_facts === true;
}

/** Vacation rentals marketplace (`/stays`, listing intake, admin rentals). */
export function isRentalsEnabled(flags: FeatureFlags): boolean {
  return flags.rentals === true;
}

/** Company-level rental partner application (`/list-your-rentals/partner`). */
export function isRentalPartnersEnabled(flags: FeatureFlags): boolean {
  return flags.rental_partners === true;
}

/**
 * Business listing photos: admin main-image update, portal additional uploads,
 * public profile gallery (requires writable `businesses.main_image_url` / `hero_image_url`).
 */
export function isBusinessPhotosEnabled(flags: FeatureFlags): boolean {
  return flags.business_photos === true;
}

/**
 * Admin direct business field edits (bypass review queue). Portal owner edit
 * proposals stay on `onboard` and are unaffected by this flag.
 */
export function isAdminBusinessDirectEditEnabled(flags: FeatureFlags): boolean {
  return flags.admin_business_direct_edit === true;
}

/** OpenStreetMap embeds on business detail + storefront pins on town/area/category hubs. */
export function isBusinessMapsEnabled(flags: FeatureFlags): boolean {
  return flags.business_maps === true;
}

/** OpenStreetMap of towns/areas on `/towns` and `/areas` hubs (place centers, not businesses). */
export function isTownMapsEnabled(flags: FeatureFlags): boolean {
  return flags.town_maps === true;
}

/** Visitor “is this wrong?” field flags on unverified business / rental detail pages. */
export function isFeedbackEnabled(flags: FeatureFlags): boolean {
  return flags.feedback === true;
}

/**
 * Category hub SEO substance: inventory-aware editorial, related guides,
 * and differentiated browse-group rollups on `/businesses/[slug]`.
 * Sitemap/noindex eligibility for empty hubs is always on (not gated).
 */
export function isCategoryHubSeoEnabled(flags: FeatureFlags): boolean {
  return flags.category_hub_seo === true;
}
