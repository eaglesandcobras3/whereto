import { redirect } from "next/navigation";
import { runSearch } from "@/lib/search/run-search";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN } from "@/lib/shop/public-listing-filters";
import { SearchPageClient, type DiscoveryTag } from "./search-page-client";
import type { Metadata } from "next";
import type { SearchResultPayload } from "@/lib/search/types";
import type { BrowseEventRow, BrowseAreaRow, BrowseGuideRow, BrowseTownRow } from "./search-page-client";

type Props = {
  searchParams: Promise<{
    q?: string;
    town_id?: string;
    price?: string;
    page?: string;
    type?: string;
    sort?: string;
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

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, type: rawType } = await searchParams;
  const type = normalizeSearchType(rawType);
  if (type && TYPE_FILTERS[type]) {
    return {
      title: `${TYPE_FILTERS[type].label} | WhereTo30A`,
      description: `Explore ${TYPE_FILTERS[type].label.toLowerCase()} across 30A and Florida's Emerald Coast.`,
    };
  }
  if (!q) return { title: "Search | WhereTo30A" };
  return {
    title: `Search results for "${q}" | WhereTo30A`,
    description: `Find towns, businesses, events, guides, and local favorites on 30A for "${q}".`,
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, town_id, page, type: rawType, sort: sortParam } = await searchParams;
  const type = normalizeSearchType(rawType);
  const sortMode = sortParam === "updated" ? ("updated" as const) : ("relevance" as const);

  const typeKey = type && TYPE_FILTERS[type] ? type : undefined;
  const trimmedQ = q?.trim() ?? "";
  const effectiveQuery = trimmedQ || (typeKey ? TYPE_FILTERS[typeKey].query : "") || "";

  if (!effectiveQuery) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const serviceSupabase = getServiceSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  let townName = "";
  let constrainTownId: string | undefined;
  if (town_id?.trim()) {
    const { data: town } = await serviceSupabase
      .from("towns")
      .select("id, title")
      .eq("id", town_id.trim())
      .maybeSingle();
    if (town) {
      constrainTownId = (town as { id: string }).id;
      townName = (town as { title: string }).title;
    }
  }

  const displayQuery = trimmedQ || (typeKey ? TYPE_FILTERS[typeKey!]!.label : "") || effectiveQuery;
  const currentPage = Math.max(1, Number(page) || 1);

  const { data: sidebarRows } = await serviceSupabase
    .from("towns")
    .select("id, title, slug")
    .is("archived_at", null)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title")
    .limit(50);
  const sidebarTowns = (sidebarRows ?? []).map((t) => ({
    id: t.id,
    name: (t as { title: string }).title,
    slug: t.slug,
  }));

  const { data: recentBiz } = await serviceSupabase
    .from("businesses_view")
    .select("id, title, slug, main_image, hero_image, main_image_url, hero_image_url, date_updated")
    .is("archived_at", null)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("date_updated", { ascending: false, nullsFirst: false })
    .limit(5);
  const recentPostsResult = {
    data: (recentBiz ?? []).map((b) => {
      const r = b as {
        id: string;
        title: string;
        slug: string;
        main_image?: string | null;
        hero_image?: string | null;
        main_image_url?: string | null;
        hero_image_url?: string | null;
      };
      return {
        id: r.id,
        name: r.title,
        slug: r.slug,
        hero_image_url: getPublicImageUrlWithView(
          r.main_image_url,
          r.hero_image_url,
          r.main_image,
          r.hero_image,
        ),
      };
    }),
  };

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
            recentPosts={recentPostsResult.data ?? []}
            discoveryTags={discoveryTags}
          />
        );
      }
    }
    let evQuery = serviceSupabase
      .from("events_view")
      .select("id, slug, title, excerpt, main_image, hero_image, main_image_url, hero_image_url, starts_at, ends_at, location_name, cost_notes, ticket_url, recurrence_rule, status")
      .is("archived_at", null)
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
        recentPosts={recentPostsResult.data ?? []}
        discoveryTags={discoveryTags}
      />
    );
  }

  if (browseMode === "towns") {
    let tq = serviceSupabase
      .from("towns_view")
      .select("id, title, slug, excerpt, status, main_image, hero_image, main_image_url, hero_image_url")
      .is("archived_at", null)
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
        recentPosts={recentPostsResult.data ?? []}
        discoveryTags={discoveryTags}
      />
    );
  }

  if (browseMode === "guides") {
    let gq = serviceSupabase
      .from("guides_view")
      .select("slug, title, excerpt, seo_description, main_image, hero_image, main_image_url, hero_image_url, status")
      .is("archived_at", null)
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
        recentPosts={recentPostsResult.data ?? []}
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
          recentPosts={recentPostsResult.data ?? []}
          discoveryTags={discoveryTags}
        />
      );
    }

    let aq = serviceSupabase
      .from("areas_view")
      .select("id, title, slug, excerpt, area_type, town_id, is_shopping_area, main_image, hero_image, main_image_url, hero_image_url, towns(slug, title)")
      .is("archived_at", null)
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
        recentPosts={recentPostsResult.data ?? []}
        discoveryTags={discoveryTags}
      />
    );
  }

  const skipIlikeTextFilter =
    (typeKey === "businesses" || typeKey === "services") && !trimmedQ;
  const runSearchRawQuery = skipIlikeTextFilter
    ? (typeKey ? TYPE_FILTERS[typeKey].label : effectiveQuery)
    : townName
      ? `${effectiveQuery} in ${townName}`
      : effectiveQuery;

  const searchResult = await runSearch({
    rawQuery: runSearchRawQuery,
    userId: user?.id ?? null,
    model,
    openaiKey: process.env.OPENAI_API_KEY,
    page: currentPage,
    pageSize: 12,
    requiredHasPhysicalLocation: type === "services" ? false : undefined,
    constrainTownId,
    sortMode,
    skipIlikeTextFilter,
  });

  return (
    <SearchPageClient
      browseMode="business"
      initialQuery={displayQuery}
      results={searchResult}
      townName={townName}
      towns={sidebarTowns}
      recentPosts={recentPostsResult.data ?? []}
      discoveryTags={discoveryTags}
    />
  );
}
