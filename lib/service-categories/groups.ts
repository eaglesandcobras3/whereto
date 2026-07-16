import type { ServiceCategorySlug } from "@/lib/service-categories/constants";

/**
 * End-user browse groups for `/services` hub and footer.
 * Granular `service_categories.slug` values stay in the DB for search / `?specialty=`.
 * Every specialty maps to exactly one named group (no catch-all bury).
 */
export const SERVICE_CATEGORY_GROUP_SLUGS = [
  "home_trades",
  "outdoor_property",
  "professional",
  "health_wellness",
  "vacation_guest",
  "creative_events",
  "marine",
  "auto_transport",
  "tech_office",
  "family_pets",
  "other_services",
] as const;

export type ServiceCategoryGroupSlug = (typeof SERVICE_CATEGORY_GROUP_SLUGS)[number];

export const SERVICE_CATEGORY_GROUP_LABELS: Record<ServiceCategoryGroupSlug, string> = {
  home_trades: "Home trades",
  outdoor_property: "Outdoor & property",
  professional: "Professional & financial",
  health_wellness: "Health & wellness",
  vacation_guest: "Vacation & guest services",
  creative_events: "Creative & events",
  marine: "Marine",
  auto_transport: "Auto & transport",
  tech_office: "Tech & workspace",
  family_pets: "Family, pets & education",
  other_services: "Other services",
};

/** Material icon per browse group (CollapsibleBrowseSection). */
export const SERVICE_CATEGORY_GROUP_ICONS: Record<ServiceCategoryGroupSlug, string> = {
  home_trades: "handyman",
  outdoor_property: "yard",
  professional: "account_balance",
  health_wellness: "spa",
  vacation_guest: "holiday_village",
  creative_events: "palette",
  marine: "sailing",
  auto_transport: "directions_car",
  tech_office: "computer",
  family_pets: "pets",
  other_services: "more_horiz",
};

/** Which specialty slug belongs to which hub section. */
export const SERVICE_CATEGORY_GROUP_MEMBERS: Record<
  ServiceCategoryGroupSlug,
  readonly ServiceCategorySlug[]
> = {
  home_trades: [
    "plumbing",
    "electrical",
    "hvac",
    "painting",
    "handyman",
    "roofing",
    "cleaning",
    "pressure_washing",
    "junk_removal",
    "moving",
    "flooring",
    "concrete_masonry",
    "home_exterior",
    "appliance_repair",
    "solar_energy",
    "restoration",
    "contractors",
    "home_improvement",
    "home_inspection",
    "security_systems",
  ],
  outdoor_property: ["landscaping", "lawn_care", "pool_spa", "irrigation", "pest_control"],
  professional: [
    "insurance",
    "accounting",
    "legal",
    "real_estate",
    "financial",
    "staffing",
    "engineering_survey",
  ],
  health_wellness: [
    "health_medical",
    "counseling",
    "veterinary",
    "salon_spa",
    "fitness_wellness",
  ],
  vacation_guest: ["vacation_rentals", "property_management", "home_staging"],
  creative_events: [
    "design_architecture",
    "photography",
    "events_wedding",
    "catering_events",
    "marketing_creative",
  ],
  marine: ["marine_boat"],
  auto_transport: ["auto_repair", "towing_transport", "car_rental"],
  tech_office: ["it_computer", "office_workspace"],
  family_pets: ["education_childcare", "pet_services"],
  other_services: ["storage", "waste_septic", "laundry_dry_clean"],
};

/** Retired Option A catch-all — kept for redirects / discover URL normalization. */
export const LEGACY_SERVICE_CATEGORY_GROUP_SLUGS = ["marine_auto_more"] as const;

const SLUG_TO_GROUP = new Map<ServiceCategorySlug, ServiceCategoryGroupSlug>();
for (const groupSlug of SERVICE_CATEGORY_GROUP_SLUGS) {
  for (const member of SERVICE_CATEGORY_GROUP_MEMBERS[groupSlug]) {
    SLUG_TO_GROUP.set(member, groupSlug);
  }
}

export function serviceCategoryGroupForSlug(
  slug: ServiceCategorySlug,
): ServiceCategoryGroupSlug | null {
  return SLUG_TO_GROUP.get(slug) ?? null;
}
