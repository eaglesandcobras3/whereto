/**
 * Heuristic inference for storefront business metadata (category slug, business_type).
 * Maps to expanded `business_categories.slug` values in Supabase.
 *
 * Order matters: specific patterns before generic; title-strong signals before
 * excerpt noise (e.g. "jewelry" sold inside a gallery).
 */

const CATEGORY_HINTS: Array<{ pattern: RegExp; slug: string }> = [
  // Strong retail signals first (bogus business_type like "restaurant" for apparel shops is common)
  { pattern: /lululemon|athletic\s*wear/i, slug: "boutiques" },
  { pattern: /apparel|beach\s*essentials|swimwear|resort\s*wear|shopping\s*experience/i, slug: "boutiques" },
  { pattern: /outdoor\s*gear|general\s*store|surf\s*star|surf\s*shop/i, slug: "specialty_retail" },

  // Arts & entertainment (before generic "jewelry" in gallery excerpts)
  { pattern: /art\s*gallery|art_gallery|art\s*studio|art\s*activity|glass\s*shard|workshop|shard\s*shop/i, slug: "entertainment" },
  { pattern: /\bgallery\b/i, slug: "entertainment" },

  { pattern: /jewel(ry|er)\s*(store|shop)|jewelry\s*store/i, slug: "jewelry" },
  { pattern: /\bjewel(ry|er)\b/i, slug: "jewelry" },

  // Treats & bowls (before broad "restaurant" — acai/smoothie shops are not full restaurants)
  { pattern: /acai|smoothie\s*bowl|juice\s*bar|playa\s*bowls/i, slug: "desserts" },
  { pattern: /marble\s*slab|creamery/i, slug: "ice_cream" },

  // Event venues (search taxonomy — not in storefront browse groups)
  { pattern: /town\s*hall|event\s*venue|wedding\s*venue|banquet\s*hall/i, slug: "events" },

  // Food & drink
  { pattern: /restaurant|grill|bistro|steakhouse|sushi|taco|pizza|seafood|diner|eatery|cantina|trattoria|taqueria|ramen|pho|oyster|raw\s*bar/i, slug: "restaurants" },
  { pattern: /coffee|café|cafe|espresso|roaster|beignet/i, slug: "coffee_shops" },
  { pattern: /wine\s*shop|cafe\s*&\s*wine/i, slug: "coffee_shops" },
  { pattern: /\bbar\b|\bpub\b|brewery|brewpub|taproom|wine\s*bar|cocktail|tiki/i, slug: "bars" },
  { pattern: /ice\s*cream|gelato|frozen\s*yogurt|popsicle|pecan/i, slug: "ice_cream" },
  { pattern: /candy|fudge|chocolate|confection|praline/i, slug: "candy_sweets" },
  { pattern: /donut|doughnut/i, slug: "donut_shops" },
  { pattern: /bakery|dessert/i, slug: "desserts" },

  // Wellness & beauty (before "lounge" → bars false positive)
  { pattern: /beauty|salon|barber|nail|medi\s*spa|day\s*spa/i, slug: "beauty_wellness" },
  { pattern: /pilates|yoga|fitness|gym\b|lagree|crossfit|barre\s*studio/i, slug: "fitness" },
  { pattern: /wellness|infusion/i, slug: "beauty_wellness" },
  { pattern: /chiropract/i, slug: "chiropractic_wellness" },
  { pattern: /hair\s*salon/i, slug: "hair_salons" },
  { pattern: /nail\s*salon|manicure/i, slug: "nail_salons" },
  { pattern: /\bspa\b|massage/i, slug: "spas" },
  { pattern: /primary care|ascension|sacred heart|healthcare|medical group/i, slug: "medical_clinics" },

  // Lodging (before generic shop/store)
  { pattern: /\b(hotel|resort|inn|marriott|hyatt|motel|lodging|suites)\b/i, slug: "hotels" },

  // BOTE storefronts sell boards and apparel — not rentals/activities
  { pattern: /\bbote\b/i, slug: "shopping" },

  // Activities & surf (before "beach" in town names)
  { pattern: /surf\s*(school|club|lesson|rental)|paddleboard|kayak|bike\s*rental|tour\b|excursion|fishing\s*charter|adventure|water\s*sport|zipline/i, slug: "activities" },

  // Retail (specific before generic shop/store)
  { pattern: /boutique|clothing|fashion|dress|captured\s*clothing/i, slug: "boutiques" },
  { pattern: /shoe|footwear|sandal/i, slug: "footwear" },
  { pattern: /antique|home\s*d[eé]cor|gift\s*shop|lifestyle/i, slug: "specialty_retail" },
  { pattern: /shop|store|market|gift|souvenir|florist|retail/i, slug: "shopping" },

  // Places (narrow — avoid matching "Grayton Beach" town names)
  { pattern: /\bbeach\s*(state\s*park|county\s*park|access)\b/i, slug: "beaches" },
  { pattern: /event|concert|festival|live\s*music/i, slug: "events" },

  // Professional / home services
  { pattern: /real\s*estate|realtor|realty/i, slug: "real_estate" },
  { pattern: /insurance/i, slug: "insurance" },
  { pattern: /law\s*firm|attorney|legal/i, slug: "legal_services" },
  { pattern: /accountant|cpa|financial/i, slug: "financial_accounting" },
  { pattern: /title|escrow/i, slug: "title_escrow" },
  { pattern: /plumb|hvac|heating|air\s*condition/i, slug: "hvac_plumbing" },
  { pattern: /landscap|lawn/i, slug: "landscaping" },
  { pattern: /pest|extermin/i, slug: "pest_control" },
  { pattern: /contractor|handyman|remodel/i, slug: "contractors_handyman" },
  { pattern: /clean(ing)?|maid|janitor/i, slug: "cleaning_services" },
  { pattern: /photo/i, slug: "photography" },
  { pattern: /dentist|dental|orthodont/i, slug: "dental_orthodontics" },
  { pattern: /dermatolog|skin\s*care/i, slug: "dermatology_skin" },
  { pattern: /clinic|medical|physician/i, slug: "medical_clinics" },
  { pattern: /counsel|therap|mental\s*health/i, slug: "mental_health_counseling" },
  { pattern: /contractor|plumb|electric|hvac|roof|repair|paint/i, slug: "home_services" },
];

const BUSINESS_TYPE_HINTS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /jewel/i, type: "jewelry store" },
  { pattern: /coffee|café|cafe|espresso/i, type: "coffee shop" },
  { pattern: /restaurant|grill|bistro|steakhouse|sushi|taco|pizza|seafood|diner|taqueria/i, type: "restaurant" },
  { pattern: /bar\b|pub\b|brewery|brewpub|taproom/i, type: "bar" },
  { pattern: /ice\s*cream|gelato/i, type: "ice cream shop" },
  { pattern: /boutique/i, type: "boutique" },
  { pattern: /gallery|art\s*studio/i, type: "art gallery" },
  { pattern: /fitness|gym/i, type: "fitness center" },
  { pattern: /pilates/i, type: "Pilates studio" },
  { pattern: /wellness/i, type: "wellness center" },
  { pattern: /surf\s*(school|club|shop)/i, type: "surf shop" },
  { pattern: /bakery/i, type: "bakery" },
  { pattern: /pet\s*boutique|pet\s*store/i, type: "pet boutique" },
  { pattern: /florist/i, type: "florist" },
  { pattern: /antique/i, type: "antique shop" },
  { pattern: /bookstore|book\s*shop/i, type: "bookstore" },
  { pattern: /kayak|paddleboard|bike\s*rental/i, type: "rental shop" },
  { pattern: /salon|barber/i, type: "salon" },
  { pattern: /spa\b/i, type: "spa" },
  { pattern: /shop|store|market/i, type: "retail shop" },
];

function textBlob(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function inferCategorySlug(
  title: string,
  description: string | null,
  isServiceBusiness = false,
): string | null {
  const blob = textBlob([title, description]);
  for (const { pattern, slug } of CATEGORY_HINTS) {
    if (pattern.test(blob)) return slug;
  }
  return isServiceBusiness ? "professional_services" : null;
}

export function inferBusinessType(
  title: string,
  description: string | null,
  isServiceBusiness = false,
): string | null {
  const blob = textBlob([title, description]);
  for (const { pattern, type } of BUSINESS_TYPE_HINTS) {
    if (pattern.test(blob)) return type;
  }
  if (isServiceBusiness) return "service provider";
  return null;
}
