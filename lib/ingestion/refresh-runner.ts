import OpenAI from "openai";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { googlePlaceDetails, placeIdToResource } from "@/lib/ingestion/google-places";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function priceLevelFromGoogle(level?: string): number | null {
  if (!level) return null;
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[level] ?? null;
}

export async function runRefreshBatch(budget: number) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const supabase = getServiceSupabase();

  const { data: cats } = await supabase.from("categories").select("id, refresh_interval_days");
  const intervalByCat = new Map(
    (cats ?? []).map((c) => [c.id as number, (c.refresh_interval_days as number) ?? 30]),
  );

  const { data: stale, error } = await supabase
    .from("businesses")
    .select("id, google_place_id, category_id, last_refreshed_at")
    .eq("status", "active")
    .not("google_place_id", "like", "seed:%")
    .order("refresh_priority", { ascending: true })
    .order("last_refreshed_at", { ascending: true })
    .limit(budget * 3);

  if (error) throw error;

  const now = Date.now();
  const toRefresh =
    stale?.filter((b) => {
      const days = intervalByCat.get(b.category_id as number) ?? 30;
      const last = new Date(b.last_refreshed_at as string).getTime();
      return now - last > days * 86400000;
    }) ?? [];

  const slice = toRefresh.slice(0, budget);

  if (!key) {
    return {
      processed: 0,
      message: "GOOGLE_PLACES_API_KEY not set — refresh skipped",
    };
  }

  for (const b of slice) {
    await sleep(100);
    try {
      const details = await googlePlaceDetails(
        key,
        placeIdToResource(b.google_place_id as string),
      );
      const lat = details.location?.latitude;
      const lng = details.location?.longitude;

      await supabase
        .from("businesses")
        .update({
          name: details.displayName?.text ?? undefined,
          address: details.formattedAddress ?? null,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
          phone: details.nationalPhoneNumber ?? null,
          website: details.websiteUri ?? null,
          google_rating: details.rating ?? null,
          google_review_count: details.userRatingCount ?? 0,
          price_level: priceLevelFromGoogle(details.priceLevel),
          hours_json: details.regularOpeningHours
            ? JSON.parse(JSON.stringify(details.regularOpeningHours))
            : null,
          status:
            details.businessStatus === "CLOSED_PERMANENTLY" ? "closed" : "active",
          last_refreshed_at: new Date().toISOString(),
        })
        .eq("id", b.id);

      const { data: caches } = await supabase.from("query_cache").select("id, business_ids");
      const hitIds =
        caches
          ?.filter((row) => (row.business_ids as string[])?.includes(b.id as string))
          .map((r) => r.id) ?? [];
      if (hitIds.length) {
        await supabase.from("query_cache").delete().in("id", hitIds);
      }
    } catch (e) {
      console.error("refresh", b.id, e);
    }
  }

  return { processed: slice.length };
}

const SUMMARY_PROMPT = `Generate a 2-sentence summary for a local business listing for travelers. Be specific and helpful. JSON only: {"summary": "..."}`;

export async function runAiSummaryBatch(budget: number) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const supabase = getServiceSupabase();

  const { data: rows, error } = await supabase
    .from("businesses")
    .select("id, name, google_rating, google_review_count, price_level, ai_summary")
    .eq("status", "active")
    .is("ai_summary", null)
    .limit(budget);

  if (error) throw error;
  if (!apiKey || !rows?.length) {
    return {
      processed: 0,
      message: apiKey ? "No rows need summaries" : "OPENAI_API_KEY not set",
    };
  }

  const openai = new OpenAI({ apiKey });
  let n = 0;
  for (const b of rows) {
    try {
      const res = await openai.chat.completions.create({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SUMMARY_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              name: b.name,
              rating: b.google_rating,
              reviews: b.google_review_count,
              price_level: b.price_level,
            }),
          },
        ],
      });
      const text = res.choices[0]?.message?.content;
      if (!text) continue;
      const { summary } = JSON.parse(text) as { summary?: string };
      if (!summary) continue;
      await supabase
        .from("businesses")
        .update({
          ai_summary: summary,
          ai_summary_updated_at: new Date().toISOString(),
        })
        .eq("id", b.id);
      n += 1;
    } catch (e) {
      console.error("summary", b.id, e);
    }
  }

  return { processed: n };
}
