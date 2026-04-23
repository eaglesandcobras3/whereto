import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  geoapifyPlaceDetails,
  normalizeGeoapifyPlaceDetails,
} from "@/lib/ingestion/geoapify-places";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type RefreshRow = {
  id: string;
  lat: number;
  lng: number;
  category_id: number | null;
  last_refreshed_at: string;
  legacy_photo_refs: string[] | null;
  directory_refresh_requested_at: string | null;
  geoapify_place_id: string;
};

async function loadGeoapifyPlaceIdByBusiness(
  supabase: SupabaseClient,
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("business_sources")
    .select("business_id, source_record_id")
    .eq("source_name", "geoapify");
  const m = new Map<string, string>();
  for (const r of data ?? []) {
    m.set(r.business_id as string, r.source_record_id as string);
  }
  return m;
}

async function refreshOneBusiness(
  supabase: SupabaseClient,
  apiKey: string,
  b: RefreshRow,
): Promise<void> {
  const fc = await geoapifyPlaceDetails(apiKey, b.geoapify_place_id);
  const n = normalizeGeoapifyPlaceDetails(fc, b.lat, b.lng);

  await supabase
    .from("businesses")
    .update({
      ...(n.name ? { name: n.name } : {}),
      address: n.address,
      lat: n.lat,
      lng: n.lng,
      phone: n.phone,
      website: n.website,
      hours_json: n.hours_json,
      last_refreshed_at: new Date().toISOString(),
      directory_refresh_requested_at: null,
    })
    .eq("id", b.id);

  await supabase
    .from("business_sources")
    .update({ last_verified_at: new Date().toISOString() })
    .eq("business_id", b.id)
    .eq("source_name", "geoapify");

  const { data: caches } = await supabase.from("query_cache").select("id, business_ids");
  const hitIds =
    caches
      ?.filter((row) => (row.business_ids as string[])?.includes(b.id as string))
      .map((r) => r.id) ?? [];
  if (hitIds.length) {
    await supabase.from("query_cache").delete().in("id", hitIds);
  }
}

export async function runRefreshBatch(budget: number) {
  const key = process.env.GEOAPIFY_API_KEY?.trim();
  const supabase = getServiceSupabase();

  const { data: cats } = await supabase
    .from("categories")
    .select("id, refresh_interval_days");
  const intervalByCat = new Map(
    (cats ?? []).map((c) => [
      c.id as number,
      (c.refresh_interval_days as number) ?? 30,
    ]),
  );

  if (!key) {
    return {
      processed: 0,
      message: "GEOAPIFY_API_KEY not set — directory refresh skipped",
    };
  }

  const geoPlaceByBusiness = await loadGeoapifyPlaceIdByBusiness(supabase);
  if (!geoPlaceByBusiness.size) {
    return {
      processed: 0,
      message: "No Geoapify-linked listings to refresh",
    };
  }

  const { data: requested, error: reqErr } = await supabase
    .from("businesses")
    .select(
      "id, lat, lng, category_id, last_refreshed_at, legacy_photo_refs, directory_refresh_requested_at",
    )
    .not("directory_refresh_requested_at", "is", null)
    .order("directory_refresh_requested_at", { ascending: true })
    .limit(budget * 3);

  if (reqErr) throw reqErr;

  const requestedRows: RefreshRow[] = (requested ?? [])
    .filter((row) => geoPlaceByBusiness.has(row.id as string))
    .map((row) => ({
      id: row.id as string,
      lat: row.lat as number,
      lng: row.lng as number,
      category_id: row.category_id as number | null,
      last_refreshed_at: row.last_refreshed_at as string,
      legacy_photo_refs: row.legacy_photo_refs as string[] | null,
      directory_refresh_requested_at: row.directory_refresh_requested_at as string | null,
      geoapify_place_id: geoPlaceByBusiness.get(row.id as string)!,
    }))
    .slice(0, budget);

  const remaining = budget - requestedRows.length;

  const staleSlice: RefreshRow[] = [];
  if (remaining > 0) {
    const { data: stale, error } = await supabase
      .from("businesses")
      .select(
        "id, lat, lng, category_id, last_refreshed_at, legacy_photo_refs, directory_refresh_requested_at",
      )
      .is("directory_refresh_requested_at", null)
      .order("refresh_priority", { ascending: true })
      .order("last_refreshed_at", { ascending: true })
      .limit(remaining * 5);

    if (error) throw error;

    const now = Date.now();
    const toRefresh =
      (stale ?? []).filter((b) => {
        if (!geoPlaceByBusiness.has(b.id as string)) return false;
        const days = intervalByCat.get(b.category_id as number) ?? 30;
        const last = new Date(b.last_refreshed_at as string).getTime();
        return now - last > days * 86400000;
      }) ?? [];

    staleSlice.push(
      ...toRefresh.slice(0, remaining).map((row) => ({
        id: row.id as string,
        lat: row.lat as number,
        lng: row.lng as number,
        category_id: row.category_id as number | null,
        last_refreshed_at: row.last_refreshed_at as string,
        legacy_photo_refs: row.legacy_photo_refs as string[] | null,
        directory_refresh_requested_at: row.directory_refresh_requested_at as string | null,
        geoapify_place_id: geoPlaceByBusiness.get(row.id as string)!,
      })),
    );
  }

  const slice = [...requestedRows, ...staleSlice];

  for (const b of slice) {
    await sleep(120);
    try {
      await refreshOneBusiness(supabase, key, b);
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
    .select("id, name, listing_rating, listing_review_count, price_level, ai_summary")
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
              rating: b.listing_rating,
              reviews: b.listing_review_count,
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
