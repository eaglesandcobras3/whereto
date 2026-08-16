"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { DiscoverListingCard } from "@/components/discovery/DiscoverListingCard";
import {
  DiscoverFilterInterpretation,
  formatDiscoverInterpretation,
} from "@/components/discovery/DiscoverFilterInterpretation";
import { DiscoverPageLoading } from "@/components/discovery/DiscoverPageLoading";
import { FacetTypeaheadMultiSelect } from "@/components/discovery/FacetTypeaheadMultiSelect";
import type { DiscoverMapViewport } from "@/components/discovery/DiscoverStorefrontMap";
import { buildDiscoverUrl, buildDiscoverUrlFromLinkParams } from "@/lib/discovery-filters/build-discover-url";
import type { DiscoverUrlLinkParams } from "@/lib/discovery-filters/build-discover-url";
import {
  parseDiscoverBbox,
  parseDiscoverZoom,
  serializeDiscoverBbox,
  bboxAroundMapPoints,
  townJumpZoom,
} from "@/lib/discovery-filters/discover-bbox";
import {
  fetchDiscoverFilter,
  type DiscoverFilterApiParams,
  type DiscoverFilterApiResponse,
} from "@/lib/discovery-filters/discover-filter-api";
import { DISCOVER_MAP_PAGE_SIZE } from "@/lib/discovery-filters/filter-state";
import { parseEntityType } from "@/lib/discovery-filters/parse-filter-params";
import { hasExplicitDiscoverParams } from "@/lib/discovery-filters/parse-discover-query";
import { parseTownSlugsFromParam } from "@/lib/discovery-filters/parse-town-params";
import { formatSearchTagLabel } from "@/lib/discovery-filters/search-tag-label";
import { useDiscoverMapsFeatureEnabled } from "@/lib/feature-flags-client-utils";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { isDiscoverNlFeatureEnabled } from "@/lib/nav/discovery-links";
import type {
  DiscoverCategoryOption,
  DiscoverSearchTagOption,
  DiscoverServiceCategoryOption,
  DiscoverTownOption,
} from "@/lib/discovery-filters/load-discover-options";

const DiscoverStorefrontMap = dynamic(
  () =>
    import("@/components/discovery/DiscoverStorefrontMap").then(
      (m) => m.DiscoverStorefrontMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[28rem] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-sm text-[var(--color-text-tertiary)]">
        Loading map…
      </div>
    ),
  },
);

type Props = {
  towns: DiscoverTownOption[];
  categories: DiscoverCategoryOption[];
  serviceCategories: DiscoverServiceCategoryOption[];
};

type DiscoverParams = {
  type: "storefront" | "service";
  town?: string;
  town_scope?: "exact" | "near";
  category?: string;
  service_category?: string;
  facet?: string;
  q?: string;
  nl_q?: string;
  bbox?: string;
  zoom?: number;
  page: number;
};

function parseFacetSlugs(facetParam: string | undefined): string[] {
  if (!facetParam?.trim()) return [];
  return facetParam
    .split(",")
    .map((t) => t.trim().split(":").pop() ?? t)
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
}

function paramsFromSearchParams(sp: URLSearchParams): DiscoverParams {
  const townScope = sp.get("town_scope");
  return {
    type: parseEntityType(sp.get("type")),
    town: sp.get("town")?.trim() || undefined,
    town_scope:
      townScope === "near" ? "near" : townScope === "exact" ? "exact" : undefined,
    category: sp.get("category")?.trim() || undefined,
    service_category: sp.get("service_category")?.trim() || undefined,
    facet: sp.get("facet")?.trim() || sp.get("facet_any")?.trim() || undefined,
    q: sp.get("q")?.trim() || undefined,
    nl_q: sp.get("nl_q")?.trim() || undefined,
    bbox: sp.get("bbox")?.trim() || undefined,
    zoom: parseDiscoverZoom(sp.get("zoom")),
    page: Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1),
  };
}

function toApiParams(
  params: DiscoverParams,
  opts?: { mapMode?: boolean },
): DiscoverFilterApiParams {
  const serviceMode = params.type === "service";
  const mapMode = Boolean(opts?.mapMode) && !serviceMode;
  const useBbox = mapMode && Boolean(parseDiscoverBbox(params.bbox));
  return {
    type: serviceMode ? "services" : "storefront",
    town: serviceMode || useBbox ? undefined : params.town,
    town_scope: serviceMode || useBbox ? undefined : params.town_scope,
    category: params.category,
    service_category: params.service_category,
    facet: params.facet,
    q: params.q,
    bbox: useBbox ? params.bbox : undefined,
    zoom: mapMode && params.zoom ? String(params.zoom) : undefined,
    page: params.page > 1 ? String(params.page) : undefined,
    page_size: mapMode ? String(DISCOVER_MAP_PAGE_SIZE) : undefined,
  };
}

export function DiscoverPageClient({ towns, categories, serviceCategories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const featureFlags = useAppFeatureFlags();
  const discoverMapsEnabled = useDiscoverMapsFeatureEnabled();
  const nlHandledRef = useRef<string | null>(null);

  /** Filter UI + fetch inputs — URL is the only source of truth. */
  const params = useMemo(() => paramsFromSearchParams(searchParams), [searchParams]);
  const paramsKey = searchParams.toString();
  const mapMode = discoverMapsEnabled && params.type === "storefront";
  const mapBbox = useMemo(
    () => (mapMode ? parseDiscoverBbox(params.bbox) : null),
    [mapMode, params.bbox],
  );

  const [result, setResult] = useState<DiscoverFilterApiResponse | null>(null);
  const [searchTags, setSearchTags] = useState<DiscoverSearchTagOption[]>([]);
  const [pending, setPending] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadResults = useCallback(async (nextParams: DiscoverParams, signal?: AbortSignal) => {
    setPending(true);
    setFetchError(null);
    try {
      const data = await fetchDiscoverFilter(
        toApiParams(nextParams, {
          mapMode: discoverMapsEnabled && nextParams.type === "storefront",
        }),
        signal,
      );
      if (signal?.aborted) return;
      setResult(data);
      setSearchTags(data.search_tags);
    } catch (err) {
      if (signal?.aborted) return;
      setFetchError(err instanceof Error ? err.message : "Could not load results");
    } finally {
      if (!signal?.aborted) setPending(false);
    }
  }, [discoverMapsEnabled]);

  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    if (!q || hasExplicitDiscoverParams(Object.fromEntries(searchParams.entries()))) {
      return;
    }
    if (!isDiscoverNlFeatureEnabled(featureFlags)) {
      return;
    }
    if (nlHandledRef.current === q) return;
    nlHandledRef.current = q;

    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/discovery/parse-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const body = (await res.json()) as { parsed?: { expanded?: boolean } & Record<string, unknown> };
        if (!body.parsed?.expanded) return;
        router.replace(
          buildDiscoverUrlFromLinkParams({
            ...(body.parsed as DiscoverUrlLinkParams),
            nl_q: q,
          }),
        );
      } catch {
        /* NL expansion is best-effort */
      }
    })();

    return () => controller.abort();
  }, [featureFlags, router, searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    void loadResults(params, controller.signal);
    return () => controller.abort();
  }, [loadResults, params, paramsKey]);

  const selectedTownSlugs = useMemo(
    () => parseTownSlugsFromParam(params.town),
    [params.town],
  );

  const selectedTags = useMemo(() => parseFacetSlugs(params.facet), [params.facet]);

  // Services never carry town or map bbox in the URL — strip leftovers.
  useEffect(() => {
    if (params.type !== "service") return;
    if (!params.town && !params.town_scope && !params.bbox && params.zoom == null) return;
    router.replace(
      buildDiscoverUrl({
        type: "service",
        category: params.category,
        service_category: params.service_category,
        tags: selectedTags,
        q: params.q,
        nlQuery: params.nl_q,
        page: params.page,
      }),
      { scroll: false },
    );
  }, [
    params.bbox,
    params.category,
    params.nl_q,
    params.page,
    params.q,
    params.service_category,
    params.town,
    params.town_scope,
    params.type,
    params.zoom,
    router,
    selectedTags,
  ]);

  const tagLabelBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const tag of searchTags) {
      map.set(tag.slug, tag.label);
    }
    return map;
  }, [searchTags]);

  const labelForSlug = useCallback(
    (slug: string) => tagLabelBySlug.get(slug) ?? formatSearchTagLabel(slug),
    [tagLabelBySlug],
  );

  const townOptions = useMemo(
    () => towns.map((town) => ({ slug: town.slug, label: town.name })),
    [towns],
  );

  /** Server-expanded town set for result copy only — not for filter controls. */
  const effectiveTownSlugs = result?.effective_town_slugs ?? selectedTownSlugs;

  const anchorTownSlugs = useMemo(() => {
    if (result?.anchor_town_slugs?.length) {
      return result.anchor_town_slugs;
    }
    if (params.town_scope === "near" && selectedTownSlugs.length) {
      return selectedTownSlugs;
    }
    return [];
  }, [result, params.town_scope, selectedTownSlugs]);

  const townNameForSlug = useCallback(
    (slug: string) => towns.find((town) => town.slug === slug)?.name ?? slug,
    [towns],
  );

  const navigate = useCallback(
    (
      next: Partial<DiscoverParams> & {
        townSlugs?: string[];
        tags?: string[];
        page?: number;
        clearMap?: boolean;
        /** Keep town slugs in the URL as jump labels while bbox does the geo work. */
        keepTownLabels?: boolean;
      },
    ) => {
      const type = next.type ?? params.type;
      const serviceMode = type === "service";
      const townSlugs = serviceMode
        ? []
        : (next.townSlugs ?? selectedTownSlugs);
      const tags = next.tags ?? selectedTags;
      const nextCategory = "category" in next ? next.category : params.category;
      const nextServiceCategory =
        "service_category" in next ? next.service_category : params.service_category;
      const clearMap = Boolean(next.clearMap) || serviceMode;
      const nextBbox = clearMap
        ? undefined
        : "bbox" in next
          ? next.bbox
          : params.bbox;
      const nextZoom = clearMap
        ? undefined
        : "zoom" in next
          ? next.zoom
          : params.zoom;
      const urlTownSlugs =
        nextBbox && !next.keepTownLabels ? [] : townSlugs;

      router.replace(
        buildDiscoverUrl({
          type,
          townSlugs: urlTownSlugs,
          townScope:
            serviceMode ||
            nextBbox ||
            ("townSlugs" in next && next.townSlugs !== undefined)
              ? undefined
              : params.town_scope,
          category: nextCategory || undefined,
          service_category: nextServiceCategory || undefined,
          tags,
          q: "q" in next ? next.q : params.q,
          nlQuery: "nl_q" in next ? next.nl_q : params.nl_q,
          bbox: nextBbox,
          zoom: nextZoom,
          page: next.page ?? 1,
        }),
        { scroll: false },
      );
    },
    [params, router, selectedTags, selectedTownSlugs],
  );

  const setTownSlugs = (slugs: string[]) => {
    if (mapMode) {
      if (!slugs.length) {
        navigate({ townSlugs: [], clearMap: true, page: 1 });
        return;
      }
      const points = slugs
        .map((slug) => towns.find((t) => t.slug === slug))
        .filter((t): t is (typeof towns)[number] => Boolean(t))
        .filter(
          (t) =>
            t.map_lat != null &&
            t.map_lng != null &&
            Number.isFinite(t.map_lat) &&
            Number.isFinite(t.map_lng),
        )
        .map((t) => ({ lat: t.map_lat as number, lng: t.map_lng as number }));

      const bbox = bboxAroundMapPoints(points);
      if (bbox) {
        navigate({
          townSlugs: slugs,
          bbox: serializeDiscoverBbox(bbox),
          zoom: townJumpZoom(points.length),
          keepTownLabels: true,
          page: 1,
        });
        return;
      }
      // Towns without pins: fall back to classic town filter (no bbox).
      navigate({ townSlugs: slugs, clearMap: true, page: 1 });
      return;
    }
    navigate({ townSlugs: slugs, clearMap: true, page: 1 });
  };

  const setSelectedTags = (slugs: string[]) => {
    navigate({ tags: slugs, page: 1 });
  };

  const searchMapArea = useCallback(
    (viewport: DiscoverMapViewport) => {
      navigate({
        type: "storefront",
        townSlugs: [],
        bbox: serializeDiscoverBbox(viewport.bbox),
        zoom: viewport.zoom,
        page: 1,
      });
    },
    [navigate],
  );

  const queryError =
    result && typeof result.applied_filters.error === "string"
      ? result.applied_filters.error
      : null;

  const hasTagFilters = selectedTags.length > 0;
  const hasCategoryPreference = Boolean(
    params.type === "storefront" ? params.category : params.service_category,
  );
  const softScopeMode = hasTagFilters;
  const showMatchReason = hasTagFilters || anchorTownSlugs.length > 0;
  /** Only after NL expansion — not for plain filter browse. */
  const nlQuery = params.nl_q;
  const filterInterpretation = useMemo(() => {
    if (!nlQuery) return "";
    return formatDiscoverInterpretation({
      nlQuery,
      type: params.type,
      tags: selectedTags,
      categoryLabel:
        params.type === "storefront"
          ? categories.find((c) => c.slug === params.category)?.title
          : undefined,
      serviceCategoryLabel:
        params.type === "service"
          ? serviceCategories.find((c) => c.slug === params.service_category)?.title
          : undefined,
      anchorTownNames: anchorTownSlugs.map(townNameForSlug),
      effectiveTownNames: effectiveTownSlugs.map(townNameForSlug),
      townScope: params.town_scope,
      labelForSlug,
    });
  }, [
    anchorTownSlugs,
    categories,
    effectiveTownSlugs,
    labelForSlug,
    nlQuery,
    params.category,
    params.service_category,
    params.town_scope,
    params.type,
    selectedTags,
    serviceCategories,
    townNameForSlug,
  ]);
  const typeLabel =
    params.type === "storefront" ? ", storefront businesses" : ", regional services";

  const total = result?.total ?? 0;
  const listings = result?.listings ?? [];
  const totalPages = result?.total_pages ?? 0;
  const showResultsLoading = pending && !result;

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="coastal-hero border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-10">
          <p className="text-eyebrow">Discover · 30A</p>
          <h1 className="font-headline text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
            Browse by filters
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">
            For storefronts, town always narrows the list. Services are corridor-wide and are not
            filtered by town. With keywords selected, type and category prefer matching places but
            won&apos;t hide others. Without keywords, type and category filter strictly.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-10">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full shrink-0 space-y-5 lg:w-64">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    navigate({ type: "storefront", service_category: "", clearMap: false, page: 1 })
                  }
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    params.type === "storefront"
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  Storefront
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    navigate({ type: "service", category: "", clearMap: true, page: 1 })
                  }
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    params.type === "service"
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  Services
                </button>
              </div>
              <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                {softScopeMode
                  ? "Prefers this type; the other may appear when keywords match."
                  : "Only listings of this type are shown."}
              </p>
            </div>

            {params.type === "storefront" && mapBbox ? (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  Map area
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Results follow the map bounds
                  {selectedTownSlugs.length
                    ? ` (jumped from ${selectedTownSlugs
                        .map((slug) => towns.find((t) => t.slug === slug)?.name ?? slug)
                        .join(", ")})`
                    : ""}
                  .
                </p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => navigate({ townSlugs: [], clearMap: true, page: 1 })}
                  className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  Clear map area
                </button>
              </div>
            ) : null}

            {params.type === "storefront" ? (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <label
                  htmlFor="discover-towns"
                  className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]"
                >
                  {mapMode ? "Jump to town" : "Towns"}
                </label>
                {pending ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-normal normal-case tracking-normal text-[var(--color-text-tertiary)]">
                    <span
                      className="inline-block size-3 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]"
                      aria-hidden
                    />
                    Updating…
                  </span>
                ) : null}
              </div>
              <FacetTypeaheadMultiSelect
                id="discover-towns"
                options={townOptions}
                selectedSlugs={selectedTownSlugs}
                onChange={setTownSlugs}
                disabled={pending}
                loading={pending}
                placeholder="Type a town name…"
                emptyMessage="No towns match"
              />
              <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                {mapMode
                  ? "Picks a map area around the town center. Pan or Search this area afterward."
                  : "Active search towns appear as chips. Remove any to narrow results."}
              </p>
            </div>
            ) : null}

            {params.type === "storefront" ? (
              <div>
                <label htmlFor="discover-category" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  Category
                </label>
                <select
                  id="discover-category"
                  disabled={pending}
                  value={params.category ?? ""}
                  onChange={(e) =>
                    navigate({
                      category: e.target.value,
                      page: 1,
                    })
                  }
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-base"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                  {softScopeMode
                    ? "Prefers this category; others may appear when keywords match."
                    : "Only listings in this category are shown."}
                </p>
              </div>
            ) : (
              <div>
                <label htmlFor="discover-service-category" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  Specialty
                </label>
                <select
                  id="discover-service-category"
                  disabled={pending}
                  value={params.service_category ?? ""}
                  onChange={(e) =>
                    navigate({
                      service_category: e.target.value,
                      page: 1,
                    })
                  }
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-base"
                >
                  <option value="">All specialties</option>
                  {serviceCategories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                  {softScopeMode
                    ? "Prefers this specialty; others may appear when keywords match."
                    : "Only listings in this specialty are shown."}
                </p>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center gap-2">
                <label
                  htmlFor="discover-facets"
                  className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]"
                >
                  Keywords
                </label>
                {pending ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-normal normal-case tracking-normal text-[var(--color-text-tertiary)]">
                    <span
                      className="inline-block size-3 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]"
                      aria-hidden
                    />
                    Updating…
                  </span>
                ) : null}
              </div>
              <FacetTypeaheadMultiSelect
                id="discover-facets"
                options={searchTags}
                selectedSlugs={selectedTags}
                onChange={setSelectedTags}
                disabled={pending}
                loading={pending}
                placeholder={searchTags.length ? "Type a keyword…" : "No keywords in this scope"}
                emptyMessage="No keywords match"
              />
              <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                {softScopeMode
                  ? "Must match at least one keyword. More matches rank higher."
                  : "Add keywords to search across categories and types."}
              </p>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            {mapMode ? (
              <div className="mb-6">
                <DiscoverStorefrontMap
                  listings={listings}
                  initialBbox={mapBbox}
                  initialZoom={params.zoom}
                  onSearchArea={searchMapArea}
                />
                <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
                  Pan or zoom, then search this area. Map bounds update the URL and results.
                </p>
              </div>
            ) : null}

            {nlQuery ? (
              <div className="mb-4">
                <DiscoverFilterInterpretation
                  nlQuery={nlQuery}
                  interpretation={filterInterpretation}
                  loading={pending}
                />
              </div>
            ) : null}

            <div className="mb-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                {pending ? (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block size-3.5 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]"
                      aria-hidden
                    />
                    Updating results…
                  </span>
                ) : (
                  <span>
                    {total} result{total === 1 ? "" : "s"}
                  </span>
                )}
                {params.type === "storefront"
                  ? selectedTownSlugs.map((slug) => (
                      <span
                        key={slug}
                        className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs"
                      >
                        {towns.find((t) => t.slug === slug)?.name ?? slug}
                      </span>
                    ))
                  : null}
                {selectedTags.map((slug) => (
                  <span
                    key={slug}
                    className="rounded-full bg-[var(--color-primary)]/15 px-2 py-0.5 text-xs text-[var(--color-primary)]"
                  >
                    {labelForSlug(slug)}
                  </span>
                ))}
              </div>

              {hasTagFilters ? (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {params.type === "storefront"
                    ? "Matching at least one keyword in your towns. Preferred type and category rank first."
                    : "Matching at least one keyword across the corridor. Preferred specialty ranks first."}
                </p>
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {params.type === "storefront"
                    ? `Filtered by town${typeLabel}, and category when selected. Add keywords to search more broadly.`
                    : "Regional services across the corridor. Choose a specialty or add keywords to narrow results."}
                </p>
              )}
            </div>

            {fetchError ? (
              <p className="text-sm text-red-600">{fetchError}</p>
            ) : null}

            {showResultsLoading ? (
              <DiscoverPageLoading message="Loading results…" variant="results" />
            ) : pending ? (
              <DiscoverPageLoading message="Updating results…" variant="results" />
            ) : listings.length === 0 ? (
              <div className="space-y-2 text-[var(--color-text-secondary)]">
                <p>
                  No listings match these filters. Try fewer keywords
                  {params.type === "storefront" ? ", or broaden town or category" : " or specialty"}.
                </p>
                {queryError ? (
                  <p className="text-sm text-red-600">Search error: {queryError}</p>
                ) : null}
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {listings.map((listing) => (
                  <li key={listing.id} className="h-full">
                    <DiscoverListingCard
                      listing={listing}
                      labelForSlug={labelForSlug}
                      showTagMatch={hasTagFilters}
                      showMatchReason={showMatchReason}
                      anchorTownSlugs={anchorTownSlugs}
                      preferredEntityType={params.type}
                      hasCategoryPreference={hasCategoryPreference}
                    />
                  </li>
                ))}
              </ul>
            )}

            {totalPages > 1 ? (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={pending || params.page <= 1}
                  onClick={() => navigate({ page: params.page - 1 })}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  Page {params.page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={pending || params.page >= totalPages}
                  onClick={() => navigate({ page: params.page + 1 })}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
