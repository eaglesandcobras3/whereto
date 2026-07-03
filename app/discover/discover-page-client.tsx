"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RemoteCoverImage } from "@/components/discovery/RemoteCoverImage";
import {
  getFacetAllowlistForCategory,
  getFacetAllowlistForServiceCategory,
  type FacetDefinition,
} from "@/lib/discovery-filters/facet-allowlists";
import type { DiscoverFilterSearchResult, DiscoverListingRow } from "@/lib/discovery-filters/types";
import type { DiscoverCategoryOption, DiscoverServiceCategoryOption, DiscoverTownOption } from "@/lib/discovery-filters/load-discover-options";

type Props = {
  initialResult: DiscoverFilterSearchResult;
  towns: DiscoverTownOption[];
  categories: DiscoverCategoryOption[];
  serviceCategories: DiscoverServiceCategoryOption[];
  initialParams: {
    type: "storefront" | "service";
    town?: string;
    town_id?: string;
    category?: string;
    service_category?: string;
    facet?: string;
    q?: string;
    page: number;
  };
};

function buildDiscoverUrl(params: {
  type: "storefront" | "service";
  town?: string;
  category?: string;
  service_category?: string;
  facets: string[];
  q?: string;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  sp.set("type", params.type === "service" ? "services" : "storefront");
  if (params.town) sp.set("town", params.town);
  if (params.type === "storefront" && params.category) sp.set("category", params.category);
  if (params.type === "service" && params.service_category) {
    sp.set("service_category", params.service_category);
  }
  if (params.facets.length) sp.set("facet", params.facets.join(","));
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
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function DiscoverPageClient({
  initialResult,
  towns,
  categories,
  serviceCategories,
  initialParams,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const activeFacets = useMemo(
    () => parseFacetSlugs(initialParams.facet),
    [initialParams.facet],
  );

  const facetOptions: FacetDefinition[] = useMemo(() => {
    if (initialParams.type === "service") {
      return getFacetAllowlistForServiceCategory(initialParams.service_category);
    }
    return getFacetAllowlistForCategory(initialParams.category);
  }, [initialParams.type, initialParams.category, initialParams.service_category]);

  const navigate = useCallback(
    (next: Partial<Props["initialParams"]> & { facets?: string[]; page?: number }) => {
      const type = next.type ?? initialParams.type;
      const url = buildDiscoverUrl({
        type,
        town: next.town !== undefined ? next.town : initialParams.town,
        category: next.category !== undefined ? next.category : initialParams.category,
        service_category:
          next.service_category !== undefined
            ? next.service_category
            : initialParams.service_category,
        facets: next.facets ?? activeFacets,
        q: next.q !== undefined ? next.q : initialParams.q,
        page: next.page ?? 1,
      });
      startTransition(() => router.push(url));
    },
    [router, initialParams, activeFacets],
  );

  const toggleFacet = (slug: string) => {
    const next = activeFacets.includes(slug)
      ? activeFacets.filter((s) => s !== slug)
      : [...activeFacets, slug];
    navigate({ facets: next, page: 1 });
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="coastal-hero border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-10">
          <p className="text-eyebrow">Discover · 30A</p>
          <h1 className="font-headline text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
            Browse by filters
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">
            Pick a town and category, then refine with tags. No AI — just structured filters.
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
                  onClick={() => navigate({ type: "storefront", service_category: undefined, page: 1 })}
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
                  onClick={() => navigate({ type: "service", category: undefined, page: 1 })}
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
              <label htmlFor="discover-town" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                Town
              </label>
              <select
                id="discover-town"
                disabled={pending}
                value={initialParams.town ?? ""}
                onChange={(e) => navigate({ town: e.target.value || undefined, page: 1 })}
                className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              >
                <option value="">All towns</option>
                {towns.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
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
                    navigate({ category: e.target.value || undefined, facets: [], page: 1 })
                  }
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
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
                      service_category: e.target.value || undefined,
                      facets: [],
                      page: 1,
                    })
                  }
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                >
                  <option value="">All specialties</option>
                  {serviceCategories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {facetOptions.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  Refine
                </p>
                <div className="flex flex-wrap gap-2">
                  {facetOptions.map((f) => {
                    const active = activeFacets.includes(f.slug);
                    return (
                      <button
                        key={`${f.family}:${f.slug}`}
                        type="button"
                        disabled={pending}
                        onClick={() => toggleFacet(f.slug)}
                        className={`discovery-chip ${active ? "discovery-chip-active" : ""}`}
                      >
                        #{f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </aside>

          <main className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <span>
                {pending ? "Updating…" : `${initialResult.total} result${initialResult.total === 1 ? "" : "s"}`}
              </span>
              {initialParams.town ? (
                <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs">
                  {towns.find((t) => t.slug === initialParams.town)?.name ?? initialParams.town}
                </span>
              ) : null}
              {activeFacets.map((slug) => (
                <span
                  key={slug}
                  className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs text-[var(--color-primary)]"
                >
                  #{slug.replace(/_/g, " ")}
                </span>
              ))}
            </div>

            {initialResult.listings.length === 0 ? (
              <p className="text-[var(--color-text-secondary)]">
                No listings match these filters. Try removing a tag or broadening town or category.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {initialResult.listings.map((listing) => (
                  <DiscoverListingCard key={listing.id} listing={listing} />
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

function DiscoverListingCard({ listing }: { listing: DiscoverListingRow }) {
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
          {listing.excerpt ? (
            <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
              {listing.excerpt}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
