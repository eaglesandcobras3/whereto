/** Canonical `service_categories.slug` values (seeded in migration). */
export const SERVICE_CATEGORY_SLUGS = [
  "landscaping",
  "lawn_care",
  "pool_spa",
  "cleaning",
  "pressure_washing",
  "plumbing",
  "electrical",
  "hvac",
  "painting",
  "handyman",
  "roofing",
  "pest_control",
  "moving",
  "marine_boat",
  "contractors",
  "property_management",
  "other",
] as const;

export type ServiceCategorySlug = (typeof SERVICE_CATEGORY_SLUGS)[number];

export const SERVICE_CATEGORY_ICONS: Record<string, string> = {
  landscaping: "yard",
  lawn_care: "grass",
  pool_spa: "pool",
  cleaning: "cleaning_services",
  pressure_washing: "water_drop",
  plumbing: "plumbing",
  electrical: "bolt",
  hvac: "ac_unit",
  painting: "format_paint",
  handyman: "handyman",
  roofing: "roofing",
  pest_control: "pest_control",
  moving: "local_shipping",
  marine_boat: "sailing",
  contractors: "construction",
  property_management: "apartment",
  other: "home_repair_service",
};
