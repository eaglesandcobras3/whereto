import { getServiceSupabase } from "@/lib/supabase/service-role";

export type BusinessForPrompt = {
  id: string;
  name: string;
  category_name: string | null;
  town_name: string | null;
  price_level: number | null;
  google_rating: number | null;
};

export type EnrichmentData = {
  // Vibe & Atmosphere
  vibe: string[];
  crowd: string[];
  noiseLevel: string;
  // Practical
  bestTime: string[];
  reservations: string;
  parking: string;
  waitTime: string;
  // Use Cases
  goodFor: string[];
  notIdealFor: string[];
  pairsWith: string[];
  // Content
  oneLiner: string;
  localTip: string;
  highlights: string[];
  nearbyContext: string;
  // Scores
  familyScore: number;
  dateScore: number;
  valueScore: number;
};

export async function getEnrichmentStats() {
  const supabase = getServiceSupabase();

  const { count: total } = await supabase
    .from("businesses")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const { count: enriched } = await supabase
    .from("businesses")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .not("ai_reasoning_updated_at", "is", null);

  const { count: pending } = await supabase
    .from("businesses")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .is("ai_reasoning_updated_at", null);

  return {
    total: total ?? 0,
    enriched: enriched ?? 0,
    pending: pending ?? 0,
  };
}

/**
 * Get businesses that need enrichment for manual processing
 */
export async function getBusinessesForManualEnrichment(limit: number = 20): Promise<BusinessForPrompt[]> {
  const supabase = getServiceSupabase();

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      categories(name),
      towns(name),
      google_rating,
      price_level
    `)
    .eq("status", "active")
    .is("ai_reasoning_updated_at", null)
    .limit(limit);

  if (error || !businesses) {
    return [];
  }

  return businesses.map((b) => {
    const cat = b.categories as unknown as { name: string } | null;
    const town = b.towns as unknown as { name: string } | null;
    return {
      id: b.id,
      name: b.name,
      category_name: cat?.name ?? null,
      town_name: town?.name ?? null,
      google_rating: b.google_rating,
      price_level: b.price_level,
    };
  });
}

/**
 * Generate the prompt for ChatGPT
 */
export function generateManualPrompt(businesses: BusinessForPrompt[]): string {
  const businessList = businesses.map((biz, idx) => {
    const priceLabel = biz.price_level
      ? ["$", "$$", "$$$", "$$$$"][biz.price_level - 1] ?? "$$"
      : "$$";
    return `${idx + 1}. ID: ${biz.id}
   Name: ${biz.name}
   Category: ${biz.category_name ?? "Unknown"}
   Town: ${biz.town_name ?? "30A area"}
   Price: ${priceLabel}
   Rating: ${biz.google_rating ?? "N/A"}/5`;
  }).join("\n\n");

  return `You are a local expert for Florida's 30A/Emerald Coast area. Provide detailed insights for these ${businesses.length} businesses.

BUSINESSES:
${businessList}

For EACH business, return a JSON object with the business ID as key and these fields:

{
  "vibe": ["2-4 tags: romantic, casual, trendy, cozy, lively, upscale, laid-back, beachy, artsy, sophisticated, rustic, modern"],
  "crowd": ["2-3 tags: locals, tourists, families, couples, groups, solo travelers, young professionals, retirees"],
  "noiseLevel": "quiet | moderate | lively",

  "bestTime": ["2-3 suggestions: sunset, weekday lunch, Sunday brunch, happy hour, early dinner, late night"],
  "reservations": "required | recommended | walk-in friendly",
  "parking": "easy | street parking | valet | bike-friendly | walkable from town center",
  "waitTime": "no wait | 10-15 min typical | 30+ min at peak | call ahead",

  "goodFor": ["3-4 use cases: date night, family dinner, business lunch, girls trip, anniversary, quick bite, special occasion, casual hangout"],
  "notIdealFor": ["1-2 cases when to skip: large groups, quiet conversation, picky eaters, late night, budget-conscious"],
  "pairsWith": ["2-3 activities: beach day, shopping at nearby boutiques, sunset walk, gallery hopping, bike ride"],

  "oneLiner": "Catchy 10-15 word pitch that captures the essence",
  "localTip": "One insider tip a local would know",
  "highlights": ["2-3 standout features or must-tries"],
  "nearbyContext": "1 sentence about the immediate area and what's within walking distance",

  "familyScore": 1-5,
  "dateScore": 1-5,
  "valueScore": 1-5
}

Return ONLY valid JSON. Keys must be the exact business IDs provided.`;
}

/**
 * Save manually entered enrichment results
 */
export async function saveManualEnrichmentResults(
  jsonString: string
): Promise<{ saved: number; failed: number; errors: string[] }> {
  const supabase = getServiceSupabase();
  const errors: string[] = [];
  let saved = 0;
  let failed = 0;

  let parsed: Record<string, Partial<EnrichmentData>>;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { saved: 0, failed: 0, errors: ["Invalid JSON - make sure you copied the complete response"] };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { saved: 0, failed: 0, errors: ["JSON must be an object with business IDs as keys"] };
  }

  for (const [id, data] of Object.entries(parsed)) {
    if (!data || typeof data !== "object") {
      errors.push(`${id}: Invalid data format`);
      failed++;
      continue;
    }

    const updateData: Record<string, unknown> = {
      ai_reasoning_updated_at: new Date().toISOString(),
    };

    // Vibe & Atmosphere
    if (Array.isArray(data.vibe)) updateData.ai_vibe = data.vibe;
    if (Array.isArray(data.crowd)) updateData.ai_crowd = data.crowd;
    if (typeof data.noiseLevel === "string") updateData.ai_noise_level = data.noiseLevel;

    // Practical
    if (Array.isArray(data.bestTime)) updateData.ai_best_time = data.bestTime;
    if (typeof data.reservations === "string") updateData.ai_reservations = data.reservations;
    if (typeof data.parking === "string") updateData.ai_parking = data.parking;
    if (typeof data.waitTime === "string") updateData.ai_wait_time = data.waitTime;

    // Use Cases
    if (Array.isArray(data.goodFor)) updateData.ai_good_for = data.goodFor;
    if (Array.isArray(data.notIdealFor)) updateData.ai_not_ideal_for = data.notIdealFor;
    if (Array.isArray(data.pairsWith)) updateData.ai_pairs_with = data.pairsWith;

    // Content
    if (typeof data.oneLiner === "string") updateData.ai_one_liner = data.oneLiner;
    if (typeof data.localTip === "string") updateData.ai_local_tip = data.localTip;
    if (Array.isArray(data.highlights)) updateData.ai_highlights = data.highlights;
    if (typeof data.nearbyContext === "string") updateData.ai_nearby_context = data.nearbyContext;

    // Scores
    if (typeof data.familyScore === "number") updateData.ai_family_score = Math.min(5, Math.max(1, data.familyScore));
    if (typeof data.dateScore === "number") updateData.ai_date_score = Math.min(5, Math.max(1, data.dateScore));
    if (typeof data.valueScore === "number") updateData.ai_value_score = Math.min(5, Math.max(1, data.valueScore));

    const { error: updateError } = await supabase
      .from("businesses")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      errors.push(`${id}: ${updateError.message}`);
      failed++;
    } else {
      saved++;
    }
  }

  return { saved, failed, errors };
}
