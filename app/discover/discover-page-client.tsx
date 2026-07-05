"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DiscoverListingCard } from "@/components/discovery/DiscoverListingCard";
import { FacetTypeaheadMultiSelect } from "@/components/discovery/FacetTypeaheadMultiSelect";
import { buildDiscoverUrl } from "@/lib/discovery-filters/build-discover-url";
import { appliedTagsFromFilters } from "@/lib/discovery-filters/merge-scoped-search-tags";
import { parseTownSlugsFromParam } from "@/lib/discovery-filters/parse-town-params";
import { formatSearchTagLabel } from "@/lib/discovery-filters/search-tag-label";
import type { DiscoverFilterSearchResult } from "@/lib/discovery-filters/types";
import type {
  DiscoverCategoryOption,
  DiscoverSearchTagOption,
  DiscoverServiceCategoryOption,
  DiscoverTownOption,
} from "@/lib/discovery-filters/load-discover-options";

type Props = {
  initialResult: DiscoverFilterSearchResult;
  towns: DiscoverTownOption[];
  categories: DiscoverCategoryOption[];
  serviceCategories: DiscoverServiceCategoryOption[];
  searchTags: DiscoverSearchTagOption[];
  initialParams: {
    type: "storefront" | "service";
    town?: string;
    town_ids?: string[];
    category?: string;
    service_category?: string;
    facet?: string;
    q?: string;
    page: number;
  };
};

function parseFacetSlugs(facetParam: string | undefined): string[] {
  if (!facetParam?.trim()) return [];
  return facetParam
    .split(",")
    .map((t) => t.trim().split(":").pop() ?? t)
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
}

export function DiscoverPageClient({
  initialResult,
  towns,
  categories,
  serviceCategories,
  searchTags,
  initialParams,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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
    () => parseTownSlugsFromParam(initialParams.town),
    [initialParams.town],
  );

  const selectedTags = useMemo(() => {
    const fromApplied = appliedTagsFromFilters(initialResult.applied_filters);
    if (fromApplied.length) return fromApplied;
    return parseFacetSlugs(initialParams.facet);
  }, [initialResult.applied_filters, initialParams.facet]);

  const navigate = useCallback(
    (
      next: Partial<Props["initialParams"]> & {
        townSlugs?: string[];
        tags?: string[];
        page?: number;
      },
    ) => {
      const type = next.type ?? initialParams.type;
      const url = buildDiscoverUrl({
        type,
        townSlugs: next.townSlugs ?? activeTownSlugs,
        category: "category" in next ? next.category : initialParams.category,
        service_category:
          "service_category" in next ? next.service_category : initialParams.service_category,
        tags: next.tags ?? selectedTags,
        q: "q" in next ? next.q : initialParams.q,
        page: next.page ?? 1,
      });
      startTransition(() => router.push(url));
    },
    [router, initialParams, activeTownSlugs, selectedTags],
  );

  const setTownSlugs = (slugs: string[]) => {
    navigate({ townSlugs: slugs, page: 1 });
  };

  const setSelectedTags = (slugs: string[]) => {
    navigate({ tags: slugs, page: 1 });
  };

  const queryError =
    typeof initialResult.applied_filters.error === "string"
      ? initialResult.applied_filters.error
      : null;

  const categoryLabel =
    initialParams.type === "storefront"
      ? categories.find((c) => c.slug === initialParams.category)?.title
      : serviceCategories.find((c) => c.slug === initialParams.service_category)?.title;

  const hasTagFilters = selectedTags.length > 0;
  const hasCategoryPreference = Boolean(
    initialParams.type === "storefront"
      ? initialParams.category
      : initialParams.service_category,
  );
  const softScopeMode = hasTagFilters;
  const typeLabel =
    initialParams.type === "storefront" ? ", storefront businesses" : ", regional services";

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
                    initialParams.type === "storefront"
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
                    initialParams.type === "service"
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
              <label
                htmlFor="discover-towns"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]"
              >
                Towns
              </label>
              <FacetTypeaheadMultiSelect
                id="discover-towns"
                options={townOptions}
                selectedSlugs={activeTownSlugs}
                onChange={setTownSlugs}
                disabled={pending}
                placeholder="Type a town name…"
                emptyMessage="No towns match"
              />
              <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                Leave empty for all towns. Add chips to compare areas.
              </p>
            </div>

            {initialParams.type === "storefront" ? (
              <div>
                <label htmlFor="discover-category" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  Category
                </label>
                <select
                  id="discover-category"
                  disabled={pending}
                  value={initialParams.category ?? ""}
                  onChange={(e) =>
                    navigate({
                      category: e.target.value,
                      page: 1,
                    })
                  }
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
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
                  value={initialParams.service_category ?? ""}
                  onChange={(e) =>
                    navigate({
                      service_category: e.target.value,
                      page: 1,
                    })
                  }
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
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
              <label
                htmlFor="discover-facets"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]"
              >
                Tags
              </label>
              <FacetTypeaheadMultiSelect
                id="discover-facets"
                options={searchTags}
                selectedSlugs={selectedTags}
                onChange={setSelectedTags}
                disabled={pending}
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
            <div className="mb-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <span>
                  {pending
                    ? "Updating…"
                    : `${initialResult.total} result${initialResult.total === 1 ? "" : "s"}`}
                </span>
                {activeTownSlugs.map((slug) => (
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
                  <dd>{initialParams.type}</dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--color-text-tertiary)]">Towns</dt>
                  <dd>
                    {activeTownSlugs.length
                      ? activeTownSlugs
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

            {initialResult.listings.length === 0 ? (
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
                {initialResult.listings.map((listing) => (
                  <li key={listing.id} className="h-full">
                    <DiscoverListingCard
                      listing={listing}
                      labelForSlug={labelForSlug}
                      showTagMatch={hasTagFilters}
                      preferredEntityType={initialParams.type}
                      hasCategoryPreference={hasCategoryPreference}
                    />
                  </li>
                ))}
              </ul>
            )}

            {initialResult.total_pages > 1 ? (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={pending || initialParams.page <= 1}
                  onClick={() => navigate({ page: initialParams.page - 1 })}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  Page {initialParams.page} of {initialResult.total_pages}
                </span>
                <button
                  type="button"
                  disabled={pending || initialParams.page >= initialResult.total_pages}
                  onClick={() => navigate({ page: initialParams.page + 1 })}
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
