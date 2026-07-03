export type DiscoverTagMatch = {
  matched_required: string[];
  missing_required: string[];
  matched_any: string[];
  missing_any: string[];
  strict_match: boolean;
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
};

export type DiscoverFilterSearchResult = {
  listings: DiscoverListingRow[];
  /** Populated when strict AND matches are empty but relaxed OR matches exist. */
  partial_listings: DiscoverListingRow[];
  total: number;
  partial_total: number;
  tag_match_mode: "none" | "strict" | "relaxed" | "supplement";
  page: number;
  page_size: number;
  total_pages: number;
  partial_total_pages: number;
  applied_filters: Record<string, unknown>;
};
