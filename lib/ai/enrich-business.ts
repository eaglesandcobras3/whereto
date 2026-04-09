import OpenAI from "openai";
import { getServiceSupabase } from "@/lib/supabase/service-role";

const openai = new OpenAI();

type BusinessForEnrichment = {
  id: string;
  name: string;
  address: string | null;
  ai_summary: string | null;
  category_name: string | null;
  town_name: string | null;
  google_rating: number | null;
  price_level: number | null;
};

type EnrichmentResult = {
  vibe: string[];
  goodFor: string[];
  nearbyContext: string;
};

export async function enrichBusinessBatch(businesses: BusinessForEnrichment[]): Promise<Map<string, EnrichmentResult>> {
  const results = new Map<string, EnrichmentResult>();

  // Process in parallel but with some concurrency limit
  const batchSize = 5;
  for (let i = 0; i < businesses.length; i += batchSize) {
    const batch = businesses.slice(i, i + batchSize);
    const promises = batch.map(async (biz) => {
      try {
        const result = await enrichSingleBusiness(biz);
        results.set(biz.id, result);
      } catch (error) {
        console.error(`Failed to enrich ${biz.name}:`, error);
      }
    });
    await Promise.all(promises);
  }

  return results;
}

async function enrichSingleBusiness(biz: BusinessForEnrichment): Promise<EnrichmentResult> {
  const priceLabel = biz.price_level
    ? ["budget-friendly", "moderate", "upscale", "fine dining"][biz.price_level - 1] ?? "moderate"
    : "moderate";

  const prompt = `You are a local guide for Florida's 30A/Emerald Coast area. Analyze this business and provide insights.

Business: ${biz.name}
Category: ${biz.category_name ?? "Unknown"}
Town: ${biz.town_name ?? "30A area"}
Address: ${biz.address ?? "Not specified"}
Price Level: ${priceLabel}
Rating: ${biz.google_rating ?? "Not rated"}/5
Current Description: ${biz.ai_summary ?? "None"}

Provide a JSON response with:
1. "vibe" - array of 2-4 vibe tags (e.g., "romantic", "family-friendly", "casual", "trendy", "cozy", "lively", "upscale", "laid-back", "beachy", "artsy")
2. "goodFor" - array of 2-4 specific use cases (e.g., "date night", "family dinner", "business lunch", "girls trip", "anniversary", "quick bite", "sunset drinks", "brunch with friends")
3. "nearbyContext" - 1-2 sentences about what's nearby and activities to pair with this visit (beaches, shopping, other attractions in that town)

Be specific to the 30A area. Keep responses concise.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 300,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  const parsed = JSON.parse(content);
  return {
    vibe: Array.isArray(parsed.vibe) ? parsed.vibe : [],
    goodFor: Array.isArray(parsed.goodFor) ? parsed.goodFor : [],
    nearbyContext: typeof parsed.nearbyContext === "string" ? parsed.nearbyContext : "",
  };
}

export async function processEnrichmentBatch(limit: number = 50): Promise<{ processed: number; failed: number }> {
  const supabase = getServiceSupabase();

  // Fetch businesses needing enrichment
  const { data: businesses, error } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      address,
      ai_summary,
      categories(name),
      towns(name),
      google_rating,
      price_level
    `)
    .eq("status", "active")
    .is("ai_reasoning_updated_at", null)
    .limit(limit);

  if (error || !businesses) {
    throw new Error(`Failed to fetch businesses: ${error?.message}`);
  }

  if (businesses.length === 0) {
    return { processed: 0, failed: 0 };
  }

  // Transform data
  const bizList: BusinessForEnrichment[] = businesses.map((b) => {
    const cat = b.categories as unknown as { name: string } | null;
    const town = b.towns as unknown as { name: string } | null;
    return {
      id: b.id,
      name: b.name,
      address: b.address,
      ai_summary: b.ai_summary,
      category_name: cat?.name ?? null,
      town_name: town?.name ?? null,
      google_rating: b.google_rating,
      price_level: b.price_level,
    };
  });

  // Enrich
  const results = await enrichBusinessBatch(bizList);

  // Save to DB
  let processed = 0;
  let failed = 0;

  for (const [id, result] of results) {
    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        ai_vibe: result.vibe,
        ai_good_for: result.goodFor,
        ai_nearby_context: result.nearbyContext,
        ai_reasoning_updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error(`Failed to save enrichment for ${id}:`, updateError);
      failed++;
    } else {
      processed++;
    }
  }

  // Count failures from enrichment phase
  failed += businesses.length - results.size;

  return { processed, failed };
}

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
