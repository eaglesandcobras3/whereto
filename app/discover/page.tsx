import type { Metadata } from "next";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { DiscoverPageLoading } from "@/components/discovery/DiscoverPageLoading";
import { loadDiscoverFilterOptions } from "@/lib/discovery-filters/load-discover-options";
import {
  getAllFeatureFlags,
  isDiscoverMapsFeatureEnabled,
} from "@/lib/feature-flags";
import { DiscoverPageClient } from "./discover-page-client";

export const metadata: Metadata = {
  title: "Discover 30A | Browse businesses & services",
  description:
    "Filter storefront businesses and regional services on 30A by town, category, and tags.",
  robots: { index: false, follow: false },
};

/** Discover access is gated in middleware; filter options change infrequently. */
export const revalidate = 21600;

const getCachedDiscoverOptions = unstable_cache(
  loadDiscoverFilterOptions,
  ["discover-filter-options"],
  { revalidate: 21600 },
);

export default async function DiscoverPage() {
  const [options, flags] = await Promise.all([
    getCachedDiscoverOptions(),
    getAllFeatureFlags(),
  ]);
  const mapsLayout = isDiscoverMapsFeatureEnabled(flags);

  return (
    <Suspense
      fallback={
        <DiscoverPageLoading
          message="Loading discover…"
          variant={mapsLayout ? "map" : "page"}
        />
      }
    >
      <DiscoverPageClient
        towns={options.towns}
        categories={options.categories}
        serviceCategories={options.serviceCategories}
      />
    </Suspense>
  );
}
