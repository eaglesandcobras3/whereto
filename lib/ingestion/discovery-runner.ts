import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  geoapifyPlacesInCircle,
  geoapifyPropsFromPlaceFeature,
  type GeoapifyPointFeature,
} from "@/lib/ingestion/geoapify-places";
import { resolveTagIdsForGeoapifyCategories } from "@/lib/ingestion/geoapify-tags";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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

async function categoryGeoapifyCodes(
  supabase: ReturnType<typeof getServiceSupabase>,
  jobCategoryId: number | null,
): Promise<string[]> {
  if (!jobCategoryId) return [];
  const { data: row } = await supabase
    .from("categories")
    .select("geoapify_categories")
    .eq("id", jobCategoryId)
    .single();
  const arr = row?.geoapify_categories as string[] | undefined;
  return (arr ?? []).filter(Boolean);
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
const PAGE_SIZE = 100;
const MAX_PLACES_PER_JOB = 400;

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

async function geoapifyPlaceAlreadyIngested(
  supabase: ReturnType<typeof getServiceSupabase>,
  placeId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("business_sources")
    .select("id")
    .eq("source_name", "geoapify")
    .eq("source_record_id", placeId)
    .maybeSingle();
  return Boolean(data);
}

async function insertFromPlaceFeature(
  supabase: ReturnType<typeof getServiceSupabase>,
  f: GeoapifyPointFeature,
  job: DiscoveryJobRow,
): Promise<boolean> {
  const props = geoapifyPropsFromPlaceFeature(f);
  if (!props.placeId) return false;
  if (!Number.isFinite(props.lat) || !Number.isFinite(props.lng)) return false;

  if (await geoapifyPlaceAlreadyIngested(supabase, props.placeId)) return false;

  const townId =
    (await nearestTownId(supabase, props.lat, props.lng)) ??
    (job.town_id as number) ??
    null;
  if (townId == null) return false;

  const categoryId = job.category_id ?? null;
  const tagIds = await resolveTagIdsForGeoapifyCategories(
    supabase,
    props.categories,
  );

  const { data: newId, error: insErr } = await supabase.rpc(
    "insert_directory_listing_with_tags",
    {
      p_name: props.name,
      p_address: props.address,
      p_town_id: townId,
      p_category_id: categoryId,
      p_lat: props.lat,
      p_lng: props.lng,
      p_phone: null,
      p_website: null,
      p_hours_json: null,
      p_status: "active",
      p_tag_ids: tagIds.length ? tagIds : [],
      p_source_name: "geoapify",
      p_source_record_id: props.placeId,
      p_source_url: "https://www.openstreetmap.org/copyright",
      p_attribution_required: true,
      p_listing_confidence: 0.55,
    },
  );

  if (insErr || !newId) return false;
  return true;
}

export async function processDiscoveryJob(
  supabase: ReturnType<typeof getServiceSupabase>,
  apiKey: string,
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

    if (!town) {
      throw new Error("Missing town");
    }

    const geoCats = await categoryGeoapifyCodes(supabase, job.category_id ?? null);
    if (!geoCats.length) {
      throw new Error(
        "Category has no geoapify_categories — run migration 20260411120000 or set categories in SQL",
      );
    }

    const lat = Number(town.center_lat);
    const lng = Number(town.center_lng);
    const radius = (town.search_radius_meters as number) ?? 5000;

    let inserted = 0;
    let totalResults = 0;
    let offset = 0;

    while (offset < MAX_PLACES_PER_JOB) {
      const features = await geoapifyPlacesInCircle(apiKey, {
        lon: lng,
        lat,
        radiusMeters: radius,
        categories: geoCats,
        limit: PAGE_SIZE,
        offset,
        lang: "en",
      });

      if (!features.length) break;

      totalResults += features.length;

      for (const f of features) {
        await sleep(50);
        const ok = await insertFromPlaceFeature(supabase, f, job);
        if (ok) inserted += 1;
      }

      if (features.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
      await sleep(150);
    }

    await supabase
      .from("search_jobs")
      .update({
        status: "completed",
        results_count: totalResults,
        new_businesses_count: inserted,
        run_count: runCount + 1,
        error_message: null,
      })
      .eq("id", job.id);

    return { newBusinesses: inserted, results: totalResults };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markDiscoveryJobFailure(supabase, job.id, msg, runCount, maxRuns);
    throw e;
  }
}

export async function runDiscoveryBatch(budget: number) {
  const key = process.env.GEOAPIFY_API_KEY?.trim();
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
    return { processed: 0, message: "No pending jobs" };
  }

  if (!key) {
    return {
      processed: 0,
      skipped: jobs.length,
      message:
        "GEOAPIFY_API_KEY not set — discovery skipped (jobs left pending)",
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
