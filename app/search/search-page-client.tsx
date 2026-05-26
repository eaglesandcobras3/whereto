"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RemoteCoverImage } from "@/components/discovery/RemoteCoverImage";
import type { SearchResultPayload } from "@/lib/search/types";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { gaEvent } from "@/lib/analytics/gtag-runner";

const ITEMS_PER_PAGE = 12;

function CardExploreHint({ label = "Explore" }: { label?: string }) {
  return (
    <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-[var(--color-primary)]">
      {label}
      <span
        className="material-symbols-outlined !text-base transition-transform group-hover:translate-x-0.5"
        aria-hidden
      >
        arrow_forward
      </span>
    </span>
  );
}

export type DiscoveryTag = {
  name: string;
  slug: string;
};

type Town = {
  id: string;
  name: string;
  slug: string;
};

type SidebarArea = {
  id: string;
  name: string;
  slug: string;
};

type SidebarGuide = {
  slug: string;
  title: string;
};

type SidebarBusiness = {
  id: string;
  name: string;
  slug: string;
};

type SidebarService = {
  id: string;
  name: string;
  slug: string;
};

export type BrowseEventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  hero_image_url: string | null;
  event_date: string;
  end_date: string | null;
  /** Present on `upcoming_events`: next occurrence (weekly) or `event_date` for one-off rows. */
  next_list_date?: string | null;
  recurrence_frequency?: string | null;
  recurrence_weekday?: number | null;
  town_name: string | null;
  town_slug: string | null;
  venue_name: string | null;
  price: string | null;
  website: string | null;
  tags: string[] | null;
};

export type BrowseTownRow = {
  id: string;
  name: string;
  slug: string;
  ai_tagline: string | null;
  hero_image_url: string | null;
};

export type BrowseGuideRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  seo_description: string | null;
  og_image_url: string | null;
};

export type BrowseAreaRow = {
  id: string;
  name: string;
  slug: string;
  description_short: string | null;
  area_type: string;
  town_slug: string | null;
  town_name: string | null;
  hero_image_url: string | null;
};

type BrowseMode = "business" | "events" | "towns" | "guides" | "areas" | "access";

const VIBE_TAGS = [
  // Occasion & mood
  { slug: "romantic", label: "Romantic" },
  { slug: "kid_friendly", label: "Kid Friendly" },
  { slug: "group_friendly", label: "Group Friendly" },
  { slug: "date_night", label: "Date Night" },
  { slug: "solo_friendly", label: "Solo Friendly" },
  // Setting
  { slug: "waterfront", label: "Waterfront" },
  { slug: "beachfront", label: "Beachfront" },
  { slug: "outdoor_seating", label: "Outdoor Seating" },
  { slug: "scenic_views", label: "Scenic Views" },
  // Experience
  { slug: "upscale", label: "Upscale" },
  { slug: "casual", label: "Casual" },
  { slug: "local_favorite", label: "Local Favorite" },
  { slug: "hidden_gem", label: "Hidden Gem" },
  { slug: "instagrammable", label: "Instagrammable" },
  // Meal & timing
  { slug: "breakfast", label: "Breakfast" },
  { slug: "brunch", label: "Brunch" },
  { slug: "quick_bite", label: "Quick Bite" },
  { slug: "late_night", label: "Late Night" },
  { slug: "happy_hour", label: "Happy Hour" },
  // Amenities
  { slug: "live_music", label: "Live Music" },
  { slug: "pet_friendly", label: "Pet Friendly" },
  { slug: "parking", label: "Easy Parking" },
  { slug: "walkable", label: "Walkable" },
  { slug: "free_entry", label: "Free Entry" },
  // Activity type
  { slug: "outdoor_activities", label: "Outdoor Activities" },
  { slug: "water_sports", label: "Water Sports" },
  { slug: "shopping", label: "Shopping" },
  { slug: "art_culture", label: "Art & Culture" },
  { slug: "spa_wellness", label: "Spa & Wellness" },
];

function areaTypeLabel(areaType: string): string {
  if (areaType === "point_of_interest") return "Landmark / park / access";
  return areaType.replace(/_/g, " ");
}

type CategoryOption = { title: string; slug: string };
type AreaOption = { id: string; title: string };

type Props = {
  browseMode?: BrowseMode;
  browseEvents?: BrowseEventRow[];
  browseTowns?: BrowseTownRow[];
  browseGuides?: BrowseGuideRow[];
  browseAreas?: BrowseAreaRow[];
  initialQuery: string;
  results: SearchResultPayload;
  townName?: string;
  areaName?: string;
  towns?: Town[];
  /** Business category filters (primary `business_categories.slug`). */
  categoryOptions?: CategoryOption[];
  /** `areas` rows for the area dropdown (optionally pre-scoped to selected town on the server). */
  areaOptions?: AreaOption[];
  sidebarAreas?: SidebarArea[];
  sidebarGuides?: SidebarGuide[];
  sidebarBusinesses?: SidebarBusiness[];
  sidebarServices?: SidebarService[];
  discoveryTags?: DiscoveryTag[];
};

function shortEventDates(eventDate: string, endDate: string | null): string {
  const start = new Date(eventDate + "T12:00:00");
  if (!endDate || endDate === eventDate) {
    return start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  const end = new Date(endDate + "T12:00:00");
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function formatEventBrowseWhen(ev: BrowseEventRow): string {
  if (
    ev.recurrence_frequency === "weekly" &&
    ev.recurrence_weekday != null &&
    ev.recurrence_weekday >= 0 &&
    ev.recurrence_weekday <= 6
  ) {
    const day = WEEKDAY_SHORT[ev.recurrence_weekday];
    if (ev.next_list_date) {
      const next = new Date(ev.next_list_date + "T12:00:00");
      const nextStr = next.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `Every ${day} · Next ${nextStr}`;
    }
    return `Every ${day}`;
  }
  return shortEventDates(ev.event_date, ev.end_date);
}

export function SearchPageClient({
  browseMode = "business",
  browseEvents = [],
  browseTowns = [],
  browseGuides = [],
  browseAreas = [],
  initialQuery,
  results,
  townName,
  areaName,
  towns = [],
  categoryOptions = [],
  areaOptions = [],
  sidebarAreas = [],
  sidebarGuides = [],
  sidebarBusinesses = [],
  sidebarServices = [],
  discoveryTags = [],
}: Props) {
  const isAreasLike = browseMode === "areas" || browseMode === "access";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const urlQ = searchParams.get("q");
  const sortP = searchParams.get("sort");
  const searchSort: "relevance" | "name" | "updated" =
    sortP === "updated" ? "updated" : sortP === "name" ? "name" : "relevance";

  // Multi-select URL state
  const filterTownIds: string[] = (() => {
    const raw = searchParams.get("town_id");
    return raw ? raw.split(",").filter(Boolean) : [];
  })();
  const filterTownId = filterTownIds[0] ?? null; // single-town anchor (scope/area logic)
  const filterCategorySlugs: string[] = (() => {
    const raw = searchParams.get("category");
    return raw ? raw.split(",").filter(Boolean) : [];
  })();
  const filterCategory = filterCategorySlugs[0] ?? ""; // backward compat
  const filterVibeTags: string[] = (() => {
    const raw = searchParams.get("tags");
    return raw ? raw.split(",").filter(Boolean) : [];
  })();
  const filterAreaId = searchParams.get("area_id") ?? "";
  const filterScope = searchParams.get("scope") ?? "";
  const filterPrice = searchParams.get("price") ?? "";

  // AI-detected filters from server (resolved_filters minus what's already in URL)
  const resolvedFilters = results.resolved_filters;
  const aiTownIds = resolvedFilters?.town_ids.filter((id) => !filterTownIds.includes(id)) ?? [];
  const aiCategorySlugs = resolvedFilters?.category_slugs.filter((s) => !filterCategorySlugs.includes(s)) ?? [];
  const aiVibeTags = resolvedFilters?.vibe_tags.filter((t) => !filterVibeTags.includes(t)) ?? [];
  const aiPriceBucket = !filterPrice && resolvedFilters?.price_bucket ? resolvedFilters.price_bucket : null;

  const [showAllCategories, setShowAllCategories] = useState(false);
  const [lastUrlQ, setLastUrlQ] = useState(urlQ);
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ);
    setQ(urlQ ?? "");
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    const trimmed = q.trim();
    if (!trimmed) {
      params.delete("q");
    } else {
      params.set("q", trimmed);
    }
    startTransition(() => router.push(`/search?${params.toString()}`));
  };

  const setSearchSort = (next: "relevance" | "name" | "updated") => {
    if (browseMode !== "business") return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === "relevance") params.delete("sort");
    else params.set("sort", next);
    params.delete("page");
    startTransition(() => router.push(`/search?${params.toString()}`));
  };

  const toggleTownFilter = (townId: string) => {
    if (browseMode !== "business") return;
    gaEvent("search_filter_change", { filter: "town_id", value: townId });
    const params = new URLSearchParams(searchParams.toString());
    const next = filterTownIds.includes(townId)
      ? filterTownIds.filter((id) => id !== townId)
      : [...filterTownIds, townId];
    if (!next.length) {
      params.delete("town_id");
      params.delete("scope");
    } else {
      params.set("town_id", next.join(","));
      if (next.length !== 1) params.delete("scope"); // scope only valid for single town
    }
    params.delete("area_id");
    params.delete("page");
    startTransition(() => router.push(`/search?${params.toString()}`));
  };

  const clearTownFilter = () => {
    if (browseMode !== "business") return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("town_id");
    params.delete("scope");
    params.delete("area_id");
    params.delete("page");
    startTransition(() => router.push(`/search?${params.toString()}`));
  };

  const toggleCategoryFilter = (slug: string) => {
    if (browseMode !== "business") return;
    gaEvent("search_filter_change", { filter: "category", value: slug });
    const params = new URLSearchParams(searchParams.toString());
    const next = filterCategorySlugs.includes(slug)
      ? filterCategorySlugs.filter((s) => s !== slug)
      : [...filterCategorySlugs, slug];
    if (!next.length) params.delete("category");
    else params.set("category", next.join(","));
    params.delete("page");
    startTransition(() => router.push(`/search?${params.toString()}`));
  };

  const clearCategoryFilter = () => {
    if (browseMode !== "business") return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    params.delete("page");
    startTransition(() => router.push(`/search?${params.toString()}`));
  };

  const toggleVibeTag = (slug: string) => {
    gaEvent("search_filter_change", { filter: "tags", value: slug });
    const params = new URLSearchParams(searchParams.toString());
    const next = filterVibeTags.includes(slug)
      ? filterVibeTags.filter((t) => t !== slug)
      : [...filterVibeTags, slug];
    if (!next.length) params.delete("tags");
    else params.set("tags", next.join(","));
    params.delete("page");
    startTransition(() => router.push(`/search?${params.toString()}`));
  };

  const setAreaFilter = (areaId: string) => {
    if (browseMode !== "business") return;
    gaEvent("search_filter_change", { filter: "area_id", value: areaId || "clear" });
    const params = new URLSearchParams(searchParams.toString());
    if (!areaId) params.delete("area_id");
    else params.set("area_id", areaId);
    params.delete("page");
    startTransition(() => router.push(`/search?${params.toString()}`));
  };

  const setScopeFilter = (scope: string) => {
    gaEvent("search_filter_change", { filter: "scope", value: scope || "in" });
    const params = new URLSearchParams(searchParams.toString());
    if (!scope || scope === "in") params.delete("scope");
    else params.set("scope", scope);
    params.delete("page");
    startTransition(() => router.push(`/search?${params.toString()}`));
  };

  const setPriceFilter = (price: string) => {
    gaEvent("search_filter_change", { filter: "price", value: price || "any" });
    const params = new URLSearchParams(searchParams.toString());
    if (!price) params.delete("price");
    else params.set("price", price);
    params.delete("page");
    startTransition(() => router.push(`/search?${params.toString()}`));
  };

  const totalResults =
    browseMode === "events"
      ? browseEvents.length
      : browseMode === "towns"
        ? browseTowns.length
        : browseMode === "guides"
          ? browseGuides.length
          : isAreasLike
            ? browseAreas.length
            : (results.total_results ?? results.recommendations.length);

  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedBusiness = results.recommendations;
  const paginatedEvents = browseEvents.slice(startIndex, endIndex);
  const paginatedTowns = browseTowns.slice(startIndex, endIndex);
  const paginatedGuides = browseGuides.slice(startIndex, endIndex);
  const paginatedAreas = browseAreas.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }
    startTransition(() => router.push(`/search?${params.toString()}`));
  };

  const headingSecondary =
    browseMode === "business"
      ? `${totalResults} results for “${initialQuery}”`
      : browseMode === "events"
        ? `${totalResults} upcoming events`
        : browseMode === "towns"
          ? `${totalResults} towns`
          : browseMode === "access"
            ? `${totalResults} landmarks & parks`
            : browseMode === "areas"
              ? `${totalResults} areas`
              : `${totalResults} guides`;

  const hasRows =
    browseMode === "events"
      ? paginatedEvents.length > 0
      : browseMode === "towns"
        ? paginatedTowns.length > 0
        : browseMode === "guides"
          ? paginatedGuides.length > 0
          : isAreasLike
            ? paginatedAreas.length > 0
            : paginatedBusiness.length > 0;

  // Check if a discovery tag is active in the current query
  const activeDiscoveryTag = discoveryTags.find(
    (tag) => q.toLowerCase().includes(tag.name.toLowerCase()) ||
             initialQuery.toLowerCase().includes(tag.name.toLowerCase())
  );

  const handleDiscoveryTagClick = (tag: DiscoveryTag) => {
    gaEvent("search_discovery_chip", { tag_slug: tag.slug, tag_name: tag.name.slice(0, 80) });
    const newQuery = tag.name.toLowerCase() + " 30A";
    setQ(newQuery);
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", newQuery);
    params.delete("page");
    startTransition(() => router.push(`/search?${params.toString()}`));
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      {/* Editorial search header */}
      {browseMode === "business" ? (
        <div className="sticky top-[var(--site-header-offset-mobile)] z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 py-4 backdrop-blur-md md:top-[var(--site-header-offset)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Discovery chips - horizontal scroll */}
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
              {/* Discovery tags as editorial prompts */}
              {discoveryTags.map((tag) => (
                <button
                  key={tag.slug}
                  type="button"
                  {...gaClickProps({
                    event: "cta_click",
                    category: "search_discovery_chips",
                    label: tag.slug,
                  })}
                  onClick={() => handleDiscoveryTagClick(tag)}
                  className={`discovery-chip ${
                    activeDiscoveryTag?.slug === tag.slug ? "discovery-chip-active" : ""
                  }`}
                >
                  {tag.name}
                </button>
              ))}

              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
                {isPending && (
                  <span
                    className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)]"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
                    Searching…
                  </span>
                )}
                <label className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
                  <span className="shrink-0">Sort</span>
                  <select
                    value={searchSort}
                    disabled={isPending}
                    onChange={(e) => {
                      const v = e.target.value;
                      gaEvent("search_filter_change", { filter: "sort_ui", value: v });
                      setSearchSort(v === "updated" || v === "name" ? v : "relevance");
                    }}
                    className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text-secondary)]"
                    aria-label="Sort results"
                  >
                    <option value="relevance">Best match</option>
                    <option value="name">Name (A–Z)</option>
                    <option value="updated">Recently updated</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* Main content - wider on desktop */}
            <div
              className={`relative flex-1 lg:w-3/4 transition-opacity duration-150 ${isPending ? "pointer-events-none opacity-55" : "opacity-100"}`}
              aria-busy={isPending && browseMode === "business" ? true : undefined}
            >
              {/* Editorial heading */}
              <div className="mb-8">
                {browseMode === "business" && isPending ? (
                  <div
                    className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-4 py-3"
                    role="status"
                    aria-live="polite"
                  >
                    <span
                      className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent"
                      aria-hidden
                    />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      Updating results…
                    </span>
                  </div>
                ) : null}
                <p className="text-eyebrow mb-2">
                  {browseMode === "business"
                    ? (townName && areaName
                        ? `Discovering ${areaName} · ${townName}`
                        : townName
                          ? `Discovering ${townName}`
                          : areaName
                            ? `Discovering ${areaName}`
                            : "Local Businesses")
                    : browseMode === "events"
                      ? "Upcoming Events"
                      : browseMode === "guides"
                        ? "Editorial Guides"
                        : "Explore"}
                </p>
                <h1 className="text-editorial-headline text-3xl text-[var(--color-text-primary)] sm:text-4xl">
                  {browseMode === "business"
                    ? `${totalResults} ${totalResults === 1 ? "business" : "businesses"}${
                        townName && areaName
                          ? ` in ${areaName} · ${townName}`
                          : townName
                            ? ` in ${townName}`
                            : areaName
                              ? ` in ${areaName}`
                              : ""
                      }`
                    : headingSecondary}
                </h1>
                {(() => {
                  if (!results.summary) return null;
                  let summaryText = results.summary;
                  if (browseMode === "business") {
                    // Keep the count/wording in sync with header total.
                    summaryText = summaryText
                      .replace(/Found\s+\d+\s+local\s+matches/i, `Found ${totalResults} local businesses`)
                      .replace(/\bfavorites\b/gi, "businesses")
                      .replace(/\bfavorite\b/gi, "business");
                  }
                  return (
                  <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
                    {summaryText}
                  </p>
                  );
                })()}
              </div>

              {process.env.NODE_ENV === "development" && results._debug && (
                <details className="mb-6 rounded border border-amber-300 bg-amber-50 text-xs">
                  <summary className="cursor-pointer px-3 py-2 font-mono font-semibold text-amber-800 select-none">
                    🔍 Search debug
                  </summary>
                  <div className="space-y-2 px-3 pb-3 pt-1">
                    <div>
                      <span className="font-semibold text-amber-900">rawQuery:</span>{" "}
                      <code className="text-amber-800">{results.query}</code>
                    </div>
                    <div>
                      <span className="font-semibold text-amber-900">normalizedQuery:</span>{" "}
                      <code className="text-amber-800">{results.normalized_query}</code>
                    </div>
                    <div>
                      <span className="font-semibold text-amber-900">filterCategoryId:</span>{" "}
                      <code className="text-amber-800">{results._debug.filterCategoryId ?? "null"}</code>
                    </div>
                    <div>
                      <span className="font-semibold text-amber-900">resolvedTownId:</span>{" "}
                      <code className="text-amber-800">{results._debug.resolvedTownId ?? "undefined"}</code>
                    </div>
                    <div>
                      <span className="font-semibold text-amber-900">nearTownIds:</span>{" "}
                      <code className="text-amber-800">{results._debug.nearTownIds ? results._debug.nearTownIds.join(", ") : "undefined"}</code>
                    </div>
                    <div>
                      <span className="font-semibold text-amber-900">searchTermOverride:</span>{" "}
                      <code className="text-amber-800">{results._debug.searchTermOverride ?? "undefined"}</code>
                    </div>
                    <div>
                      <span className="font-semibold text-amber-900">pageBrowseWithoutQuery:</span>{" "}
                      <code className="text-amber-800">
                        {String(results._debug.pageBrowseWithoutQuery)}
                      </code>
                    </div>
                    <div>
                      <span className="font-semibold text-amber-900">skipIlike:</span>{" "}
                      <code className="text-amber-800">{String(results._debug.skipIlike)}</code>
                    </div>
                    <div>
                      <span className="font-semibold text-amber-900">intent:</span>
                      <pre className="mt-1 overflow-x-auto rounded bg-amber-100 p-2 text-amber-800">
                        {JSON.stringify(results._debug.intent, null, 2)}
                      </pre>
                    </div>
                  </div>
                </details>
              )}

              {hasRows ? (
                <div className="space-y-4">
                  {browseMode === "business"
                    ? paginatedBusiness.map((rec) => {
                        const img = rec.business.image_url || rec.business.hero_image_url;
                        return (
                          <article
                            key={rec.business_id}
                            className="editorial-card group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all hover:border-[var(--color-primary)]/30 hover:shadow-md"
                          >
                            <Link
                              href={`/business/${rec.business.slug}`}
                              className="card-horizontal"
                              {...gaClickProps({
                                event: "nav_click",
                                category: "search_results_business",
                                label: String(rec.business.slug ?? rec.business_id).slice(0, 120),
                              })}
                            >
                              {/* Portrait image - left side, flush with content (no radius on trailing edge) */}
                              <div className="card-horizontal-image">
                                <div className="card-horizontal-image-inner">
                                  <RemoteCoverImage
                                    src={img}
                                    alt={rec.business.name}
                                    className="object-contain object-center rounded-none"
                                    sizes="(max-width: 640px) 112px, 144px"
                                    placeholderIcon="storefront"
                                  />
                                </div>
                              </div>

                              {/* Content - right side */}
                              <div className="card-horizontal-content gap-1.5 px-5 py-6 sm:gap-2 sm:px-6 sm:py-8">
                                {/* Meta line */}
                                <div className="mb-1 flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                                  {rec.business.town_name && (
                                    <span className="font-medium">{rec.business.town_name}</span>
                                  )}
                                  {rec.business.price_level && rec.business.town_name && (
                                    <span>·</span>
                                  )}
                                  {rec.business.price_level && (
                                    <span>{"$".repeat(rec.business.price_level)}</span>
                                  )}
                                  {process.env.NODE_ENV === "development" && (rec._vec_similarity != null || rec._composite != null) && (
                                    <>
                                      <span>·</span>
                                      <span className="font-mono text-[10px] text-amber-600">
                                        {rec._composite != null ? `c:${rec._composite.toFixed(3)}` : ""}
                                        {rec._composite != null && rec._vec_similarity != null ? " " : ""}
                                        {rec._vec_similarity != null ? `v:${rec._vec_similarity.toFixed(3)}` : ""}
                                      </span>
                                    </>
                                  )}
                                </div>

                                {/* Title */}
                                <h2 className="font-headline text-lg font-bold leading-tight text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)] sm:text-xl">
                                  {rec.business.name}
                                </h2>

                                {/* Editorial description */}
                                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:line-clamp-3">
                                  {rec.explanation ||
                                    rec.business.ai_summary ||
                                    "Discover this local gem on 30A."}
                                </p>

                                {/* Tags as editorial badges */}
                                {(() => {
                                  const highlights = [
                                    ...(rec.highlighted_tags ?? []),
                                    ...(rec.business.tags ?? []),
                                  ];
                                  const unique = [...new Set(highlights)].slice(0, 3);
                                  if (unique.length === 0) return null;
                                  return (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {unique.map((tag) => (
                                        <span
                                          key={tag}
                                          className="rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]"
                                        >
                                          {tag.replace(/_/g, " ")}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                })()}
                                <CardExploreHint />
                              </div>
                            </Link>
                          </article>
                        );
                      })
                    : null}

                  {browseMode === "events"
                    ? paginatedEvents.map((ev) => (
                        <article
                          key={ev.id}
                          className="editorial-card group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all hover:border-[var(--color-primary)]/30 hover:shadow-md"
                        >
                          <Link
                            href={`/events/${ev.slug}`}
                            className="card-horizontal"
                            {...gaClickProps({
                              event: "nav_click",
                              category: "search_results_events",
                              label: ev.slug,
                            })}
                          >
                            <div className="card-horizontal-image">
                              <div className="card-horizontal-image-inner">
                                <RemoteCoverImage
                                  src={ev.hero_image_url}
                                  alt=""
                                  className="object-contain object-center rounded-none"
                                  sizes="(max-width: 640px) 112px, 144px"
                                  placeholderIcon="event"
                                />
                              </div>
                            </div>
                            <div className="card-horizontal-content gap-1.5 px-5 py-6 sm:gap-2 sm:px-6 sm:py-8">
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                                {formatEventBrowseWhen(ev)}
                              </p>
                              <h2 className="font-headline text-lg font-bold leading-tight text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)] sm:text-xl">
                                {ev.title}
                              </h2>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                                {ev.town_name && <span>{ev.town_name}</span>}
                                {ev.venue_name && ev.town_name && <span>·</span>}
                                {ev.venue_name && <span>{ev.venue_name}</span>}
                                {ev.price && <span className="font-medium text-[var(--color-text-secondary)]">{ev.price}</span>}
                              </div>
                              {ev.description && (
                                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:line-clamp-3">
                                  {ev.description}
                                </p>
                              )}
                              <CardExploreHint />
                            </div>
                          </Link>
                        </article>
                      ))
                    : null}

                  {browseMode === "towns"
                    ? paginatedTowns.map((t) => (
                        <article
                          key={t.id}
                          className="editorial-card group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all hover:border-[var(--color-primary)]/30 hover:shadow-md"
                        >
                          <Link
                            href={`/${t.slug}`}
                            className="card-horizontal"
                            {...gaClickProps({
                              event: "nav_click",
                              category: "search_results_towns",
                              label: t.slug,
                            })}
                          >
                            <div className="card-horizontal-image">
                              <div className="card-horizontal-image-inner">
                                <RemoteCoverImage
                                  src={t.hero_image_url}
                                  alt={t.name}
                                  className="object-contain object-center rounded-none"
                                  sizes="(max-width: 640px) 112px, 144px"
                                  placeholderIcon="location_city"
                                />
                              </div>
                            </div>
                            <div className="card-horizontal-content gap-1.5 px-5 py-6 sm:gap-2 sm:px-6 sm:py-8">
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                                Town
                              </p>
                              <h2 className="font-headline text-lg font-bold leading-tight text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)] sm:text-xl">
                                {t.name}
                              </h2>
                              {t.ai_tagline ? (
                                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:line-clamp-3">
                                  {t.ai_tagline}
                                </p>
                              ) : (
                                <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-tertiary)] sm:line-clamp-3">
                                  Explore this 30A beach town.
                                </p>
                              )}
                              <CardExploreHint />
                            </div>
                          </Link>
                        </article>
                      ))
                    : null}

                  {isAreasLike
                    ? paginatedAreas.map((a) => (
                        <article
                          key={a.id}
                          className="editorial-card group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all hover:border-[var(--color-primary)]/30 hover:shadow-md"
                        >
                          <Link
                            href={`/area/${a.slug}`}
                            className="card-horizontal"
                            {...gaClickProps({
                              event: "nav_click",
                              category: "search_results_areas",
                              label: a.slug,
                            })}
                          >
                            <div className="card-horizontal-image">
                              <div className="card-horizontal-image-inner">
                                <RemoteCoverImage
                                  src={a.hero_image_url}
                                  alt={a.name}
                                  className="object-contain object-center rounded-none"
                                  sizes="(max-width: 640px) 112px, 144px"
                                  placeholderIcon="explore"
                                />
                              </div>
                            </div>
                            <div className="card-horizontal-content gap-1.5 px-5 py-6 sm:gap-2 sm:px-6 sm:py-8">
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                                {areaTypeLabel(a.area_type)}
                              </p>
                              <h2 className="font-headline text-lg font-bold leading-tight text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)] sm:text-xl">
                                {a.name}
                              </h2>
                              <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                                {a.town_name ? <span>{a.town_name}</span> : null}
                              </div>
                              {a.description_short ? (
                                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:line-clamp-3">
                                  {a.description_short}
                                </p>
                              ) : (
                                <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-tertiary)] sm:line-clamp-3">
                                  Named place or district on 30A.
                                </p>
                              )}
                              <CardExploreHint />
                            </div>
                          </Link>
                        </article>
                      ))
                    : null}

                  {browseMode === "guides"
                    ? paginatedGuides.map((g) => (
                        <article
                          key={g.slug}
                          className="editorial-card group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all hover:border-[var(--color-primary)]/30 hover:shadow-md"
                        >
                          <Link
                            href={`/guide/${g.slug}`}
                            className="card-horizontal"
                            {...gaClickProps({
                              event: "nav_click",
                              category: "search_results_guides",
                              label: g.slug,
                            })}
                          >
                            <div className="card-horizontal-image">
                              <div className="card-horizontal-image-inner">
                                <RemoteCoverImage
                                  src={g.og_image_url}
                                  alt=""
                                  className="object-contain object-center rounded-none"
                                  sizes="(max-width: 640px) 112px, 144px"
                                  placeholderIcon="menu_book"
                                />
                              </div>
                            </div>
                            <div className="card-horizontal-content gap-1.5 px-5 py-6 sm:gap-2 sm:px-6 sm:py-8">
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                                Guide
                              </p>
                              <h2 className="font-headline text-lg font-bold leading-tight text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)] sm:text-xl">
                                {g.title}
                              </h2>
                              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:line-clamp-3">
                                {g.excerpt || g.seo_description || "Local guide to 30A towns, favorites, and trip ideas."}
                              </p>
                              <CardExploreHint />
                            </div>
                          </Link>
                        </article>
                      ))
                    : null}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)]">
                    <span className="material-symbols-outlined !text-3xl">search_off</span>
                  </div>
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">No results found</h2>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                    Try adjusting your search or filters to find what you&apos;re looking for.
                  </p>
                </div>
              )}

              {totalPages > 1 ? (
                <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    {...gaClickProps({
                      event: "pagination_click",
                      category: "search_pagination",
                      label: "prev",
                    })}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Previous page"
                  >
                    <span className="material-symbols-outlined text-xl">chevron_left</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      const showPage =
                        page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;

                      if (!showPage) {
                        if (page === 2 || page === totalPages - 1) {
                          return (
                            <span
                              key={page}
                              className="flex h-10 w-10 items-center justify-center text-[var(--color-text-tertiary)]"
                            >
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => goToPage(page)}
                          {...gaClickProps({
                            event: "pagination_click",
                            category: "search_pagination",
                            label: `page_${page}`,
                          })}
                          className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                            page === currentPage
                              ? "bg-[var(--color-primary)] text-white"
                              : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
                          }`}
                          aria-current={page === currentPage ? "page" : undefined}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    {...gaClickProps({
                      event: "pagination_click",
                      category: "search_pagination",
                      label: "next",
                    })}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Next page"
                  >
                    <span className="material-symbols-outlined text-xl">chevron_right</span>
                  </button>
                </nav>
              ) : null}

              {totalResults > 0 ? (
                <p className="mt-4 text-center text-sm text-[var(--color-text-tertiary)]">
                  Showing {startIndex + 1}–{Math.min(endIndex, totalResults)} of {totalResults} results
                </p>
              ) : null}

              {/* Scope expansion / narrowing suggestion */}
              {browseMode === "business" && filterTownIds.length === 1 && townName && (() => {
                const scope = filterScope || "in";
                if (totalResults < 3 && scope === "in") {
                  return (
                    <p className="mt-3 text-center text-sm">
                      <button onClick={() => setScopeFilter("near")} className="text-[var(--color-primary)] hover:underline">
                        Not finding it? Search near {townName} →
                      </button>
                    </p>
                  );
                }
                if (totalResults < 3 && scope === "near") {
                  return (
                    <p className="mt-3 text-center text-sm">
                      <button onClick={() => setScopeFilter("anywhere")} className="text-[var(--color-primary)] hover:underline">
                        Try searching all of 30A →
                      </button>
                    </p>
                  );
                }
                if (totalResults > 8 && scope === "near") {
                  return (
                    <p className="mt-3 text-center text-sm text-[var(--color-text-tertiary)]">
                      Too many results?{" "}
                      <button onClick={() => setScopeFilter("in")} className="text-[var(--color-primary)] hover:underline">
                        Narrow to just {townName}
                      </button>
                    </p>
                  );
                }
                if (totalResults > 8 && scope === "anywhere") {
                  return (
                    <p className="mt-3 text-center text-sm text-[var(--color-text-tertiary)]">
                      Too many results?{" "}
                      <button onClick={() => setScopeFilter("near")} className="text-[var(--color-primary)] hover:underline">
                        Narrow to near {townName}
                      </button>
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            {/* Filter sidebar */}
            <aside className="hidden lg:block lg:w-1/4">
              <div className="sticky top-[calc(var(--site-header-offset)+5rem)] space-y-6 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">

                {/* Search input */}
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2 !text-[1.1rem] text-[var(--color-text-tertiary)]">search</span>
                    <input
                      type="text"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder={urlQ ? "Edit search…" : "Search 30A…"}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-8 pr-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none"
                    />
                  </div>
                </form>

                {/* Location filter */}
                {browseMode === "business" && towns.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-eyebrow">Location</h3>
                      {filterTownIds.length > 0 && (
                        <button
                          type="button"
                          onClick={clearTownFilter}
                          className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)]"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <ul className="space-y-0.5">
                      {towns.map((town) => {
                        const isExplicit = filterTownIds.includes(town.id);
                        const isAiDetected = aiTownIds.includes(town.id);
                        return (
                          <li key={town.id}>
                            <button
                              type="button"
                              onClick={() => toggleTownFilter(town.id)}
                              className={`group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                                isExplicit
                                  ? "bg-[var(--color-primary)]/10 font-semibold text-[var(--color-primary)]"
                                  : isAiDetected
                                    ? "bg-[var(--color-primary)]/5 text-[var(--color-primary)]/75"
                                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-primary)]"
                              }`}
                            >
                              <span>{town.name}</span>
                              {isExplicit && (
                                <span className="material-symbols-outlined !text-sm text-[var(--color-primary)]">check</span>
                              )}
                              {!isExplicit && isAiDetected && (
                                <span className="rounded bg-[var(--color-primary)]/10 px-1 py-0.5 text-[10px] font-medium text-[var(--color-primary)]/70">
                                  suggested
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {filterTownIds.length > 0 && (
                      <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                        Showing results in {filterTownIds.length === 1 ? "1 town" : `${filterTownIds.length} towns`}
                      </p>
                    )}
                  </div>
                )}

                {/* Scope toggle — only when a single town is selected */}
                {browseMode === "business" && filterTownIds.length === 1 && (
                  <div>
                    <h3 className="text-eyebrow mb-2">Search radius</h3>
                    <div className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
                      {(["in", "near", "anywhere"] as const).map((s) => {
                        const label = s === "in" ? "In town" : s === "near" ? "Nearby" : "All 30A";
                        const active = (filterScope || "in") === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setScopeFilter(s === "in" ? "" : s)}
                            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${active ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"}`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Category filter */}
                {browseMode === "business" && categoryOptions.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-eyebrow">Category</h3>
                      {filterCategorySlugs.length > 0 && (
                        <button
                          type="button"
                          onClick={clearCategoryFilter}
                          className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)]"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {(() => {
                      const VISIBLE_COUNT = 8;
                      // Always show selected + AI-detected + first N others
                      const prioritized = categoryOptions.filter(
                        (c) => filterCategorySlugs.includes(c.slug) || aiCategorySlugs.includes(c.slug),
                      );
                      const rest = categoryOptions.filter(
                        (c) => !filterCategorySlugs.includes(c.slug) && !aiCategorySlugs.includes(c.slug),
                      );
                      const visible = showAllCategories
                        ? categoryOptions
                        : [...prioritized, ...rest].slice(0, VISIBLE_COUNT);
                      const hiddenCount = categoryOptions.length - visible.length;
                      return (
                        <>
                          <ul className="space-y-0.5">
                            {visible.map((cat) => {
                              const isExplicit = filterCategorySlugs.includes(cat.slug);
                              const isAiDetected = aiCategorySlugs.includes(cat.slug);
                              return (
                                <li key={cat.slug}>
                                  <button
                                    type="button"
                                    onClick={() => toggleCategoryFilter(cat.slug)}
                                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                                      isExplicit
                                        ? "bg-[var(--color-primary)]/10 font-semibold text-[var(--color-primary)]"
                                        : isAiDetected
                                          ? "bg-[var(--color-primary)]/5 text-[var(--color-primary)]/75"
                                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-primary)]"
                                    }`}
                                  >
                                    <span>{cat.title}</span>
                                    {isExplicit && (
                                      <span className="material-symbols-outlined !text-sm text-[var(--color-primary)]">check</span>
                                    )}
                                    {!isExplicit && isAiDetected && (
                                      <span className="rounded bg-[var(--color-primary)]/10 px-1 py-0.5 text-[10px] font-medium text-[var(--color-primary)]/70">
                                        suggested
                                      </span>
                                    )}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                          {!showAllCategories && hiddenCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowAllCategories(true)}
                              className="mt-1 w-full rounded-md px-2 py-1 text-left text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)]"
                            >
                              + {hiddenCount} more categories
                            </button>
                          )}
                          {showAllCategories && categoryOptions.length > VISIBLE_COUNT && (
                            <button
                              type="button"
                              onClick={() => setShowAllCategories(false)}
                              className="mt-1 w-full rounded-md px-2 py-1 text-left text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)]"
                            >
                              Show fewer
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Price filter */}
                {browseMode === "business" && (
                  <div>
                    <h3 className="text-eyebrow mb-2">Price range</h3>
                    <div className="flex flex-col gap-1">
                      {(
                        [
                          ["", "Any price", ""],
                          ["inexpensive", "Inexpensive", "$ – $$"],
                          ["moderate", "Moderate", "$$ – $$$"],
                          ["expensive", "Expensive", "$$$ – $$$$"],
                        ] as [string, string, string][]
                      ).map(([val, label, range]) => {
                        const isActive = filterPrice === val || (!val && !filterPrice);
                        const isAiActive = !filterPrice && val !== "" && aiPriceBucket === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setPriceFilter(val)}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                              isActive
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] font-medium text-white"
                                : isAiActive
                                  ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 text-[var(--color-primary)]/75"
                                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]"
                            }`}
                          >
                            <span>{label}</span>
                            {range && (
                              <span className={`text-xs ${isActive ? "text-white/70" : "text-[var(--color-text-tertiary)]"}`}>
                                {range}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Vibe / atmosphere tags */}
                {browseMode === "business" && (
                  <div>
                    <h3 className="text-eyebrow mb-2">Vibe</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {VIBE_TAGS.map(({ slug, label }) => {
                        const isExplicit = filterVibeTags.includes(slug);
                        const isAiDetected = aiVibeTags.includes(slug);
                        return (
                          <button
                            key={slug}
                            type="button"
                            onClick={() => toggleVibeTag(slug)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              isExplicit
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                                : isAiDetected
                                  ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 text-[var(--color-primary)]/75"
                                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
