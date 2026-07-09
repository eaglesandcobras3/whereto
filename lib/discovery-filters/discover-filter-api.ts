import type { DiscoverFilterSearchResult } from "@/lib/discovery-filters/types";
import type { DiscoverSearchTagOption } from "@/lib/discovery-filters/load-discover-options";

export type DiscoverFilterApiResponse = DiscoverFilterSearchResult & {
  search_tags: DiscoverSearchTagOption[];
  /** Town slugs actually included in the search (after near/all expansion). */
  effective_town_slugs: string[];
};

export type DiscoverFilterApiParams = {
  type?: string;
  town?: string;
  town_id?: string;
  town_scope?: string;
  category?: string;
  service_category?: string;
  facet?: string;
  facet_any?: string;
  q?: string;
  page?: string;
};

/** Build `/api/discovery/filter` query string from URL-style discover params. */
export function buildDiscoverFilterApiUrl(params: DiscoverFilterApiParams): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value?.trim()) sp.set(key, value.trim());
  }
  const qs = sp.toString();
  return qs ? `/api/discovery/filter?${qs}` : "/api/discovery/filter";
}

export async function fetchDiscoverFilter(
  params: DiscoverFilterApiParams,
  signal?: AbortSignal,
): Promise<DiscoverFilterApiResponse> {
  const res = await fetch(buildDiscoverFilterApiUrl(params), { signal });
  if (!res.ok) {
    throw new Error(`Discover filter request failed (${res.status})`);
  }
  return (await res.json()) as DiscoverFilterApiResponse;
}
