import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { runSearch } from "@/lib/search/run-search";
import { getAllFeatureFlags, isAskEnabled, isGuidesEnabled, isSearchEnabled } from "@/lib/feature-flags";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { SearchPageClient, type DiscoveryTag } from "./search-page-client";
import type { Metadata } from "next";
import type { SearchResultPayload } from "@/lib/search/types";
import type { BrowseEventRow, BrowseAreaRow, BrowseGuideRow, BrowseTownRow } from "./search-page-client";
import { chicagoCalendarDaySeed } from "@/lib/home/daily-featured-pick";
import { displayStorefrontCategoryTitle } from "@/lib/routes/storefront-category-labels";
import { parseSpecialtySlugsFromParams } from "@/lib/routes/service-vendor-labels";
import { SERVICE_VENDORS_HUB_PATH } from "@/lib/routes/service-vendors-hub";

/** Deterministic shuffle using mulberry32 PRNG with daily seed */
function shuffleWithDailySeed<T>(items: T[]): T[] {
  const seed = chicagoCalendarDaySeed();
  let a = seed >>> 0;
  const rng = () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Props = {
  searchParams: Promise<{
    q?: string;
    town_id?: string;
    page?: string;
    type?: string;
    sort?: string;
    /** `business_categories.slug` */
    category?: string;
    /** `service_categories.slug` — user-facing "Specialty" (`specialty=`). */
    specialty?: string;
    /** @deprecated Use `specialty`. */
    service_category?: string;
    /** `areas.id` (UUID) */
    area_id?: string;
    /** Scope override: "in" | "near" | "anywhere" */
    scope?: string;
    /** Price bucket: "inexpensive" | "moderate" | "expensive" */
    price?: string;
    /** Comma-separated intent tag slugs */
    tags?: string;
  }>;
};

const TYPE_FILTERS: Record<string, { label: string; query: string }> = {
  towns: { label: "Towns", query: "30A beach towns neighborhoods" },
  areas: { label: "Areas", query: "districts shopping areas neighborhoods 30A" },
  access: {
    label: "Landmarks & parks",
    query:
      "state parks national parks nature preserves trailheads scenic overlooks landmarks historic markers beach access parking shuttle 30A",
  },
  businesses: {
    label: "Businesses",
    query: "restaurants cafes coffee bars shops retail local businesses storefronts",
  },
  services: {
    label: "Services",
    query:
      "landscaping lawn care handyman painter painting plumber electrician home repair contractors trades cleaning pressure washing spa salon wellness 30A",
  },
  events: { label: "Events", query: "events activities things to do" },
  guides: { label: "Guides", query: "local guides itineraries travel tips" },
};

const BROWSE_TYPES = new Set(["events", "towns", "guides", "areas", "access"]);

function normalizeSearchType(type: string | undefined): string | undefined {
  if (!type) return undefined;
  if (type === "stores") return "businesses";
  return type;
}

function sanitizeSearchToken(raw: string): string {
  return raw.replace(/[%_,\\]/g, " ").replace(/\s+/g, " ").trim();
}

function emptySearchResult(displayQuery: string, summary: string): SearchResultPayload {
  return {
    query: displayQuery,
    query_hash: "",
    normalized_query: "",
    summary,
    recommendations: [],
    cached: false,
  };
}

function mapEventToBrowseRow(
  e: Record<string, unknown>,
): BrowseEventRow {
  const r = e as {
    main_image?: string | null;
    hero_image?: string | null;
    main_image_url?: string | null;
    hero_image_url?: string | null;
  };
  const starts = (e as { starts_at?: string | null }).starts_at;
  const ends = (e as { ends_at?: string | null }).ends_at;
  const d0 = starts ? starts.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return {
    id: String(e.id),
    slug: String(e.slug),
    title: String((e as { title: string }).title),
    description: ((e as { excerpt?: string | null }).excerpt as string | null) ?? null,
    hero_image_url: getPublicImageUrlWithView(
      r.main_image_url,
      r.hero_image_url,
      r.main_image,
      r.hero_image,
    ),
    event_date: d0,
    end_date: ends ? ends.slice(0, 10) : null,
    next_list_date: null,
    recurrence_frequency: (e as { recurrence_rule?: string | null }).recurrence_rule,
    recurrence_weekday: null,
    town_name: null,
    town_slug: null,
    venue_name: (e as { location_name?: string | null }).location_name ?? null,
    price: (e as { cost_notes?: string | null }).cost_notes ?? null,
    website: (e as { ticket_url?: string | null }).ticket_url ?? null,
    tags: null,
  };
}

/** Search is a utility surface; hub routes (`/towns`, `/categories`, …) are the indexable landing pages. */
const SEARCH_NOINDEX: Pick<Metadata, "robots"> = {
  robots: { index: false, follow: true },
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const { q, type: rawType } = sp;
  const type = normalizeSearchType(rawType);
  if (type && TYPE_FILTERS[type]) {
    return {
      ...SEARCH_NOINDEX,
      title: TYPE_FILTERS[type].label,
      description: `Explore ${TYPE_FILTERS[type].label.toLowerCase()} across 30A and Florida's Emerald Coast.`,
    };
  }
  if (!q?.trim()) {
    return {
      ...SEARCH_NOINDEX,
      title: "Search",
      description:
        "Search towns, restaurants, coffee shops, activities, guides, and events along Scenic 30A and South Walton.",
    };
  }
  return {
    ...SEARCH_NOINDEX,
    title: `Search results for "${q}"`,
    description: `Find towns, businesses, events, guides, and local favorites on 30A for "${q}".`,
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const flags = await getAllFeatureFlags();
  if (!isSearchEnabled(flags)) {
    if (isAskEnabled(flags)) {
      const sp = await searchParams;
      const q = typeof sp.q === "string" ? sp.q.trim() : "";
      redirect(q ? `/ask?q=${encodeURIComponent(q)}` : "/ask");
    }
    redirect("/");
  }

  const {
    q,
    town_id,
    page,
    type: rawType,
    sort: sortParam,
    category: categoryParam,
    specialty: specialtyParam,
    service_category: legacyServiceCategoryParam,
    area_id: areaIdParam,
    scope: scopeParam,
    price: priceParam,
    tags: tagsParam,
  } = await searchParams;
  const scopeOverride = (["in", "near", "anywhere"] as const).find((s) => s === scopeParam);
  const constrainPriceBucket = (["inexpensive", "moderate", "expensive"] as const).find(
    (b) => b === priceParam,
  ) ?? null;
  // town_id may be comma-separated for multi-select
  const constrainTownIds = town_id?.trim()
    ? town_id.trim().split(",").filter(Boolean)
    : [];
  // category may be comma-separated for multi-select
  const constrainCategorySlugs = categoryParam?.trim()
    ? categoryParam.trim().split(",").filter(s => /^[a-z0-9_]+$/.test(s))
    : [];
  const constrainServiceCategorySlugs = parseSpecialtySlugsFromParams((key) => {
    if (key === "specialty") return specialtyParam;
    if (key === "service_category") return legacyServiceCategoryParam;
    return null;
  });
  const type = normalizeSearchType(rawType);
  const servicesOnly = type === "services";
  const storefrontCategorySlugs = servicesOnly
    ? constrainCategorySlugs.filter((s) => s !== "services")
    : constrainCategorySlugs;
  const specialtySlugsForSearch = servicesOnly ? constrainServiceCategorySlugs : [];
  // tags may be comma-separated
  const constrainVibeTags = tagsParam?.trim()
    ? tagsParam.trim().split(",").filter(s => /^[a-z0-9_]+$/.test(s))
    : [];
  const trimmedQ = q?.trim() ?? "";

  // Legacy browse URLs → dedicated hub pages when there are no extra filters.
  const hasExtraFilters = Boolean(
    trimmedQ ||
      town_id?.trim() ||
      categoryParam?.trim() ||
      specialtyParam?.trim() ||
      legacyServiceCategoryParam?.trim() ||
      areaIdParam?.trim() ||
      scopeParam ||
      priceParam ||
      tagsParam ||
      (page?.trim() && page.trim() !== "1") ||
      sortParam,
  );
  if (!hasExtraFilters && type) {
    if (type === "towns") redirect("/towns");
    if (type === "areas") redirect("/areas");
    if (type === "businesses" || type === "stores") redirect("/businesses");
    if (type === "guides") redirect(isGuidesEnabled(flags) ? "/guides" : "/");
    if (type === "services") redirect(SERVICE_VENDORS_HUB_PATH);
  }

  const sortMode =
    sortParam === "updated" ? "updated" : sortParam === "name" ? "name" : "relevance";

  const serviceSupabase = getServiceSupabase();

  let townName = "";
  let constrainTownId: string | undefined;
  if (constrainTownIds.length > 0) {
    const { data: townRows } = await serviceSupabase
      .from("towns")
      .select("id, title")
      .in("id", constrainTownIds)
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS);
    if (townRows?.length) {
      const validIds = new Set((townRows).map((t) => String(t.id)));
      const orderedValid = constrainTownIds.filter((id) => validIds.has(id));
      const titleMap = new Map((townRows).map((t) => [String(t.id), String((t as { title: string }).title)]));
      constrainTownId = orderedValid[0];
      townName = constrainTownId ? (titleMap.get(constrainTownId) ?? "") : "";
    }
  }

  let constrainAreaId: string | undefined;
  let areaName: string | undefined;
  if (areaIdParam?.trim()) {
    const { data: arow } = await serviceSupabase
      .from("areas")
      .select("id, title, town_id")
      .eq("id", areaIdParam.trim())
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .maybeSingle();
    if (arow) {
      const a = arow as { id: string; title: string; town_id: string | null };
      if (!constrainTownId || a.town_id == null || a.town_id === constrainTownId) {
        constrainAreaId = a.id;
        areaName = a.title;
      }
    }
  }

  const typeKey = type && TYPE_FILTERS[type] ? type : undefined;
  let effectiveQuery = trimmedQ || (typeKey ? TYPE_FILTERS[typeKey].query : "") || "";
  if (!effectiveQuery && constrainTownId) {
    effectiveQuery = TYPE_FILTERS.businesses.query;
  }
  if (!effectiveQuery && constrainAreaId) {
    effectiveQuery = TYPE_FILTERS.businesses.query;
  }

  if (!effectiveQuery) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const displayQuery =
    trimmedQ ||
    (typeKey ? TYPE_FILTERS[typeKey].label : "") ||
    (constrainAreaId && !trimmedQ && !typeKey && areaName
      ? `Businesses in ${areaName}`
      : constrainTownId && !trimmedQ && !typeKey && townName
        ? `Businesses in ${townName}`
        : "") ||
    effectiveQuery;
  const currentPage = Math.max(1, Number(page) || 1);

  let areaListQuery = serviceSupabase
    .from("areas_view")
    .select("id, title, town_id")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title")
    .limit(500);
  if (constrainTownId) {
    areaListQuery = areaListQuery.eq("town_id", constrainTownId);
  }

  const [
    authResult,
    sidebarRowsResult,
    categoryRowsResult,
    areaListRowsResult,
    sidebarAreaRowsResult,
    guideRowsResult,
    bizRowsResult,
    serviceRowsResult,
    serviceCategoryRowsResult,
  ] = await Promise.all([
    supabase.auth.getUser(),
    serviceSupabase
      .from("towns_view")
      .select("id, title, slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("title")
      .limit(50),
    serviceSupabase
      .from("business_categories")
      .select("title, slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("title"),
    areaListQuery,
    serviceSupabase
      .from("areas_view")
      .select("id, title, slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("title")
      .limit(50),
    serviceSupabase
      .from("guides_view")
      .select("slug, title")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .limit(50),
    serviceSupabase
      .from("businesses_view")
      .select("id, title, slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .eq("has_physical_location", true)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .limit(100),
    serviceSupabase
      .from("businesses_view")
      .select("id, title, slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .eq("is_service_business", true)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .limit(100),
    serviceSupabase
      .from("service_categories")
      .select("title, slug, sort")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .order("sort", { ascending: true }),
  ]);
  const {
    data: { user },
  } = authResult;
  const { data: sidebarRows } = sidebarRowsResult;
  const { data: categoryRows } = categoryRowsResult;
  const { data: areaListRows } = areaListRowsResult;
  const { data: sidebarAreaRows } = sidebarAreaRowsResult;
  const { data: guideRows } = guideRowsResult;
  const { data: bizRows } = bizRowsResult;
  const { data: serviceRows } = serviceRowsResult;
  const { data: serviceCategoryRows } = serviceCategoryRowsResult;

  const sidebarTowns = (sidebarRows ?? []).map((t) => ({
    id: t.id,
    name: (t as { title: string }).title,
    slug: t.slug,
  }));

  const categoryOptions = servicesOnly
    ? []
    : (categoryRows ?? []).map((c) => {
        const slug = (c as { slug: string }).slug;
        const title = (c as { title: string }).title;
        return {
          slug,
          title: displayStorefrontCategoryTitle(slug, title),
        };
      });

  const serviceCategoryOptions = (serviceCategoryRows ?? []).map((c) => ({
    title: (c as { title: string }).title,
    slug: (c as { slug: string }).slug,
  }));

  const areaOptions = (areaListRows ?? []).map((a) => ({
    id: String((a as { id: string }).id),
    title: String((a as { title: string }).title),
  }));

  const allSidebarAreas = (sidebarAreaRows ?? []).map((a) => ({
    id: String((a as { id: string }).id),
    name: String((a as { title: string }).title),
    slug: String((a as { slug: string }).slug),
  }));
  const sidebarAreas = shuffleWithDailySeed(allSidebarAreas).slice(0, 8);

  const allGuides = (guideRows ?? []).map((g) => ({
    slug: String((g as { slug: string }).slug),
    title: String((g as { title: string }).title),
  }));
  const sidebarGuides = shuffleWithDailySeed(allGuides).slice(0, 6);

  const allBiz = (bizRows ?? []).map((b) => ({
    id: String((b as { id: string }).id),
    name: String((b as { title: string }).title),
    slug: String((b as { slug: string }).slug),
  }));
  const sidebarBusinesses = shuffleWithDailySeed(allBiz).slice(0, 6);

  const allServices = (serviceRows ?? []).map((s) => ({
    id: String((s as { id: string }).id),
    name: String((s as { title: string }).title),
    slug: String((s as { slug: string }).slug),
  }));
  const sidebarServices = shuffleWithDailySeed(allServices).slice(0, 6);

  const discoveryTags: DiscoveryTag[] = [];
  const browseMode =
    type && BROWSE_TYPES.has(type)
      ? (type as "events" | "towns" | "guides" | "areas" | "access")
      : "business";

  if (browseMode === "events") {
    let eventIdFilter: string[] | null = null;
    if (constrainTownId) {
      const { data: inTown } = await serviceSupabase
        .from("event_towns")
        .select("event_id")
        .eq("town_id", constrainTownId);
      eventIdFilter = (inTown ?? []).map((r) => (r as { event_id: string }).event_id);
      if (eventIdFilter.length === 0) {
        return (
          <SearchPageClient
            browseMode="events"
            browseEvents={[]}
            initialQuery={displayQuery}
            results={emptySearchResult(displayQuery, "No events in this town yet.")}
            townName={townName}
            towns={sidebarTowns}
            sidebarAreas={sidebarAreas}
        sidebarGuides={sidebarGuides}
        sidebarBusinesses={sidebarBusinesses}
        sidebarServices={sidebarServices}
            discoveryTags={discoveryTags}
          />
        );
      }
    }
    let evQuery = serviceSupabase
      .from("events_view")
      .select("id, slug, title, excerpt, main_image, hero_image, main_image_url, hero_image_url, starts_at, ends_at, location_name, cost_notes, ticket_url, recurrence_rule, status")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("starts_at", { ascending: true, nullsFirst: false })
      .limit(100);
    if (eventIdFilter?.length) evQuery = evQuery.in("id", eventIdFilter);
    const safeEv = sanitizeSearchToken(trimmedQ);
    if (safeEv) {
      evQuery = evQuery.or(`title.ilike.%${safeEv}%,excerpt.ilike.%${safeEv}%,search_keywords.ilike.%${safeEv}%`);
    }
    const { data: eventRows } = await evQuery;
    const browseEvents: BrowseEventRow[] = (eventRows ?? []).map((e) => mapEventToBrowseRow(e as Record<string, unknown>));

    return (
      <SearchPageClient
        browseMode="events"
        browseEvents={browseEvents}
        initialQuery={displayQuery}
        results={emptySearchResult(
          displayQuery,
          townName ? `Upcoming happenings in ${townName}.` : "Events along 30A.",
        )}
        townName={townName}
        towns={sidebarTowns}
        sidebarAreas={sidebarAreas}
        sidebarGuides={sidebarGuides}
        sidebarBusinesses={sidebarBusinesses}
        sidebarServices={sidebarServices}
        discoveryTags={discoveryTags}
      />
    );
  }

  if (browseMode === "towns") {
    let tq = serviceSupabase
      .from("towns_view")
      .select("id, title, slug, excerpt, status, main_image, hero_image, main_image_url, hero_image_url")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("title")
      .limit(100);
    if (constrainTownId) tq = tq.eq("id", constrainTownId);
    const safeT = sanitizeSearchToken(trimmedQ);
    if (safeT) {
      tq = tq.or(`title.ilike.%${safeT}%,slug.ilike.%${safeT}%,excerpt.ilike.%${safeT}%`);
    }
    const { data: browseTownsRaw } = await tq;
    const browseTowns: BrowseTownRow[] = (browseTownsRaw ?? []).map((t) => {
      const r = t as {
        id: string;
        title: string;
        slug: string;
        excerpt?: string | null;
        main_image?: string | null;
        hero_image?: string | null;
        main_image_url?: string | null;
        hero_image_url?: string | null;
      };
      return {
        id: r.id,
        name: r.title,
        slug: r.slug,
        ai_tagline: r.excerpt ?? null,
        hero_image_url: getPublicImageUrlWithView(
          r.main_image_url,
          r.hero_image_url,
          r.main_image,
          r.hero_image,
        ),
      };
    });

    return (
      <SearchPageClient
        browseMode="towns"
        browseTowns={browseTowns}
        initialQuery={displayQuery}
        results={emptySearchResult(displayQuery, "Beach towns and neighborhoods along 30A.")}
        townName={townName}
        towns={sidebarTowns}
        sidebarAreas={sidebarAreas}
        sidebarGuides={sidebarGuides}
        sidebarBusinesses={sidebarBusinesses}
        sidebarServices={sidebarServices}
        discoveryTags={discoveryTags}
      />
    );
  }

  if (browseMode === "guides") {
    if (!isGuidesEnabled(flags)) redirect("/");
    let gq = serviceSupabase
      .from("guides_view")
      .select("slug, title, excerpt, seo_description, main_image, hero_image, main_image_url, hero_image_url, status")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("title")
      .limit(100);
    const safeG = sanitizeSearchToken(trimmedQ);
    if (safeG) {
      gq = gq.or(`title.ilike.%${safeG}%,excerpt.ilike.%${safeG}%,search_keywords.ilike.%${safeG}%,seo_description.ilike.%${safeG}%`);
    }
    const { data: guides } = await gq;
    const browseGuides: BrowseGuideRow[] = (guides ?? []).map((g) => {
      const r = g as {
        slug: string;
        title: string;
        excerpt?: string | null;
        seo_description?: string | null;
        main_image?: string | null;
        hero_image?: string | null;
        main_image_url?: string | null;
        hero_image_url?: string | null;
      };
      return {
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt ?? null,
        seo_description: r.seo_description ?? null,
        og_image_url: getPublicImageUrlWithView(
          r.main_image_url,
          r.hero_image_url,
          r.main_image,
          r.hero_image,
        ),
      };
    });
    return (
      <SearchPageClient
        browseMode="guides"
        browseGuides={browseGuides}
        initialQuery={displayQuery}
        results={emptySearchResult(
          displayQuery,
          "Editorial guides for dining, beaches, and planning your Emerald Coast trip.",
        )}
        townName={townName}
        towns={sidebarTowns}
        sidebarAreas={sidebarAreas}
        sidebarGuides={sidebarGuides}
        sidebarBusinesses={sidebarBusinesses}
        sidebarServices={sidebarServices}
        discoveryTags={discoveryTags}
      />
    );
  }

  if (browseMode === "areas" || browseMode === "access") {
    const accessOnly = browseMode === "access";
    if (accessOnly) {
      let pq = serviceSupabase
        .from("points_of_interest_view")
        .select("id, title, slug, excerpt, poi_type, town_id, main_image, hero_image, main_image_url, hero_image_url, towns(slug, title)")
        .is("archived_at", null)
        .eq("status", DIRECTUS_PUBLISHED_STATUS)
        .or(BROWSE_VISIBLE_NOT_HIDDEN)
        .order("title")
        .limit(100);
      if (constrainTownId) pq = pq.eq("town_id", constrainTownId);
      const safeP = sanitizeSearchToken(trimmedQ);
      if (safeP) {
        pq = pq.or(`title.ilike.%${safeP}%,excerpt.ilike.%${safeP}%,search_keywords.ilike.%${safeP}%`);
      }
      const { data: pois } = await pq;
      const browseAreas: BrowseAreaRow[] = (pois ?? []).map((row) => {
        const r = row as {
          id: string;
          title: string;
          slug: string;
          excerpt?: string | null;
          poi_type?: string | null;
          main_image?: string | null;
          hero_image?: string | null;
          main_image_url?: string | null;
          hero_image_url?: string | null;
          towns: { slug: string; title: string } | { slug: string; title: string }[] | null;
        };
        const rawT = r.towns;
        const to = Array.isArray(rawT) ? rawT[0] : rawT;
        return {
          id: String(r.id),
          name: String(r.title),
          slug: String(r.slug),
          description_short: r.excerpt ?? null,
          area_type: String(r.poi_type ?? "point_of_interest"),
          town_slug: to?.slug ?? null,
          town_name: to?.title ?? null,
          hero_image_url: getPublicImageUrlWithView(
            r.main_image_url,
            r.hero_image_url,
            r.main_image,
            r.hero_image,
          ),
        };
      });
      return (
        <SearchPageClient
          browseMode="access"
          browseAreas={browseAreas}
          initialQuery={displayQuery}
          results={emptySearchResult(
            displayQuery,
            "Parks, preserves, landmarks, and notable places along the Emerald Coast.",
          )}
          townName={townName}
          towns={sidebarTowns}
          sidebarAreas={sidebarAreas}
        sidebarGuides={sidebarGuides}
        sidebarBusinesses={sidebarBusinesses}
        sidebarServices={sidebarServices}
          discoveryTags={discoveryTags}
        />
      );
    }

    let aq = serviceSupabase
      .from("areas_view")
      .select("id, title, slug, excerpt, area_type, town_id, is_shopping_area, main_image, hero_image, main_image_url, hero_image_url, towns(slug, title)")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("title")
      .limit(100);
    if (constrainTownId) aq = aq.eq("town_id", constrainTownId);
    const safeA = sanitizeSearchToken(trimmedQ);
    if (safeA) {
      aq = aq.or(`title.ilike.%${safeA}%,slug.ilike.%${safeA}%,excerpt.ilike.%${safeA}%,search_keywords.ilike.%${safeA}%`);
    }
    const { data: rawAreas } = await aq;
    const browseAreas: BrowseAreaRow[] = (rawAreas ?? []).map((row: Record<string, unknown>) => {
        const r = row as {
          id: string;
          title: string;
          slug: string;
          excerpt?: string | null;
          area_type?: string | null;
          main_image?: string | null;
          hero_image?: string | null;
          main_image_url?: string | null;
          hero_image_url?: string | null;
          towns:
            | { slug: string; title: string }
            | { slug: string; title: string }[]
            | null;
        };
        const rawT = r.towns;
        const to = Array.isArray(rawT) ? rawT[0] : rawT;
        return {
          id: String(r.id),
          name: String(r.title),
          slug: String(r.slug),
          description_short: r.excerpt ?? null,
          area_type: String(r.area_type ?? "area"),
          town_slug: to?.slug ?? null,
          town_name: to?.title ?? null,
          hero_image_url: getPublicImageUrlWithView(
            r.main_image_url,
            r.hero_image_url,
            r.main_image,
            r.hero_image,
          ),
        };
      });

    return (
      <SearchPageClient
        browseMode={browseMode}
        browseAreas={browseAreas}
        initialQuery={displayQuery}
        results={emptySearchResult(
          displayQuery,
          accessOnly
            ? "Parks, preserves, landmarks, and notable places along the Emerald Coast."
            : "Shopping and neighborhood areas on 30A.",
        )}
        townName={townName}
        towns={sidebarTowns}
        sidebarAreas={sidebarAreas}
        sidebarGuides={sidebarGuides}
        sidebarBusinesses={sidebarBusinesses}
        sidebarServices={sidebarServices}
        discoveryTags={discoveryTags}
      />
    );
  }

  const townOnlyBrowse = Boolean(constrainTownId && !trimmedQ && !typeKey);
  const areaOnlyBrowse = Boolean(constrainAreaId && !trimmedQ && !typeKey);
  const skipIlikeTextFilter =
    ((typeKey === "businesses" || typeKey === "services") && !trimmedQ) ||
    townOnlyBrowse ||
    areaOnlyBrowse;
  /**
   * Text match uses a single `ilike` on title/excerpt/search_keywords. Do not append
   * " in {townName}" when `town_id` is already a column filter — that would require one
   * field to contain the whole phrase (e.g. "donuts in Rosemary Beach") and hides real matches.
   */
  const runSearchRawQuery = skipIlikeTextFilter
    ? typeKey === "services"
      ? TYPE_FILTERS.services.label
      : TYPE_FILTERS.businesses.label
    : constrainTownId || constrainAreaId
      ? (trimmedQ || effectiveQuery)
      : townName
        ? `${effectiveQuery} in ${townName}`
        : effectiveQuery;

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("whereto_sid")?.value ?? null;

  const searchResult = await runSearch({
    rawQuery: runSearchRawQuery,
    userId: user?.id ?? null,
    sessionId,
    model,
    openaiKey: process.env.OPENAI_API_KEY,
    page: currentPage,
    pageSize: 12,
    requiredIsServiceBusiness: servicesOnly ? true : false,
    constrainTownId,
    constrainTownIds: constrainTownIds.length > 1 ? constrainTownIds : undefined,
    constrainAreaId,
    constrainCategorySlugs: storefrontCategorySlugs.length ? storefrontCategorySlugs : undefined,
    constrainServiceCategorySlugs: specialtySlugsForSearch.length ? specialtySlugsForSearch : undefined,
    sortMode,
    skipIlikeTextFilter,
    scopeOverride,
    constrainPriceBucket,
    constrainVibeTags: constrainVibeTags.length ? constrainVibeTags : undefined,
  });

  return (
    <SearchPageClient
      browseMode="business"
      servicesOnly={servicesOnly}
      initialQuery={displayQuery}
      results={searchResult}
      townName={townName}
      areaName={areaName}
      towns={sidebarTowns}
      categoryOptions={categoryOptions}
      serviceCategoryOptions={serviceCategoryOptions}
      areaOptions={areaOptions}
      sidebarAreas={sidebarAreas}
        sidebarGuides={sidebarGuides}
        sidebarBusinesses={sidebarBusinesses}
        sidebarServices={sidebarServices}
      discoveryTags={discoveryTags}
    />
  );
}
