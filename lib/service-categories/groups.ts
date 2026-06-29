import type { ServiceCategorySlug } from "@/lib/service-categories/constants";

/**
 * End-user browse groups for `/services` hub (Option A — six rolled-up sections).
 * Granular `service_categories.slug` values stay in the DB for search / `?specialty=`.
 */
export const SERVICE_CATEGORY_GROUP_SLUGS = [
  "home_trades",
  "outdoor_property",
  "professional",
  "health_wellness",
  "vacation_guest",
  "marine_auto_more",
] as const;

export type ServiceCategoryGroupSlug = (typeof SERVICE_CATEGORY_GROUP_SLUGS)[number];

export const SERVICE_CATEGORY_GROUP_LABELS: Record<ServiceCategoryGroupSlug, string> = {
  home_trades: "Home trades",
  outdoor_property: "Outdoor & property",
  professional: "Professional & financial",
  health_wellness: "Health & wellness",
  vacation_guest: "Vacation & guest services",
  marine_auto_more: "Marine, auto & more",
};

/** Material icon per browse group (CollapsibleBrowseSection). */
export const SERVICE_CATEGORY_GROUP_ICONS: Record<ServiceCategoryGroupSlug, string> = {
  home_trades: "handyman",
  outdoor_property: "yard",
  professional: "account_balance",
  health_wellness: "spa",
  vacation_guest: "holiday_village",
  marine_auto_more: "more_horiz",
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
  marine_auto_more: [
    "marine_boat",
    "towing_transport",
    "auto_repair",
    "car_rental",
    "design_architecture",
    "photography",
    "events_wedding",
    "catering_events",
    "marketing_creative",
    "it_computer",
    "office_workspace",
    "education_childcare",
    "pet_services",
    "storage",
    "waste_septic",
    "laundry_dry_clean",
  ],
};

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
