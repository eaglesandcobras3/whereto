import { getServiceSupabase } from "@/lib/supabase/service-role";
import { resolveTagIdsForGoogleTypes } from "@/lib/ingestion/business-tags-from-google";
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

export type DiscoveryJobRow = {
  id: number;
  query_string: string | null;
  category_id: number | null;
  town_id: number | null;
  run_count?: number | null;
  max_runs?: number | null;
};

const RETRY_DELAY_MS = 60 * 60 * 1000;

async function markDiscoveryJobFailure(
  supabase: ReturnType<typeof getServiceSupabase>,
  jobId: number,
  message: string,
  runCount: number,
  maxRuns: number,
) {
  const nextCount = runCount + 1;
  const terminal = nextCount >= maxRuns;
  if (terminal) {
    await supabase
      .from("search_jobs")
      .update({
        status: "failed",
        error_message: message,
        run_count: nextCount,
      })
      .eq("id", jobId);
  } else {
    await supabase
      .from("search_jobs")
      .update({
        status: "pending",
        error_message: message,
        run_count: nextCount,
        next_run_after: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
      })
      .eq("id", jobId);
  }
}

export async function processDiscoveryJob(
  supabase: ReturnType<typeof getServiceSupabase>,
  key: string,
  job: DiscoveryJobRow,
): Promise<{ newBusinesses: number; results: number }> {
  const runCount = job.run_count ?? 0;
  const maxRuns = job.max_runs ?? 3;

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

    if (!town || !job.query_string) {
      throw new Error("Missing town or query");
    }

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
        job.category_id,
      );

      const allTypes = [...(details.types ?? []), ...(p.types ?? [])];
      const tagIds = await resolveTagIdsForGoogleTypes(supabase, allTypes);
      const hoursJson = details.regularOpeningHours
        ? JSON.parse(JSON.stringify(details.regularOpeningHours))
        : null;

      const { data: newId, error: insErr } = await supabase.rpc(
        "insert_discovery_business_with_tags",
        {
          p_google_place_id: pid,
          p_name: details.displayName?.text ?? p.displayName?.text ?? "Unknown",
          p_address: details.formattedAddress ?? p.formattedAddress ?? null,
          p_town_id: townId,
          p_category_id: categoryId,
          p_lat: lat,
          p_lng: lng,
          p_phone: details.nationalPhoneNumber ?? null,
          p_website: details.websiteUri ?? null,
          p_google_rating: details.rating ?? null,
          p_google_review_count: details.userRatingCount ?? 0,
          p_price_level: priceLevelFromGoogle(details.priceLevel),
          p_hours_json: hoursJson,
          p_status:
            details.businessStatus === "CLOSED_PERMANENTLY" ? "closed" : "active",
          p_tag_ids: tagIds,
        },
      );

      if (insErr || !newId) continue;

      inserted += 1;
    }

    await supabase
      .from("search_jobs")
      .update({
        status: "completed",
        results_count: places.length,
        new_businesses_count: inserted,
        run_count: runCount + 1,
        error_message: null,
      })
      .eq("id", job.id);

    return { newBusinesses: inserted, results: places.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markDiscoveryJobFailure(supabase, job.id, msg, runCount, maxRuns);
    throw e;
  }
}

/** Run one pending discovery job by id (for admin “run now”). */
export async function runDiscoveryJobById(jobId: number) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return { ok: false as const, message: "GOOGLE_PLACES_API_KEY not set" };
  }
  const supabase = getServiceSupabase();
  const { data: job, error } = await supabase
    .from("search_jobs")
    .select(
      "id, query_string, category_id, town_id, status, job_type, run_count, max_runs",
    )
    .eq("id", jobId)
    .single();
  if (error || !job || job.job_type !== "discovery") {
    return { ok: false as const, message: "Job not found" };
  }
  if (job.status !== "pending") {
    return { ok: false as const, message: `Job is ${job.status}, not pending` };
  }
  try {
    const r = await processDiscoveryJob(supabase, key, job as DiscoveryJobRow);
    return { ok: true as const, ...r };
  } catch {
    return { ok: false as const, message: "Discovery failed (see job row)" };
  }
}

export async function runDiscoveryBatch(budget: number) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const supabase = getServiceSupabase();

  const { data: jobs, error } = await supabase
    .from("search_jobs")
    .select(
      "id, query_string, category_id, town_id, priority, run_count, max_runs",
    )
    .eq("job_type", "discovery")
    .eq("status", "pending")
    .lte("next_run_after", new Date().toISOString())
    .order("priority", { ascending: true })
    .limit(budget);

  if (error) throw error;
  if (!jobs?.length) {
    return {
      processed: 0,
      message: key ? "No pending jobs" : "No pending jobs (Places key optional)",
    };
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
    try {
      const r = await processDiscoveryJob(supabase, key, job as DiscoveryJobRow);
      newBusinesses += r.newBusinesses;
    } catch {
      /* failure recorded inside processDiscoveryJob */
    }
  }

  return { processed: jobs.length, newBusinesses };
}
