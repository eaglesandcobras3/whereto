"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DiscoverListingCard } from "@/components/discovery/DiscoverListingCard";
import {
  DiscoverFilterInterpretation,
  formatDiscoverInterpretation,
} from "@/components/discovery/DiscoverFilterInterpretation";
import { DiscoverPageLoading } from "@/components/discovery/DiscoverPageLoading";
import { FacetTypeaheadMultiSelect } from "@/components/discovery/FacetTypeaheadMultiSelect";
import { buildDiscoverUrl, buildDiscoverUrlFromLinkParams } from "@/lib/discovery-filters/build-discover-url";
import type { DiscoverUrlLinkParams } from "@/lib/discovery-filters/build-discover-url";
import {
  fetchDiscoverFilter,
  type DiscoverFilterApiParams,
  type DiscoverFilterApiResponse,
} from "@/lib/discovery-filters/discover-filter-api";
import { appliedTagsFromFilters } from "@/lib/discovery-filters/merge-scoped-search-tags";
import { parseEntityType } from "@/lib/discovery-filters/parse-filter-params";
import { hasExplicitDiscoverParams } from "@/lib/discovery-filters/parse-discover-query";
import { parseTownSlugsFromParam } from "@/lib/discovery-filters/parse-town-params";
import { formatSearchTagLabel } from "@/lib/discovery-filters/search-tag-label";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { isDiscoverNlFeatureEnabled } from "@/lib/nav/discovery-links";
import type {
  DiscoverCategoryOption,
  DiscoverSearchTagOption,
  DiscoverServiceCategoryOption,
  DiscoverTownOption,
} from "@/lib/discovery-filters/load-discover-options";

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
    page: Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1),
  };
}

function toApiParams(params: DiscoverParams): DiscoverFilterApiParams {
  return {
    type: params.type === "service" ? "services" : "storefront",
    town: params.town,
    town_scope: params.town_scope,
    category: params.category,
    service_category: params.service_category,
    facet: params.facet,
    q: params.q,
    page: params.page > 1 ? String(params.page) : undefined,
  };
}
export function DiscoverPageClient({ towns, categories, serviceCategories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const featureFlags = useAppFeatureFlags();
  const navigatingRef = useRef(false);
  const nlHandledRef = useRef<string | null>(null);

  const urlParams = useMemo(
    () => paramsFromSearchParams(searchParams),
    [searchParams],
  );

  const [params, setParams] = useState<DiscoverParams>(urlParams);
  const [result, setResult] = useState<DiscoverFilterApiResponse | null>(null);
  const [searchTags, setSearchTags] = useState<DiscoverSearchTagOption[]>([]);
  const [pending, setPending] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadResults = useCallback(async (nextParams: DiscoverParams, signal?: AbortSignal) => {
    setPending(true);
    setFetchError(null);
    try {
      const data = await fetchDiscoverFilter(toApiParams(nextParams), signal);
      if (signal?.aborted) return;
      setResult(data);
      setSearchTags(data.search_tags);
      setParams(nextParams);
    } catch (err) {
      if (signal?.aborted) return;
      setFetchError(err instanceof Error ? err.message : "Could not load results");
    } finally {
      if (!signal?.aborted) setPending(false);
    }
  }, []);

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

  const paramsKey = searchParams.toString();

  useEffect(() => {
    if (navigatingRef.current) return;

    const controller = new AbortController();
    void loadResults(urlParams, controller.signal);

    return () => controller.abort();
  }, [loadResults, paramsKey, urlParams]);

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

  const activeTownSlugs = useMemo(
    () => parseTownSlugsFromParam(params.town),
    [params.town],
  );

  const displayTownSlugs = useMemo(() => {
    if (result?.effective_town_slugs) {
      return result.effective_town_slugs;
    }
    return activeTownSlugs;
  }, [result, activeTownSlugs]);

  const anchorTownSlugs = useMemo(() => {
    if (result?.anchor_town_slugs?.length) {
      return result.anchor_town_slugs;
    }
    if (params.town_scope === "near" && activeTownSlugs.length) {
      return activeTownSlugs;
    }
    return [];
  }, [result, params.town_scope, activeTownSlugs]);

  const townNameForSlug = useCallback(
    (slug: string) => towns.find((town) => town.slug === slug)?.name ?? slug,
    [towns],
  );

  const selectedTags = useMemo(() => {
    if (result) {
      const fromApplied = appliedTagsFromFilters(result.applied_filters);
      if (fromApplied.length) return fromApplied;
    }
    return parseFacetSlugs(params.facet);
  }, [result, params.facet]);

  const navigate = useCallback(
    (
      next: Partial<DiscoverParams> & {
        townSlugs?: string[];
        tags?: string[];
        page?: number;
      },
    ) => {
      const type = next.type ?? params.type;
      const townSlugs = next.townSlugs ?? activeTownSlugs;
      const tags = next.tags ?? selectedTags;
      const nextParams: DiscoverParams = {
        type,
        town: townSlugs.length ? townSlugs.join(",") : undefined,
        town_scope:
          "townSlugs" in next && next.townSlugs !== undefined
            ? undefined
            : params.town_scope,
        category: "category" in next ? next.category : params.category,
        service_category:
          "service_category" in next ? next.service_category : params.service_category,
        facet: tags.length ? tags.join(",") : undefined,
        q: "q" in next ? next.q : params.q,
        nl_q: "nl_q" in next ? next.nl_q : params.nl_q,
        page: next.page ?? 1,
      };

      const url = buildDiscoverUrl({
        type: nextParams.type,
        townSlugs,
        townScope: nextParams.town_scope,
        category: nextParams.category,
        service_category: nextParams.service_category,
        tags,
        q: nextParams.q,
        nlQuery: nextParams.nl_q,
        page: nextParams.page,
      });

      navigatingRef.current = true;
      router.replace(url, { scroll: false });

      void (async () => {
        try {
          await loadResults(nextParams);
        } finally {
          navigatingRef.current = false;
        }
      })();
    },
    [activeTownSlugs, loadResults, params, router, selectedTags],
  );

  const setTownSlugs = (slugs: string[]) => {
    navigate({ townSlugs: slugs, page: 1 });
  };

  const setSelectedTags = (slugs: string[]) => {
    navigate({ tags: slugs, page: 1 });
  };

  const queryError =
    result && typeof result.applied_filters.error === "string"
      ? result.applied_filters.error
      : null;

  const categoryLabel =
    params.type === "storefront"
      ? categories.find((c) => c.slug === params.category)?.title
      : serviceCategories.find((c) => c.slug === params.service_category)?.title;

  const hasTagFilters = selectedTags.length > 0;
  const hasCategoryPreference = Boolean(
    params.type === "storefront" ? params.category : params.service_category,
  );
  const softScopeMode = hasTagFilters;
  const showMatchReason = hasTagFilters || anchorTownSlugs.length > 0;
  const nlQuery = params.nl_q;
  const filterInterpretation = useMemo(
    () =>
      formatDiscoverInterpretation({
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
        effectiveTownNames: displayTownSlugs.map(townNameForSlug),
        townScope: params.town_scope,
        labelForSlug,
      }),
    [
      anchorTownSlugs,
      categories,
      displayTownSlugs,
      labelForSlug,
      nlQuery,
      params.category,
      params.service_category,
      params.town_scope,
      params.type,
      selectedTags,
      serviceCategories,
      townNameForSlug,
    ],
  );
  const hasActiveFilters = Boolean(
    selectedTags.length ||
      displayTownSlugs.length ||
      params.category ||
      params.service_category ||
      nlQuery,
  );
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
            Town always narrows the list. With tags selected, type and category prefer matching
            places but won&apos;t hide others. Without tags, type and category filter strictly.
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
                  onClick={() => navigate({ type: "storefront", service_category: "", page: 1 })}
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
                  onClick={() => navigate({ type: "service", category: "", page: 1 })}
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
                  ? "Prefers this type; the other may appear when tags match."
                  : "Only listings of this type are shown."}
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <label
                  htmlFor="discover-towns"
                  className="block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]"
                >
                  Towns
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
                selectedSlugs={displayTownSlugs}
                onChange={setTownSlugs}
                disabled={pending}
                loading={pending}
                placeholder="Type a town name…"
                emptyMessage="No towns match"
              />
              <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                Active search towns appear as chips. Remove any to narrow results.
              </p>
            </div>

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
                    ? "Prefers this category; others may appear when tags match."
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
                    ? "Prefers this specialty; others may appear when tags match."
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
                  Tags
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
                placeholder={searchTags.length ? "Type a tag…" : "No tags in this scope"}
                emptyMessage="No tags match"
              />
              <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                {softScopeMode
                  ? "Must match at least one tag. More matches rank higher."
                  : "Add tags to search across categories and types."}
              </p>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            {hasActiveFilters ? (
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
                {displayTownSlugs.map((slug) => (
                  <span
                    key={slug}
                    className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs"
                  >
                    {towns.find((t) => t.slug === slug)?.name ?? slug}
                  </span>
                ))}
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
                  Matching at least one tag in your towns. Preferred type and category rank first.
                </p>
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Filtered by town{typeLabel}, and category when selected. Add tags to search more
                  broadly.
                </p>
              )}

              <dl className="grid gap-1 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 px-3 py-2 text-xs text-[var(--color-text-secondary)] sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-[var(--color-text-tertiary)]">Entity</dt>
                  <dd>{params.type}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--color-text-tertiary)]">Towns</dt>
                  <dd>
                    {displayTownSlugs.length
                      ? displayTownSlugs
                          .map((slug) => towns.find((t) => t.slug === slug)?.name ?? slug)
                          .join(", ")
                      : "All towns"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--color-text-tertiary)]">Category</dt>
                  <dd>{categoryLabel ?? "All"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--color-text-tertiary)]">Tags</dt>
                  <dd>
                    {selectedTags.length
                      ? selectedTags.map((slug) => labelForSlug(slug)).join(", ")
                      : "None"}
                  </dd>
                </div>
              </dl>
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
                  No listings match these filters. Try fewer tags, or broaden town or category.
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
