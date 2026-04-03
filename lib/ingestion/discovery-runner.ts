import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  googlePlaceDetails,
  googleTextSearch,
  placeIdToResource,
} from "@/lib/ingestion/google-places";

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

async function nearestTownId(
  supabase: ReturnType<typeof getServiceSupabase>,
  lat: number,
  lng: number,
): Promise<number | null> {
  const { data: towns } = await supabase.from("towns").select("id, center_lat, center_lng");
  if (!towns?.length) return null;
  let best: { id: number; d: number } | null = null;
  for (const t of towns) {
    const d =
      (lat - Number(t.center_lat)) ** 2 + (lng - Number(t.center_lng)) ** 2;
    if (!best || d < best.d) best = { id: t.id as number, d };
  }
  return best?.id ?? null;
}

async function categoryFromTypes(
  supabase: ReturnType<typeof getServiceSupabase>,
  types: string[] | undefined,
  jobCategoryId: number | null,
): Promise<number | null> {
  if (jobCategoryId) return jobCategoryId;
  if (!types?.length) return null;
  const { data: cats } = await supabase.from("categories").select("id, google_types");
  for (const c of cats ?? []) {
    const gt = (c.google_types as string[]) ?? [];
    if (types.some((t) => gt.includes(t))) return c.id as number;
  }
  return null;
}

export async function runDiscoveryBatch(budget: number) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const supabase = getServiceSupabase();

  const { data: jobs, error } = await supabase
    .from("search_jobs")
    .select("id, query_string, category_id, town_id, priority")
    .eq("job_type", "discovery")
    .eq("status", "pending")
    .lte("next_run_after", new Date().toISOString())
    .order("priority", { ascending: true })
    .limit(budget);

  if (error) throw error;
  if (!jobs?.length) {
    return { processed: 0, message: key ? "No pending jobs" : "No pending jobs (Places key optional)" };
  }

  if (!key) {
    return {
      processed: 0,
      skipped: jobs.length,
      message: "GOOGLE_PLACES_API_KEY not set — discovery skipped (jobs left pending)",
    };
  }

  let newBusinesses = 0;
  for (const job of jobs) {
    await supabase
      .from("search_jobs")
      .update({ status: "running", last_run_at: new Date().toISOString() })
      .eq("id", job.id);

    try {
      const { data: town } = await supabase
        .from("towns")
        .select("center_lat, center_lng, search_radius_meters")
        .eq("id", job.town_id as number)
        .single();

      if (!town || !job.query_string) throw new Error("Missing town or query");

      const search = await googleTextSearch(
        key,
        job.query_string,
        Number(town.center_lat),
        Number(town.center_lng),
        (town.search_radius_meters as number) ?? 5000,
      );

      const places = search.places ?? [];
      let inserted = 0;

      for (const p of places) {
        const pid = p.id?.replace(/^places\//, "");
        if (!pid) continue;
        const { data: existing } = await supabase
          .from("businesses")
          .select("id")
          .eq("google_place_id", pid)
          .maybeSingle();
        if (existing) continue;

        await sleep(100);
        const details = await googlePlaceDetails(key, placeIdToResource(pid));
        const lat = details.location?.latitude;
        const lng = details.location?.longitude;
        if (lat == null || lng == null) continue;

        const townId = await nearestTownId(supabase, lat, lng);
        const categoryId = await categoryFromTypes(
          supabase,
          details.types ?? p.types,
          job.category_id as number | null,
        );

        const { error: insErr } = await supabase.from("businesses").insert({
          google_place_id: pid,
          name: details.displayName?.text ?? p.displayName?.text ?? "Unknown",
          address: details.formattedAddress ?? p.formattedAddress ?? null,
          town_id: townId,
          category_id: categoryId,
          lat,
          lng,
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
        });

        if (!insErr) {
          inserted += 1;
          newBusinesses += 1;
        }
      }

      await supabase
        .from("search_jobs")
        .update({
          status: "completed",
          results_count: places.length,
          new_businesses_count: inserted,
          run_count: 1,
        })
        .eq("id", job.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase
        .from("search_jobs")
        .update({
          status: "failed",
          error_message: msg,
        })
        .eq("id", job.id);
    }
  }

  return { processed: jobs.length, newBusinesses };
}
