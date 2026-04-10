import { getServiceSupabase } from "@/lib/supabase/service-role";

export type TownForPrompt = {
  id: number;
  name: string;
  slug: string;
};

export async function getTownEnrichmentStats() {
  const supabase = getServiceSupabase();

  const { count: total } = await supabase
    .from("towns")
    .select("*", { count: "exact", head: true });

  const { count: enriched } = await supabase
    .from("towns")
    .select("*", { count: "exact", head: true })
    .not("ai_enrichment_updated_at", "is", null);

  const { count: pending } = await supabase
    .from("towns")
    .select("*", { count: "exact", head: true })
    .is("ai_enrichment_updated_at", null);

  return {
    total: total ?? 0,
    enriched: enriched ?? 0,
    pending: pending ?? 0,
  };
}

export async function getTownsForManualEnrichment(limit: number = 20): Promise<TownForPrompt[]> {
  const supabase = getServiceSupabase();

  const { data: towns, error } = await supabase
    .from("towns")
    .select("id, name, slug")
    .is("ai_enrichment_updated_at", null)
    .limit(limit);

  if (error || !towns) {
    return [];
  }

  return towns;
}

export function generateTownPrompt(towns: TownForPrompt[]): string {
  const townList = towns.map((t, idx) => {
    return `${idx + 1}. ID: ${t.id}
   Name: ${t.name}
   Slug: ${t.slug}`;
  }).join("\n\n");

  return `You are a local expert for Florida's 30A/Emerald Coast area. Provide detailed insights for these ${towns.length} beach towns.

TOWNS:
${townList}

For EACH town, return a JSON object with the town ID (as a number) as key and these fields:

{
  "tagline": "Catchy 8-12 word tagline capturing the town's essence",
  "description": "2-3 sentence overview of the town's character and appeal",
  "vibe": ["3-4 tags: upscale, bohemian, family-friendly, romantic, artsy, laid-back, exclusive, lively, quiet, charming"],
  "knownFor": ["3-4 things: white sand beaches, architecture, boutique shopping, fine dining, art galleries, etc."],

  "bestFor": ["3-4 visitor types: couples, families with kids, luxury travelers, art lovers, foodies"],
  "notIdealFor": ["1-2: budget travelers, nightlife seekers, etc."],
  "bestTimeToVisit": ["2-3: spring break, fall shoulder season, sunset hour, Sunday morning"],
  "parkingSituation": "Description of parking (free lots, paid, street, golf cart friendly)",
  "walkability": "How walkable is it (very walkable, need a bike, car recommended)",

  "mustSee": ["3-4 must-see spots or experiences specific to this town"],
  "hiddenGems": ["2-3 lesser-known spots locals love"],
  "localTips": ["2-3 insider tips for visiting this town"],
  "foodScene": "1-2 sentences describing the dining options and style",
  "nightlife": "1 sentence on evening/nightlife scene",
  "familyActivities": ["2-3 family-friendly activities"],
  "romanticSpots": ["2-3 romantic spots for couples"],

  "nearbyTowns": ["2-3 adjacent 30A towns worth visiting"],
  "dayTripIdeas": ["2-3 activities combining this town with nearby areas"],

  "familyScore": 1-5,
  "romanceScore": 1-5,
  "nightlifeScore": 1-5,
  "budgetScore": 1-5
}

Return ONLY valid JSON. Keys must be the exact town IDs (as numbers) provided.`;
}

export async function saveTownEnrichmentResults(
  jsonString: string
): Promise<{ saved: number; failed: number; errors: string[] }> {
  const supabase = getServiceSupabase();
  const errors: string[] = [];
  let saved = 0;
  let failed = 0;

  let parsed: Record<string, Record<string, unknown>>;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { saved: 0, failed: 0, errors: ["Invalid JSON - make sure you copied the complete response"] };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { saved: 0, failed: 0, errors: ["JSON must be an object with town IDs as keys"] };
  }

  for (const [idStr, data] of Object.entries(parsed)) {
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      errors.push(`${idStr}: Invalid town ID`);
      failed++;
      continue;
    }

    if (!data || typeof data !== "object") {
      errors.push(`${id}: Invalid data format`);
      failed++;
      continue;
    }

    const updateData: Record<string, unknown> = {
      ai_enrichment_updated_at: new Date().toISOString(),
    };

    // Overview
    if (typeof data.tagline === "string") updateData.ai_tagline = data.tagline;
    if (typeof data.description === "string") updateData.ai_description = data.description;
    if (Array.isArray(data.vibe)) updateData.ai_vibe = data.vibe;
    if (Array.isArray(data.knownFor)) updateData.ai_known_for = data.knownFor;

    // Practical
    if (Array.isArray(data.bestFor)) updateData.ai_best_for = data.bestFor;
    if (Array.isArray(data.notIdealFor)) updateData.ai_not_ideal_for = data.notIdealFor;
    if (Array.isArray(data.bestTimeToVisit)) updateData.ai_best_time_to_visit = data.bestTimeToVisit;
    if (typeof data.parkingSituation === "string") updateData.ai_parking_situation = data.parkingSituation;
    if (typeof data.walkability === "string") updateData.ai_walkability = data.walkability;

    // Recommendations
    if (Array.isArray(data.mustSee)) updateData.ai_must_see = data.mustSee;
    if (Array.isArray(data.hiddenGems)) updateData.ai_hidden_gems = data.hiddenGems;
    if (Array.isArray(data.localTips)) updateData.ai_local_tips = data.localTips;
    if (typeof data.foodScene === "string") updateData.ai_food_scene = data.foodScene;
    if (typeof data.nightlife === "string") updateData.ai_nightlife = data.nightlife;
    if (Array.isArray(data.familyActivities)) updateData.ai_family_activities = data.familyActivities;
    if (Array.isArray(data.romanticSpots)) updateData.ai_romantic_spots = data.romanticSpots;

    // Nearby
    if (Array.isArray(data.nearbyTowns)) updateData.ai_nearby_towns = data.nearbyTowns;
    if (Array.isArray(data.dayTripIdeas)) updateData.ai_day_trip_ideas = data.dayTripIdeas;

    // Scores
    if (typeof data.familyScore === "number") updateData.ai_family_score = Math.min(5, Math.max(1, data.familyScore));
    if (typeof data.romanceScore === "number") updateData.ai_romance_score = Math.min(5, Math.max(1, data.romanceScore));
    if (typeof data.nightlifeScore === "number") updateData.ai_nightlife_score = Math.min(5, Math.max(1, data.nightlifeScore));
    if (typeof data.budgetScore === "number") updateData.ai_budget_score = Math.min(5, Math.max(1, data.budgetScore));

    const { error: updateError } = await supabase
      .from("towns")
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
