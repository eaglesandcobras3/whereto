/**
 * Unified category taxonomy from docs/categories.csv.
 * Rollups (parents) + leaf categories; used for seed, hubs, and intake.
 */

export type UnifiedRollup = {
  title: string;
  slug: string;
};

export type UnifiedLeaf = {
  title: string;
  slug: string;
  rollupSlug: string;
  rollupTitle: string;
};

/** Duplicate subcategory titles get rollup-prefixed slugs. */
const SLUG_OVERRIDES: Record<string, string> = {
  "Shopping|Jewelry": "shopping_jewelry",
  "Retail Services|Jewelry": "retail_jewelry",
  "Automotive|Golf Cart Rentals": "automotive_golf_cart_rentals",
  "Rentals|Golf Cart Rentals": "rentals_golf_cart_rentals",
};

export function slugifyCategoryLabel(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

/** Canonical rows from categories.csv (source of truth for the unified taxonomy). */
export const UNIFIED_CATEGORY_ROWS: ReadonlyArray<{ rollup: string; leaf: string }> = [
  { rollup: "Food & Drink", leaf: "Restaurants" },
  { rollup: "Food & Drink", leaf: "Bars" },
  { rollup: "Food & Drink", leaf: "Coffee Shops" },
  { rollup: "Food & Drink", leaf: "Bakeries & Desserts" },
  { rollup: "Food & Drink", leaf: "Breweries & Wine" },
  { rollup: "Shopping", leaf: "Boutiques & Apparel" },
  { rollup: "Shopping", leaf: "Jewelry" },
  { rollup: "Shopping", leaf: "Home & Gifts" },
  { rollup: "Shopping", leaf: "Specialty Retail" },
  { rollup: "Shopping", leaf: "Art Galleries" },
  { rollup: "Things To Do", leaf: "Outdoor Activities" },
  { rollup: "Things To Do", leaf: "Water Activities" },
  { rollup: "Things To Do", leaf: "Attractions" },
  { rollup: "Things To Do", leaf: "Entertainment" },
  { rollup: "Things To Do", leaf: "Arts & Culture" },
  { rollup: "Beauty & Wellness", leaf: "Hair Salons" },
  { rollup: "Beauty & Wellness", leaf: "Nail Salons" },
  { rollup: "Beauty & Wellness", leaf: "Spas" },
  { rollup: "Beauty & Wellness", leaf: "Fitness Studios" },
  { rollup: "Beauty & Wellness", leaf: "Wellness" },
  { rollup: "Medical", leaf: "Medical Clinics" },
  { rollup: "Medical", leaf: "Dental" },
  { rollup: "Medical", leaf: "Dermatology" },
  { rollup: "Medical", leaf: "Chiropractic" },
  { rollup: "Medical", leaf: "Mental Health" },
  { rollup: "Medical", leaf: "Veterinary" },
  { rollup: "Places to Stay", leaf: "Hotels & Resorts" },
  { rollup: "Places to Stay", leaf: "Vacation Rentals" },
  { rollup: "Places to Stay", leaf: "Campgrounds & RV Parks" },
  { rollup: "Professional", leaf: "Real Estate" },
  { rollup: "Professional", leaf: "Financial Services" },
  { rollup: "Professional", leaf: "Legal" },
  { rollup: "Professional", leaf: "Insurance" },
  { rollup: "Professional", leaf: "Business Services" },
  { rollup: "Home Services", leaf: "Contractors" },
  { rollup: "Home Services", leaf: "Handyman" },
  { rollup: "Home Services", leaf: "Home Improvement" },
  { rollup: "Home Services", leaf: "Electrical" },
  { rollup: "Home Services", leaf: "Plumbing" },
  { rollup: "Home Services", leaf: "HVAC" },
  { rollup: "Home Services", leaf: "Roofing" },
  { rollup: "Home Services", leaf: "Flooring" },
  { rollup: "Home Services", leaf: "Painting" },
  { rollup: "Home Services", leaf: "Concrete & Masonry" },
  { rollup: "Home Services", leaf: "Windows & Doors" },
  { rollup: "Home Services", leaf: "Appliance Repair" },
  { rollup: "Home Services", leaf: "Restoration" },
  { rollup: "Home Services", leaf: "Pressure Washing" },
  { rollup: "Home Services", leaf: "Cleaning" },
  { rollup: "Home Services", leaf: "Junk Removal" },
  { rollup: "Home Services", leaf: "Moving" },
  { rollup: "Home Services", leaf: "Home Inspection" },
  { rollup: "Home Services", leaf: "Security Systems" },
  { rollup: "Home Services", leaf: "Solar" },
  { rollup: "Home Services", leaf: "Pest Control" },
  { rollup: "Home Services", leaf: "Lawn Care" },
  { rollup: "Home Services", leaf: "Landscaping" },
  { rollup: "Home Services", leaf: "Irrigation" },
  { rollup: "Home Services", leaf: "Pool & Spa" },
  { rollup: "Home Services", leaf: "Property Management" },
  { rollup: "Creative Services", leaf: "Marketing" },
  { rollup: "Creative Services", leaf: "Photography" },
  { rollup: "Creative Services", leaf: "Videography" },
  { rollup: "Creative Services", leaf: "Graphic Design" },
  { rollup: "Creative Services", leaf: "Web Design" },
  { rollup: "Creative Services", leaf: "Branding" },
  { rollup: "Creative Services", leaf: "Interior Design" },
  { rollup: "Creative Services", leaf: "Architecture" },
  { rollup: "Creative Services", leaf: "Event Planning" },
  { rollup: "Creative Services", leaf: "Wedding Services" },
  { rollup: "Creative Services", leaf: "Catering" },
  { rollup: "Automotive", leaf: "Auto Repair" },
  { rollup: "Automotive", leaf: "Car Rental" },
  { rollup: "Automotive", leaf: "Towing" },
  { rollup: "Automotive", leaf: "Mobile Detailing" },
  { rollup: "Automotive", leaf: "Golf Cart Sales" },
  { rollup: "Automotive", leaf: "Golf Cart Rentals" },
  { rollup: "Automotive", leaf: "Golf Cart Repair" },
  { rollup: "Marine", leaf: "Boat Rentals" },
  { rollup: "Marine", leaf: "Boat Repair" },
  { rollup: "Marine", leaf: "Boat Storage" },
  { rollup: "Marine", leaf: "Marine Services" },
  { rollup: "Marine", leaf: "Fishing Charters" },
  { rollup: "Marine", leaf: "Dock Services" },
  { rollup: "Marine", leaf: "Jet Ski Rentals" },
  { rollup: "Family & Education", leaf: "Childcare" },
  { rollup: "Family & Education", leaf: "Education" },
  { rollup: "Family & Education", leaf: "Tutoring" },
  { rollup: "Family & Education", leaf: "Music Lessons" },
  { rollup: "Family & Education", leaf: "Pet Services" },
  { rollup: "Technology", leaf: "IT Services" },
  { rollup: "Technology", leaf: "Computer Repair" },
  { rollup: "Technology", leaf: "Web Development" },
  { rollup: "Technology", leaf: "Coworking" },
  { rollup: "Technology", leaf: "Printing Services" },
  { rollup: "Retail Services", leaf: "Apparel" },
  { rollup: "Retail Services", leaf: "Coastal Apparel" },
  { rollup: "Retail Services", leaf: "Jewelry" },
  { rollup: "Retail Services", leaf: "Home Decor" },
  { rollup: "Retail Services", leaf: "Coastal Gifts" },
  { rollup: "Retail Services", leaf: "Artwork" },
  { rollup: "Retail Services", leaf: "Furniture" },
  { rollup: "Retail Services", leaf: "Online Retail" },
  { rollup: "Retail Services", leaf: "E-commerce" },
  { rollup: "Rentals", leaf: "Vacation Rental Management" },
  { rollup: "Rentals", leaf: "Equipment Rentals" },
  { rollup: "Rentals", leaf: "Bike Rentals" },
  { rollup: "Rentals", leaf: "Golf Cart Rentals" },
  { rollup: "Rentals", leaf: "Baby Equipment Rentals" },
  { rollup: "Rentals", leaf: "Event Rentals" },
];

function leafSlugFor(rollupTitle: string, leafTitle: string): string {
  const key = `${rollupTitle}|${leafTitle}`;
  if (SLUG_OVERRIDES[key]) return SLUG_OVERRIDES[key];
  return slugifyCategoryLabel(leafTitle);
}

export function getUnifiedRollups(): UnifiedRollup[] {
  const seen = new Set<string>();
  const out: UnifiedRollup[] = [];
  for (const row of UNIFIED_CATEGORY_ROWS) {
    const slug = slugifyCategoryLabel(row.rollup);
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({ title: row.rollup, slug });
  }
  return out;
}

export function getUnifiedLeaves(): UnifiedLeaf[] {
  return UNIFIED_CATEGORY_ROWS.map((row) => ({
    title: row.leaf,
    slug: leafSlugFor(row.rollup, row.leaf),
    rollupSlug: slugifyCategoryLabel(row.rollup),
    rollupTitle: row.rollup,
  }));
}

/**
 * Old `business_categories.slug` → new leaf slug.
 * Unmapped old storefront slugs are reported as uncategorized by the migration script.
 */
export const OLD_STOREFRONT_SLUG_TO_LEAF: Record<string, string> = {
  restaurants: "restaurants",
  bars: "bars",
  coffee_shops: "coffee_shops",
  desserts: "bakeries_and_desserts",
  ice_cream: "bakeries_and_desserts",
  donut_shops: "bakeries_and_desserts",
  candy_sweets: "bakeries_and_desserts",
  boutiques: "boutiques_and_apparel",
  jewelry: "shopping_jewelry",
  specialty_retail: "specialty_retail",
  shopping: "specialty_retail",
  footwear: "boutiques_and_apparel",
  activities: "outdoor_activities",
  entertainment: "entertainment",
  beauty_wellness: "wellness",
  spas: "spas",
  hair_salons: "hair_salons",
  nail_salons: "nail_salons",
  fitness: "fitness_studios",
  medical_clinics: "medical_clinics",
  dental_orthodontics: "dental",
  health_medical: "medical_clinics",
  mental_health_counseling: "mental_health",
  hospice_rehab: "medical_clinics",
  chiropractic_wellness: "chiropractic",
  dermatology_skin: "dermatology",
  hotels: "hotels_and_resorts",
  financial_accounting: "financial_services",
  insurance: "insurance",
  banking: "financial_services",
  real_estate: "real_estate",
  title_escrow: "real_estate",
  legal_services: "legal",
  professional_services: "business_services",
  photography: "photography",
  cleaning_services: "cleaning",
  contractors_handyman: "contractors",
  home_improvement: "home_improvement",
  home_services: "home_improvement",
  hvac_plumbing: "hvac",
  landscaping: "landscaping",
  pest_control: "pest_control",
  events: "event_planning",
};

/**
 * Old `service_categories.slug` → new leaf slug.
 */
export const OLD_SERVICE_SLUG_TO_LEAF: Record<string, string> = {
  accounting: "financial_services",
  appliance_repair: "appliance_repair",
  auto_repair: "auto_repair",
  car_rental: "car_rental",
  cleaning: "cleaning",
  concrete_masonry: "concrete_and_masonry",
  contractors: "contractors",
  counseling: "mental_health",
  design_architecture: "architecture",
  education_childcare: "childcare",
  electrical: "electrical",
  engineering_survey: "business_services",
  catering_events: "catering",
  events_wedding: "wedding_services",
  home_exterior: "windows_and_doors",
  financial: "financial_services",
  fitness_wellness: "fitness_studios",
  flooring: "flooring",
  handyman: "handyman",
  health_medical: "medical_clinics",
  home_improvement: "home_improvement",
  home_inspection: "home_inspection",
  home_staging: "business_services",
  hvac: "hvac",
  insurance: "insurance",
  irrigation: "irrigation",
  it_computer: "it_services",
  junk_removal: "junk_removal",
  landscaping: "landscaping",
  laundry_dry_clean: "cleaning",
  lawn_care: "lawn_care",
  legal: "legal",
  marine_boat: "marine_services",
  marketing_creative: "marketing",
  moving: "moving",
  office_workspace: "coworking",
  painting: "painting",
  pest_control: "pest_control",
  pet_services: "pet_services",
  photography: "photography",
  plumbing: "plumbing",
  pool_spa: "pool_and_spa",
  pressure_washing: "pressure_washing",
  property_management: "property_management",
  real_estate: "real_estate",
  restoration: "restoration",
  roofing: "roofing",
  salon_spa: "spas",
  security_systems: "security_systems",
  solar_energy: "solar",
  staffing: "business_services",
  storage: "boat_storage",
  towing_transport: "towing",
  vacation_rentals: "vacation_rental_management",
  veterinary: "veterinary",
  waste_septic: "junk_removal",
};

/**
 * Catch-all `services` (and other unmapped) listings that need an explicit leaf.
 * Keys are `businesses.slug`.
 */
export const BUSINESS_SLUG_TO_LEAF: Record<string, string> = {
  "ohana-day-school-grand-boulevard": "childcare",
  "ohana-day-school-30avenue": "childcare",
  "hill-coleman-cpa-firm-business-advisors": "financial_services",
  "watersound-title-agency": "real_estate",
  "dermatology-specialists-of-florida-and-aqua-medical-spa": "dermatology",
};
