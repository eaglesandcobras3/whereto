/**
 * Browse grouping for the unified taxonomy (CSV rollups + legacy storefront groups).
 * Prefer rollup from unified leaf slug; fall back to legacy BUSINESS_CATEGORY_GROUP maps.
 */

import {
  BUSINESS_CATEGORY_GROUP_ICONS,
  BUSINESS_CATEGORY_GROUP_LABELS,
  businessCategoryGroupForSlug,
  type BusinessCategoryGroupSlug,
} from "@/lib/business-categories/groups";
import {
  getUnifiedLeaves,
  getUnifiedRollups,
  OLD_STOREFRONT_SLUG_TO_LEAF,
} from "@/lib/categories/unified-taxonomy";

export type BrowseSectionRef = {
  id: string;
  title: string;
  /** Material Symbols name */
  icon: string;
};

const UNIFIED_ROLLUP_ICONS: Record<string, string> = {
  food_and_drink: "restaurant",
  shopping: "shopping_bag",
  things_to_do: "kayaking",
  beauty_and_wellness: "spa",
  medical: "medical_services",
  places_to_stay: "bed",
  professional: "account_balance",
  home_services: "home_repair_service",
  creative_services: "palette",
  automotive: "directions_car",
  marine: "sailing",
  family_and_education: "school",
  technology: "devices",
  retail_services: "storefront",
  rentals: "key",
};

/** Material Symbols for unified leaf categories on hub link grids. */
const UNIFIED_LEAF_ICONS: Record<string, string> = {
  restaurants: "restaurant",
  bars: "local_bar",
  coffee_shops: "coffee",
  bakeries_and_desserts: "bakery_dining",
  breweries_and_wine: "wine_bar",
  boutiques_and_apparel: "checkroom",
  shopping_jewelry: "diamond",
  home_and_gifts: "redeem",
  specialty_retail: "storefront",
  art_galleries: "palette",
  outdoor_activities: "hiking",
  water_activities: "surfing",
  attractions: "attractions",
  entertainment: "theater_comedy",
  arts_and_culture: "museum",
  hair_salons: "content_cut",
  nail_salons: "brush",
  spas: "spa",
  fitness_studios: "fitness_center",
  wellness: "self_improvement",
  medical_clinics: "local_hospital",
  dental: "dentistry",
  dermatology: "dermatology",
  chiropractic: "accessibility_new",
  mental_health: "psychology",
  veterinary: "pets",
  hotels_and_resorts: "apartment",
  vacation_rentals: "holiday_village",
  campgrounds_and_rv_parks: "camping",
  real_estate: "real_estate_agent",
  financial_services: "account_balance",
  legal: "gavel",
  insurance: "verified_user",
  business_services: "work",
  contractors: "construction",
  handyman: "handyman",
  home_improvement: "home_repair_service",
  electrical: "bolt",
  plumbing: "plumbing",
  hvac: "ac_unit",
  roofing: "roofing",
  flooring: "layers",
  painting: "format_paint",
  concrete_and_masonry: "foundation",
  windows_and_doors: "door_front",
  appliance_repair: "kitchen",
  restoration: "home_repair_service",
  pressure_washing: "water_drop",
  cleaning: "cleaning_services",
  junk_removal: "delete_sweep",
  moving: "local_shipping",
  home_inspection: "fact_check",
  security_systems: "security",
  solar: "solar_power",
  pest_control: "pest_control",
  lawn_care: "grass",
  landscaping: "yard",
  irrigation: "water",
  pool_and_spa: "pool",
  property_management: "apartment",
  marketing: "campaign",
  photography: "photo_camera",
  videography: "videocam",
  graphic_design: "design_services",
  web_design: "web",
  branding: "loyalty",
  interior_design: "chair",
  architecture: "architecture",
  event_planning: "event",
  wedding_services: "celebration",
  catering: "restaurant_menu",
  auto_repair: "car_repair",
  car_rental: "car_rental",
  towing: "local_taxi",
  mobile_detailing: "local_car_wash",
  golf_cart_sales: "electric_rickshaw",
  automotive_golf_cart_rentals: "electric_rickshaw",
  golf_cart_repair: "build",
  boat_rentals: "directions_boat",
  boat_repair: "handyman",
  boat_storage: "warehouse",
  marine_services: "sailing",
  fishing_charters: "set_meal",
  dock_services: "anchor",
  jet_ski_rentals: "scuba_diving",
  childcare: "child_care",
  education: "school",
  tutoring: "menu_book",
  music_lessons: "music_note",
  pet_services: "pets",
  it_services: "computer",
  computer_repair: "build",
  web_development: "code",
  coworking: "groups",
  printing_services: "print",
  apparel: "checkroom",
  coastal_apparel: "beach_access",
  retail_jewelry: "diamond",
  home_decor: "chair",
  coastal_gifts: "redeem",
  artwork: "brush",
  furniture: "weekend",
  online_retail: "shopping_cart",
  e_commerce: "storefront",
  vacation_rental_management: "holiday_village",
  equipment_rentals: "handyman",
  bike_rentals: "pedal_bike",
  rentals_golf_cart_rentals: "electric_rickshaw",
  baby_equipment_rentals: "stroller",
  event_rentals: "celebration",
};

const leafBySlug = new Map(
  getUnifiedLeaves().map((l) => [l.slug, l] as const),
);

const rollupBySlug = new Map(
  getUnifiedRollups().map((r) => [r.slug, r] as const),
);

/** Resolve a category leaf slug (or remapped old slug) to a browse section. */
export function browseSectionForCategorySlug(
  categorySlug: string | null | undefined,
): BrowseSectionRef | null {
  if (!categorySlug?.trim()) return null;
  const raw = categorySlug.trim().toLowerCase();

  const remapped = OLD_STOREFRONT_SLUG_TO_LEAF[raw] ?? raw;
  const leaf = leafBySlug.get(remapped);
  if (leaf) {
    return {
      id: leaf.rollupSlug,
      title: leaf.rollupTitle,
      icon: UNIFIED_ROLLUP_ICONS[leaf.rollupSlug] ?? "category",
    };
  }

  const legacy = businessCategoryGroupForSlug(raw);
  if (legacy) {
    return {
      id: legacy,
      title: BUSINESS_CATEGORY_GROUP_LABELS[legacy],
      icon: BUSINESS_CATEGORY_GROUP_ICONS[legacy],
    };
  }

  return null;
}

export function unifiedRollupPublicSegment(rollupSlug: string): string {
  return rollupSlug.replace(/_/g, "-");
}

export function unifiedRollupFromPublicSegment(segment: string): string | null {
  const norm = segment.trim().toLowerCase().replace(/-/g, "_");
  return rollupBySlug.has(norm) ? norm : null;
}

export function unifiedRollupHubPath(rollupSlug: string): string {
  return `/businesses/${unifiedRollupPublicSegment(rollupSlug)}`;
}

export function browseSectionIcon(sectionId: string): string {
  if (UNIFIED_ROLLUP_ICONS[sectionId]) return UNIFIED_ROLLUP_ICONS[sectionId];
  if ((BUSINESS_CATEGORY_GROUP_ICONS as Record<string, string>)[sectionId]) {
    return BUSINESS_CATEGORY_GROUP_ICONS[sectionId as BusinessCategoryGroupSlug];
  }
  return "category";
}

/** Material Symbol for a leaf category slug; falls back to rollup icon, then category. */
export function leafCategoryIcon(leafSlug: string): string {
  const raw = leafSlug.trim().toLowerCase();
  const remapped = OLD_STOREFRONT_SLUG_TO_LEAF[raw] ?? raw;
  if (UNIFIED_LEAF_ICONS[remapped]) return UNIFIED_LEAF_ICONS[remapped];
  const leaf = leafBySlug.get(remapped);
  if (leaf) return UNIFIED_ROLLUP_ICONS[leaf.rollupSlug] ?? "category";
  return "category";
}

export function isUnifiedRollupSlug(value: string): boolean {
  return rollupBySlug.has(value);
}

export function listUnifiedRollupOrder(): string[] {
  return getUnifiedRollups().map((r) => r.slug);
}
