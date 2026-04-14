export type BusinessPayload = {
  id: string;
  name: string;
  slug?: string;
  address?: string | null;
  town_id?: number | null;
  town_name?: string | null;
  category_id?: number | null;
  category_name?: string;
  lat?: number;
  lng?: number;
  phone?: string | null;
  website?: string | null;
  price_level?: number | null;
  listing_rating?: number | null;
  listing_review_count?: number | null;
  tags?: string[];
  ai_summary?: string | null;
  image_url?: string | null;
  hero_image_url?: string | null;
};

export type SearchResultPayload = {
  query: string;
  query_hash: string;
  normalized_query: string;
  summary: string;
  recommendations: Array<{
    business_id: string;
    rank: number;
    headline: string;
    explanation: string;
    highlighted_tags: string[];
    business: BusinessPayload;
  }>;
  suggestions?: string[];
  cached: boolean;
  cache_id?: string;
};
