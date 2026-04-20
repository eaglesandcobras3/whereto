import { redirect } from "next/navigation";
import { runSearch } from "@/lib/search/run-search";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { SearchPageClient } from "./search-page-client";
import type { Metadata } from "next";
import type { SearchResultPayload } from "@/lib/search/types";

type Props = {
  searchParams: Promise<{
    q?: string;
    town_id?: string;
    price?: string;
    page?: string;
    type?: string;
  }>;
};

// Type filter labels and default queries (used when `q` is empty)
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

/** `type=areas` browse should only show shopping areas. */
const AREA_TYPES_FOR_AREAS_SEARCH = ["shopping_area"] as const;

function normalizeSearchType(type: string | undefined): string | undefined {
  if (!type) return undefined;
  if (type === "stores") return "businesses";
  return type;
}

/** Strip characters that break PostgREST `.or(...)` / `ilike` filters. */
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
  const { q, town_id, price, type: rawType } = await searchParams;
  const type = normalizeSearchType(rawType);

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
  if (town_id) {
    const { data: town } = await serviceSupabase
      .from("towns")
      .select("name")
      .eq("id", Number(town_id))
      .single();
    if (town) townName = town.name;
  }

  const displayQuery = trimmedQ || (typeKey ? TYPE_FILTERS[typeKey]!.label : "") || effectiveQuery;

  const [townsResult, recentPostsResult] = await Promise.all([
    serviceSupabase.from("towns").select("name, slug").order("name").limit(10),
    serviceSupabase
      .from("businesses")
      .select("id, name, slug, hero_image_url")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const browseMode =
    type && BROWSE_TYPES.has(type)
      ? (type as "events" | "towns" | "guides" | "areas" | "access")
      : "business";

  if (browseMode === "events") {
    let evQuery = serviceSupabase
      .from("upcoming_events")
      .select(
        "id, slug, title, description, hero_image_url, event_date, end_date, town_name, town_slug, venue_name, price, website, tags, recurrence_frequency, recurrence_weekday, next_list_date"
      )
      .order("next_list_date", { ascending: true })
      .limit(100);

    if (town_id && !Number.isNaN(Number(town_id))) {
      evQuery = evQuery.eq("town_id", Number(town_id));
    }
    const safeEv = sanitizeSearchToken(trimmedQ);
    if (safeEv) {
      evQuery = evQuery.or(`title.ilike.%${safeEv}%,description.ilike.%${safeEv}%`);
    }

    const { data: browseEvents } = await evQuery;

    return (
      <SearchPageClient
        browseMode="events"
        browseEvents={browseEvents ?? []}
        initialQuery={displayQuery}
        results={emptySearchResult(
          displayQuery,
          townName
            ? `Upcoming happenings in ${townName}.`
            : "Festivals, markets, and happenings along 30A.",
        )}
        townName={townName}
        towns={townsResult.data ?? []}
        recentPosts={recentPostsResult.data ?? []}
      />
    );
  }

  if (browseMode === "towns") {
    let tq = serviceSupabase
      .from("towns")
      .select("id, name, slug, ai_tagline")
      .order("name")
      .limit(100);

    if (town_id && !Number.isNaN(Number(town_id))) {
      tq = tq.eq("id", Number(town_id));
    }
    const safeT = sanitizeSearchToken(trimmedQ);
    if (safeT) {
      tq = tq.or(`name.ilike.%${safeT}%,slug.ilike.%${safeT}%`);
    }

    const { data: browseTowns } = await tq;

    return (
      <SearchPageClient
        browseMode="towns"
        browseTowns={browseTowns ?? []}
        initialQuery={displayQuery}
        results={emptySearchResult(
          displayQuery,
          "Beach towns and neighborhoods along Florida's Scenic Highway 30A.",
        )}
        townName={townName}
        towns={townsResult.data ?? []}
        recentPosts={recentPostsResult.data ?? []}
      />
    );
  }

  if (browseMode === "areas" || browseMode === "access") {
    const accessOnly = browseMode === "access";
    const buildAreasQuery = (withBrowseFlag: boolean) => {
      let aq = serviceSupabase
        .from("areas")
        .select("id, name, slug, description_short, area_type, town_id, towns(slug, name)")
        .order("name")
        .limit(100);
      if (withBrowseFlag) {
        aq = aq.eq("include_in_site_browse", true);
      } else {
        // Legacy DB fallback before include_in_site_browse migration exists.
        aq = aq.neq("slug", "grayton-central");
      }
      if (town_id && !Number.isNaN(Number(town_id))) {
        aq = aq.eq("town_id", Number(town_id));
      }
      if (accessOnly) {
        aq = aq.eq("area_type", "point_of_interest");
      } else {
        aq = aq.in("area_type", [...AREA_TYPES_FOR_AREAS_SEARCH]);
      }
      const safeA = sanitizeSearchToken(trimmedQ);
      if (safeA) {
        aq = aq.or(`name.ilike.%${safeA}%,slug.ilike.%${safeA}%,description_short.ilike.%${safeA}%`);
      }
      return aq;
    };

    let rawAreas: Record<string, unknown>[] | null = null;
    const first = await buildAreasQuery(true);
    if (first.error && first.error.message.includes("include_in_site_browse")) {
      const fallback = await buildAreasQuery(false);
      rawAreas = (fallback.data as Record<string, unknown>[] | null) ?? [];
    } else {
      rawAreas = (first.data as Record<string, unknown>[] | null) ?? [];
    }
    const browseAreas = (rawAreas ?? [])
      .filter((row) => {
        const at = row.area_type as string;
        return accessOnly
          ? at === "point_of_interest"
          : (AREA_TYPES_FOR_AREAS_SEARCH as readonly string[]).includes(at);
      })
      .map((row: Record<string, unknown>) => {
        const towns = row.towns as { slug: string; name: string } | null | undefined;
        return {
          id: row.id as number,
          name: row.name as string,
          slug: row.slug as string,
          description_short: row.description_short as string | null,
          area_type: row.area_type as string,
          town_slug: towns?.slug ?? null,
          town_name: towns?.name ?? null,
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
            ? "Parks, preserves, landmarks, trailheads, and other notable places along the Emerald Coast."
            : "Shopping areas along 30A.",
        )}
        townName={townName}
        towns={townsResult.data ?? []}
        recentPosts={recentPostsResult.data ?? []}
      />
    );
  }

  if (browseMode === "guides") {
    let gq = serviceSupabase
      .from("pages")
      .select("slug, title, excerpt, seo_description, og_image_url")
      .eq("page_type", "guide")
      .eq("status", "published")
      .order("title")
      .limit(100);

    const safeG = sanitizeSearchToken(trimmedQ);
    if (safeG) {
      gq = gq.or(
        `title.ilike.%${safeG}%,seo_description.ilike.%${safeG}%,excerpt.ilike.%${safeG}%`,
      );
    }

    const { data: browseGuides } = await gq;

    return (
      <SearchPageClient
        browseMode="guides"
        browseGuides={browseGuides ?? []}
        initialQuery={displayQuery}
        results={emptySearchResult(
          displayQuery,
          "Editorial guides for dining, beaches, and planning your Emerald Coast trip.",
        )}
        townName={townName}
        towns={townsResult.data ?? []}
        recentPosts={recentPostsResult.data ?? []}
      />
    );
  }

  const searchResult = await runSearch({
    rawQuery: townName ? `${effectiveQuery} in ${townName}` : effectiveQuery,
    userId: user?.id ?? null,
    model,
    openaiKey: process.env.OPENAI_API_KEY,
    priceLevel: price ? parseInt(price, 10) : undefined,
    forcedCategorySlug: type === "services" ? "services" : undefined,
    excludedCategorySlug: type === "businesses" ? "services" : undefined,
    requiredHasPhysicalLocation:
      type === "services" ? false : type === "businesses" ? true : undefined,
  });

  return (
    <SearchPageClient
      browseMode="business"
      initialQuery={displayQuery}
      results={searchResult}
      townName={townName}
      towns={townsResult.data ?? []}
      recentPosts={recentPostsResult.data ?? []}
    />
  );
}
