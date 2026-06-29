/**
 * Target `business_categories.slug` for listings stuck in the legacy `services` catch-all.
 * Used by scripts/recategorize-services-bucket.ts — keep in sync with browse groups in groups.ts.
 */

import { inferCategorySlug } from "@/lib/search/infer-business-metadata";

const SERVICE_SPECIALTY_TO_CATEGORY: Record<string, string> = {
  health_medical: "medical_clinics",
  counseling: "mental_health_counseling",
  accounting: "financial_accounting",
  financial: "financial_accounting",
  legal: "legal_services",
  insurance: "insurance",
  real_estate: "real_estate",
  vacation_rentals: "real_estate",
  home_improvement: "home_improvement",
  contractors: "contractors_handyman",
  plumbing: "hvac_plumbing",
  hvac: "hvac_plumbing",
  handyman: "contractors_handyman",
  pest_control: "pest_control",
  landscaping: "landscaping",
  cleaning: "cleaning_services",
  restoration: "home_improvement",
  flooring: "home_improvement",
  home_exterior: "home_improvement",
  design_architecture: "professional_services",
  home_inspection: "professional_services",
  towing_transport: "professional_services",
  office_workspace: "professional_services",
  marine_boat: "activities",
  security_systems: "professional_services",
  painting: "home_improvement",
};

/** Per-slug overrides when heuristics are wrong. */
const SLUG_OVERRIDES: Record<string, string> = {
  "the-pearl-hotel-rosemary-beach": "hotels",
  "rosemary-beach-inn": "hotels",
  "hyatt-place-sandestin": "hotels",
  "residence-inn-by-marriott-sandestin": "hotels",
  "the-lodge-30a-seagrove-beach": "hotels",
  "walton-county-tourism-department": "activities",
  "frankies-bike-shop": "specialty_retail",
  "modernmade-photography": "photography",
  "destin-cleaners": "professional_services",
  "eventure-florida-30a": "activities",
  "elizabeth-erin-designs": "professional_services",
  "my-vacation-haven": "real_estate",
  "sandestin-owners-association": "professional_services",
  "nuwell-medicine": "medical_clinics",
  "optimal-bio": "medical_clinics",
  "its-lit-bonfires-llc": "activities",
};

type Input = {
  slug: string;
  title: string;
  excerpt: string | null;
  business_type: string | null;
  is_service_business: boolean;
  service_category_slug: string | null;
};

function textBlob(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function matchPattern(blob: string, rules: Array<{ pattern: RegExp; slug: string }>): string | null {
  for (const { pattern, slug } of rules) {
    if (pattern.test(blob)) return slug;
  }
  return null;
}

const HEURISTICS: Array<{ pattern: RegExp; slug: string }> = [
  { pattern: /dental|orthodont|smile/i, slug: "dental_orthodontics" },
  { pattern: /chiropract/i, slug: "chiropractic_wellness" },
  { pattern: /dermatolog|skin\s*(care|wellness)|restore\s*skin/i, slug: "dermatology_skin" },
  {
    pattern: /medical|clinic|physician|hospital|emergency|rehab|hospice|mental\s*health|counsel|therapy|wellness\s*center|infusion|medicine|prescription|assistant\s*care|yogo/i,
    slug: "medical_clinics",
  },
  { pattern: /cpa|accountant|accounting|tax\b|financial|wealth|advisor|bank\b|wells\s*fargo/i, slug: "financial_accounting" },
  { pattern: /insurance|farm\s*bureau/i, slug: "insurance" },
  { pattern: /attorney|law\s*firm|law\b|legal|pllc|llp/i, slug: "legal_services" },
  { pattern: /title|escrow/i, slug: "title_escrow" },
  { pattern: /real\s*estate|realtor|realty|property\s*group|vacation\s*rental|rental\s*management|850\s*title/i, slug: "real_estate" },
  { pattern: /salon|spa\b|drybar|beauty|nail|hair|barber|flexspace|beachworx/i, slug: "hair_salons" },
  { pattern: /pilates|yoga|fitness|gym\b/i, slug: "fitness" },
  { pattern: /photograph/i, slug: "photography" },
  { pattern: /post\s*office|ups\s*store|fedex/i, slug: "specialty_retail" },
  { pattern: /bike\s*shop|cleaners|laundry/i, slug: "specialty_retail" },
  { pattern: /\b(hotel|resort|inn|marriott|hyatt|motel|lodging|suites)\b/i, slug: "hotels" },
  { pattern: /tourism|paddle|bonfire|eventure/i, slug: "activities" },
  { pattern: /contractor|handyman|shutter|cabinet|countertop|flooring|shelfgenie|home\s*service|ip\s*camera|overhead\s*door|inspect/i, slug: "home_improvement" },
  { pattern: /consulting/i, slug: "professional_services" },
];

export function inferServicesBucketCategorySlug(input: Input): string | null {
  const override = SLUG_OVERRIDES[input.slug];
  if (override) return override;

  if (input.service_category_slug) {
    const mapped = SERVICE_SPECIALTY_TO_CATEGORY[input.service_category_slug];
    if (mapped) return mapped;
  }

  const blob = textBlob([input.title, input.business_type, input.excerpt]);
  const fromHeuristic = matchPattern(blob, HEURISTICS);
  if (fromHeuristic) return fromHeuristic;

  const inferred = inferCategorySlug(input.title, input.excerpt, input.is_service_business);
  if (inferred && inferred !== "services") return inferred;

  if (input.is_service_business) {
    return "professional_services";
  }

  return "professional_services";
}
