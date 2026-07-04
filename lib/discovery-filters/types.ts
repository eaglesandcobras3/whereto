import type { DiscoverListingScopeMatch } from "@/lib/discovery-filters/score-listing";

export type DiscoverTagMatch = {
  matched: string[];
  missing: string[];
};

export type DiscoverListingRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  hero_image_url: string | null;
  town_name: string | null;
  town_slug: string | null;
  category_slug: string | null;
  service_category_slug: string | null;
  business_type: string | null;
  search_tags: string[];
  tag_match?: DiscoverTagMatch;
  scope_match?: DiscoverListingScopeMatch;
};

export type DiscoverFilterSearchResult = {
  listings: DiscoverListingRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  applied_filters: Record<string, unknown>;
};
