"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RemoteCoverImage } from "@/components/discovery/RemoteCoverImage";
import { FacetTypeaheadMultiSelect } from "@/components/discovery/FacetTypeaheadMultiSelect";
import { formatTagMatchSummary } from "@/lib/discovery-filters/format-tag-match";
import { parseTownSlugsFromParam } from "@/lib/discovery-filters/parse-town-params";
import { formatSearchTagLabel } from "@/lib/discovery-filters/search-tag-label";
import type { DiscoverFilterSearchResult, DiscoverListingRow } from "@/lib/discovery-filters/types";
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
    facet_any?: string;
    q?: string;
    page: number;
  };
};

function buildDiscoverUrl(params: {
  type: "storefront" | "service";
  townSlugs: string[];
  category?: string;
  service_category?: string;
  facetsRequired: string[];
  facetsAny: string[];
  q?: string;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  sp.set("type", params.type === "service" ? "services" : "storefront");
  if (params.townSlugs.length) sp.set("town", params.townSlugs.join(","));
  if (params.type === "storefront" && params.category) sp.set("category", params.category);
  if (params.type === "service" && params.service_category) {
    sp.set("service_category", params.service_category);
  }
  if (params.facetsRequired.length) sp.set("facet", params.facetsRequired.join(","));
  if (params.facetsAny.length) sp.set("facet_any", params.facetsAny.join(","));
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/discover?${qs}` : "/discover";
}

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

  const requiredTags = useMemo(
    () => parseFacetSlugs(initialParams.facet),
    [initialParams.facet],
  );
  const optionalTags = useMemo(
    () => parseFacetSlugs(initialParams.facet_any),
    [initialParams.facet_any],
  );

  const navigate = useCallback(
    (
      next: Partial<Props["initialParams"]> & {
        townSlugs?: string[];
        facetsRequired?: string[];
        facetsAny?: string[];
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
        facetsRequired: next.facetsRequired ?? requiredTags,
        facetsAny: next.facetsAny ?? optionalTags,
        q: "q" in next ? next.q : initialParams.q,
        page: next.page ?? 1,
      });
      startTransition(() => router.push(url));
    },
    [router, initialParams, activeTownSlugs, requiredTags, optionalTags],
  );

  const setTownSlugs = (slugs: string[]) => {
    navigate({ townSlugs: slugs, facetsRequired: [], facetsAny: [], page: 1 });
  };

  const setRequiredTags = (slugs: string[]) => {
    const requiredSet = new Set(slugs);
    navigate({
      facetsRequired: slugs,
      facetsAny: optionalTags.filter((slug) => !requiredSet.has(slug)),
      page: 1,
    });
  };

  const setOptionalTags = (slugs: string[]) => {
    const requiredSet = new Set(requiredTags);
    navigate({
      facetsAny: slugs.filter((slug) => !requiredSet.has(slug)),
      page: 1,
    });
  };

  const queryError =
    typeof initialResult.applied_filters.error === "string"
      ? initialResult.applied_filters.error
      : null;

  const categoryLabel =
    initialParams.type === "storefront"
      ? categories.find((c) => c.slug === initialParams.category)?.title
      : serviceCategories.find((c) => c.slug === initialParams.service_category)?.title;

  const hasTagFilters = requiredTags.length > 0 || optionalTags.length > 0;
  const tagMode = initialResult.tag_match_mode;
  const showingRelaxed = tagMode === "relaxed" && initialResult.partial_listings.length > 0;
  const showingSupplement = tagMode === "supplement" && initialResult.partial_listings.length > 0;
  const showingPartials = showingRelaxed || showingSupplement;

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="coastal-hero border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-10">
          <p className="text-eyebrow">Discover · 30A</p>
          <h1 className="font-headline text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
            Browse by filters
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">
            Scope by town and category, then refine with tags. Must-have tags use AND; nice-to-have
            tags boost ranking and fill in when a strict match is not available.
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
            </div>

            <div>
              <label
                htmlFor="discover-towns"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]"
              >
                Towns
              </label>
              <FacetTypeaheadMultiSelect
                options={townOptions}
                selectedSlugs={activeTownSlugs}
                onChange={setTownSlugs}
                disabled={pending}
                placeholder="Search towns…"
              />
              <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                Leave empty for all towns. Select multiple to compare areas.
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
                      facetsRequired: [],
                      facetsAny: [],
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
                      facetsRequired: [],
                      facetsAny: [],
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
              </div>
            )}

            <div>
              <label
                htmlFor="discover-facets-required"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]"
              >
                Must have
              </label>
              <FacetTypeaheadMultiSelect
                options={searchTags}
                selectedSlugs={requiredTags}
                onChange={setRequiredTags}
                disabled={pending}
                placeholder={searchTags.length ? "Required tags…" : "No tags in this scope"}
              />
              <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                Listing must include every selected tag.
              </p>
            </div>

            <div>
              <label
                htmlFor="discover-facets-any"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]"
              >
                Nice to have
              </label>
              <FacetTypeaheadMultiSelect
                options={searchTags.filter((tag) => !requiredTags.includes(tag.slug))}
                selectedSlugs={optionalTags}
                onChange={setOptionalTags}
                disabled={pending}
                placeholder={searchTags.length ? "Optional tags…" : "No tags in this scope"}
              />
              <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                Boosts ranking; shown as close matches when must-haves return nothing.
              </p>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <div className="mb-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <span>
                  {pending
                    ? "Updating…"
                    : showingRelaxed
                      ? `${initialResult.partial_total} close match${initialResult.partial_total === 1 ? "" : "es"}`
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
                {requiredTags.map((slug) => (
                  <span
                    key={`req-${slug}`}
                    className="rounded-full bg-[var(--color-primary)]/15 px-2 py-0.5 text-xs text-[var(--color-primary)]"
                  >
                    Must: {labelForSlug(slug)}
                  </span>
                ))}
                {optionalTags.map((slug) => (
                  <span
                    key={`any-${slug}`}
                    className="rounded-full border border-dashed border-[var(--color-primary)]/40 px-2 py-0.5 text-xs text-[var(--color-primary)]"
                  >
                    Nice: {labelForSlug(slug)}
                  </span>
                ))}
              </div>

              {showingRelaxed ? (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  No listings matched every must-have tag. These places match at least one of your
                  tags, ranked by how many fit.
                </p>
              ) : showingSupplement ? (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Only {initialResult.total} listing{initialResult.total === 1 ? "" : "s"} matched
                  every must-have tag. These close matches may still help.
                </p>
              ) : null}

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
                  <dt className="font-medium text-[var(--color-text-tertiary)]">Tag mode</dt>
                  <dd>
                    {hasTagFilters
                      ? tagMode === "relaxed"
                        ? "Relaxed (OR fallback)"
                        : tagMode === "supplement"
                          ? "Strict + close matches"
                          : "Strict (must-haves)"
                      : "None"}
                  </dd>
                </div>
              </dl>
            </div>

            {initialResult.listings.length === 0 && !showingPartials ? (
              <div className="space-y-2 text-[var(--color-text-secondary)]">
                <p>
                  No listings match these filters. Try moving a tag to nice-to-have, or broadening
                  town or category.
                </p>
                {queryError ? (
                  <p className="text-sm text-red-600">Search error: {queryError}</p>
                ) : null}
              </div>
            ) : (
              <>
                {initialResult.listings.length > 0 ? (
                  <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {initialResult.listings.map((listing) => (
                      <DiscoverListingCard
                        key={listing.id}
                        listing={listing}
                        labelForSlug={labelForSlug}
                        showTagMatch={hasTagFilters}
                      />
                    ))}
                  </ul>
                ) : null}

                {showingPartials ? (
                  <section className={initialResult.listings.length > 0 ? "mt-8" : ""}>
                    <h2 className="mb-3 font-headline text-lg font-bold text-[var(--color-text-primary)]">
                      Close matches
                    </h2>
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {initialResult.partial_listings.map((listing) => (
                        <DiscoverListingCard
                          key={listing.id}
                          listing={listing}
                          labelForSlug={labelForSlug}
                          showTagMatch
                        />
                      ))}
                    </ul>
                  </section>
                ) : null}
              </>
            )}

            {(showingRelaxed ? initialResult.partial_total_pages : initialResult.total_pages) > 1 ? (
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
                  Page {initialParams.page} of{" "}
                  {showingRelaxed ? initialResult.partial_total_pages : initialResult.total_pages}
                </span>
                <button
                  type="button"
                  disabled={
                    pending ||
                    initialParams.page >=
                      (showingRelaxed
                        ? initialResult.partial_total_pages
                        : initialResult.total_pages)
                  }
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

function DiscoverListingCard({
  listing,
  labelForSlug,
  showTagMatch = false,
}: {
  listing: DiscoverListingRow;
  labelForSlug: (slug: string) => string;
  showTagMatch?: boolean;
}) {
  const tagMatchSummary =
    showTagMatch && listing.tag_match
      ? formatTagMatchSummary(listing.tag_match, labelForSlug)
      : null;

  const showSummary =
    tagMatchSummary &&
    (listing.tag_match?.missing_required.length ||
      listing.tag_match?.missing_any.length ||
      listing.tag_match?.matched_any.length);

  return (
    <li>
      <Link
        href={`/business/${listing.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-sm transition hover:border-[var(--color-primary)]/30"
      >
        <div className="relative aspect-[4/3] bg-[var(--color-surface-muted)]">
          <RemoteCoverImage
            src={listing.hero_image_url}
            alt={listing.title}
            placeholderIcon="storefront"
            iconSize="md"
          />
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h2 className="font-headline text-lg font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">
            {listing.title}
          </h2>
          {listing.town_name ? (
            <p className="text-xs text-[var(--color-text-tertiary)]">{listing.town_name}</p>
          ) : null}
          {showSummary ? (
            <p className="mt-2 text-xs font-medium text-amber-800">{tagMatchSummary}</p>
          ) : null}
          {listing.excerpt ? (
            <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
              {listing.excerpt}
            </p>
          ) : null}
          {listing.search_tags.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1">
              {listing.search_tags.map((slug) => (
                <li
                  key={slug}
                  className="rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-tertiary)]"
                >
                  {labelForSlug(slug)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 font-mono text-[10px] text-[var(--color-text-tertiary)]">No search_tags</p>
          )}
        </div>
      </Link>
    </li>
  );
}
