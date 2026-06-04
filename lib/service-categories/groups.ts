import type { ServiceCategorySlug } from "@/lib/service-categories/constants";

/** Hub / filter section groupings (not a DB table yet; optional `group_slug` on rows later). */
export const SERVICE_CATEGORY_GROUP_SLUGS = [
  "outdoor_property",
  "home_trades",
  "marine",
  "professional",
  "health_wellness",
  "creative_events",
  "tech_office",
  "auto_transport",
  "family_pets",
  "other_services",
] as const;

export type ServiceCategoryGroupSlug = (typeof SERVICE_CATEGORY_GROUP_SLUGS)[number];

export const SERVICE_CATEGORY_GROUP_LABELS: Record<ServiceCategoryGroupSlug, string> = {
  outdoor_property: "Outdoor & property",
  home_trades: "Home trades",
  marine: "Marine",
  professional: "Professional & financial",
  health_wellness: "Health & wellness",
  creative_events: "Creative & events",
  tech_office: "Tech & workspace",
  auto_transport: "Auto & transport",
  family_pets: "Family, pets & education",
  other_services: "Other services",
};

/** Which specialty slug belongs to which hub section. */
export const SERVICE_CATEGORY_GROUP_MEMBERS: Record<
  ServiceCategoryGroupSlug,
  readonly ServiceCategorySlug[]
> = {
  outdoor_property: [
    "landscaping",
    "lawn_care",
    "pool_spa",
    "irrigation",
    "pest_control",
    "property_management",
    "vacation_rentals",
    "home_staging",
  ],
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
  marine: ["marine_boat"],
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
  creative_events: [
    "design_architecture",
    "photography",
    "events_wedding",
    "catering_events",
    "marketing_creative",
  ],
  tech_office: ["it_computer", "office_workspace"],
  auto_transport: ["auto_repair", "towing_transport", "car_rental"],
  family_pets: ["education_childcare", "pet_services"],
  other_services: ["storage", "waste_septic", "laundry_dry_clean"],
};

export function serviceCategoryGroupForSlug(
  slug: ServiceCategorySlug,
): ServiceCategoryGroupSlug | null {
  for (const group of SERVICE_CATEGORY_GROUP_SLUGS) {
    if (SERVICE_CATEGORY_GROUP_MEMBERS[group].includes(slug)) return group;
  }
  return null;
}
