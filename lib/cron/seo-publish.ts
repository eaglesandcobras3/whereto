import { getServiceSupabase } from "@/lib/supabase/service-role";

function titleForRow(
  townName: string,
  seoSlug: string,
  normalizedQuery: string,
): string {
  const slugTitles: Record<string, string> = {
    restaurants: `Best restaurants in ${townName}`,
    coffee: `Best coffee in ${townName}`,
    "things-to-do": `Things to do in ${townName}`,
    lunch: `Casual lunch in ${townName}`,
    "date-night": `Date night in ${townName}`,
    "kid-friendly": `Kid-friendly restaurants in ${townName}`,
    "quick-bites": `Quick bites in ${townName}`,
  };
  return (
    slugTitles[seoSlug] ??
    (normalizedQuery.slice(0, 120) || `Top picks in ${townName}`)
  );
}

/**
 * Create or refresh `seo_pages` from eligible precomputed `query_cache` rows.
 * Updates titles and intros when the underlying set is regenerated.
 */
export async function runSeoPublish(budget: number) {
  const supabase = getServiceSupabase();
  const { data: rows, error } = await supabase
    .from("query_cache")
    .select(
      "id, query_key, seo_slug, town_id, region_id, response_json, normalized_query",
    )
    .eq("seo_eligible", true)
    .not("seo_slug", "is", null)
    .limit(Math.max(budget * 5, 50));

  if (error) throw error;

  let upserted = 0;
  const revalidatePaths: string[] = [];
  const now = new Date().toISOString();

  for (const row of rows ?? []) {
    if (upserted >= budget) break;
    const setId = row.id as string;
    const seoSlug = row.seo_slug as string;
    const townId = row.town_id as number | null;
    if (townId == null) continue;

    const { data: town } = await supabase
      .from("towns")
      .select("slug, name, region_id")
      .eq("id", townId)
      .single();
    if (!town) continue;

    const townSlug = town.slug as string;
    const townName = town.name as string;
    const fullSlug = `${townSlug}/${seoSlug}`;
    const body = row.response_json as { summary?: string };
    const normalized = (row.normalized_query as string) || "";
    const title = titleForRow(townName, seoSlug, normalized);
    const metaDescription = (body.summary ?? `Curated ${townName} picks on WhereTo30A.`).slice(
      0,
      160,
    );

    const { data: existing } = await supabase
      .from("seo_pages")
      .select("id, recommendation_set_id")
      .eq("slug", fullSlug)
      .maybeSingle();

    if (existing?.id) {
      const { error: upErr } = await supabase
        .from("seo_pages")
        .update({
          title,
          meta_description: metaDescription,
          content_intro: body.summary ?? null,
          recommendation_set_id: setId,
          town_id: townId,
          region_id: town.region_id as number | null,
          published: true,
          last_generated_at: now,
        })
        .eq("id", existing.id as number);
      if (!upErr) {
        upserted += 1;
        revalidatePaths.push(`/${fullSlug}`);
      }
      continue;
    }

    const { error: insErr } = await supabase.from("seo_pages").insert({
      slug: fullSlug,
      title,
      meta_description: metaDescription,
      recommendation_set_id: setId,
      location_scope: "town",
      town_id: townId,
      region_id: town.region_id as number | null,
      content_intro: body.summary ?? null,
      published: true,
      last_generated_at: now,
    });

    if (!insErr) {
      upserted += 1;
      revalidatePaths.push(`/${fullSlug}`);
    }
  }

  return { upserted, scanned: rows?.length ?? 0, revalidatePaths };
}
