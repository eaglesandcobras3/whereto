import type { ServiceCategorySlug } from "@/lib/service-categories/constants";
import { normalizeServiceCategorySlug } from "@/lib/service-categories/normalize";

/** Heuristic map for audits — not authoritative vs OpenAI classify. */
const BUSINESS_TYPE_HINTS: Array<{ pattern: RegExp; slug: ServiceCategorySlug }> = [
  {
    pattern:
      /insurance|state\s*farm|allstate|farm\s*bureau|geico|progressive|liberty\s*mutual|farmers\s*insurance|insurance\s*agent/i,
    slug: "insurance",
  },
  { pattern: /account|cpa|bookkeep|payroll|tax/i, slug: "accounting" },
  { pattern: /law\s*firm|attorneys?\s+at\s+law|attorney|pllc|pllc\.|legal/i, slug: "legal" },
  { pattern: /title|escrow|realtor|realty|real\s*estate/i, slug: "real_estate" },
  { pattern: /financial|wealth|advisor/i, slug: "financial" },
  {
    pattern:
      /hospice|home\s*health|healthcare|physician|dentist|dental|dermatolog|medical|clinic|hospital|rehab|orthodont|pediatric|surgery/i,
    slug: "health_medical",
  },
  { pattern: /counsel|therap|mental\s*health/i, slug: "counseling" },
  { pattern: /veterinar/i, slug: "veterinary" },
  { pattern: /salon|barber|nail|\bspa\b/i, slug: "salon_spa" },
  { pattern: /pilates|yoga|fitness|gym/i, slug: "fitness_wellness" },
  { pattern: /plumb/i, slug: "plumbing" },
  { pattern: /hvac|heating|air\s*condition/i, slug: "hvac" },
  { pattern: /electric/i, slug: "electrical" },
  { pattern: /paint/i, slug: "painting" },
  { pattern: /handyman/i, slug: "handyman" },
  { pattern: /roof/i, slug: "roofing" },
  { pattern: /pest|extermin|termite/i, slug: "pest_control" },
  { pattern: /landscap/i, slug: "landscaping" },
  { pattern: /lawn|mow/i, slug: "lawn_care" },
  { pattern: /pool|spa\s*service/i, slug: "pool_spa" },
  { pattern: /clean|maid|janitor/i, slug: "cleaning" },
  { pattern: /pressure\s*wash/i, slug: "pressure_washing" },
  { pattern: /mov(e|ing)|haul/i, slug: "moving" },
  { pattern: /junk|debris/i, slug: "junk_removal" },
  { pattern: /marine|boat|watersport|charter|paddleboard/i, slug: "marine_boat" },
  { pattern: /contractor|remodel|builder/i, slug: "contractors" },
  { pattern: /cabinet|closet|countertop|blind|draper|window\s*treatment/i, slug: "home_improvement" },
  { pattern: /window\s*company|door\s*company|gutter|fenc/i, slug: "home_exterior" },
  { pattern: /floor/i, slug: "flooring" },
  { pattern: /inspect/i, slug: "home_inspection" },
  { pattern: /security|alarm/i, slug: "security_systems" },
  { pattern: /restor|mold|water\s*damage/i, slug: "restoration" },
  { pattern: /property\s*manag|hoa/i, slug: "property_management" },
  { pattern: /vacation\s*rental|str\s/i, slug: "vacation_rentals" },
  { pattern: /interior\s*design|architect/i, slug: "design_architecture" },
  { pattern: /engineer|survey/i, slug: "engineering_survey" },
  { pattern: /cowork|flex\s*space|office\s*space/i, slug: "office_workspace" },
  { pattern: /photo/i, slug: "photography" },
  { pattern: /wedding|event\s*planner|florist|dj\b/i, slug: "events_wedding" },
  { pattern: /cater/i, slug: "catering_events" },
  { pattern: /marketing|advertis|signage|print/i, slug: "marketing_creative" },
  { pattern: /\bit\b|computer|software|web\s*design|msp/i, slug: "it_computer" },
  { pattern: /auto|mechanic|body\s*shop/i, slug: "auto_repair" },
  { pattern: /tow|limo|car\s*service|transport/i, slug: "towing_transport" },
  { pattern: /car\s*rental/i, slug: "car_rental" },
  { pattern: /daycare|childcare|tutor|school/i, slug: "education_childcare" },
  { pattern: /pet\s|groom|boarding|kennel/i, slug: "pet_services" },
  { pattern: /storage/i, slug: "storage" },
  { pattern: /septic|dumpster|portable\s*toilet|waste/i, slug: "waste_septic" },
  { pattern: /laundr|dry\s*clean/i, slug: "laundry_dry_clean" },
  { pattern: /staffing|recruit|employ/i, slug: "staffing" },
  { pattern: /solar|generator/i, slug: "solar_energy" },
  { pattern: /appliance/i, slug: "appliance_repair" },
  { pattern: /concrete|mason/i, slug: "concrete_masonry" },
  { pattern: /irrigation|sprinkler/i, slug: "irrigation" },
];

/** Patterns that usually mean the listing should NOT be a service vendor. */
export const STOREFRONT_BUSINESS_TYPE_PATTERNS = [
  /restaurant/i,
  /bar\b|bar\s+and\s+grill|brewpub|tiki/i,
  /coffee\s*shop|cafe\b/i,
  /bakery/i,
  /hotel\b|resort\b/i,
  /retail\s*shop|boutique|grocery|hardware\s*store|furniture\s*store|jewelry/i,
  /outlet\s*mall/i,
  /golf\s*course/i,
  /family\s*attraction|arcade|theater/i,
  /surf\s*shop/i,
];

function suggestFromText(text: string): ServiceCategorySlug | null {
  const t = text.trim();
  if (!t) return null;
  for (const { pattern, slug } of BUSINESS_TYPE_HINTS) {
    if (pattern.test(t)) return slug;
  }
  const normalized = normalizeServiceCategorySlug(t);
  return normalized as ServiceCategorySlug | null;
}

export function suggestServiceCategoryFromBusinessType(
  businessType: string | null | undefined,
): ServiceCategorySlug | null {
  if (!businessType?.trim()) return null;
  return suggestFromText(businessType);
}

/** Fallback when the model omits a row or returns an unmappable slug. */
export function suggestServiceCategoryFromListing(input: {
  title: string;
  business_type?: string | null;
  excerpt?: string | null;
  search_keywords?: string | null;
}): ServiceCategorySlug | null {
  const fromType = suggestServiceCategoryFromBusinessType(input.business_type);
  if (fromType) return fromType;
  const blob = [input.title, input.excerpt, input.search_keywords].filter(Boolean).join(" ");
  return suggestFromText(blob);
}

export function looksLikeStorefrontBusinessType(businessType: string | null | undefined): boolean {
  if (!businessType?.trim()) return false;
  return STOREFRONT_BUSINESS_TYPE_PATTERNS.some((p) => p.test(businessType));
}
