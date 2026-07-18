import type { PageKind } from "./types";

export type BusinessIrseInput = {
  kind: "business";
  slug: string;
  title: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  excerpt: string | null;
  content: string | null;
  overview: string | null;
  seo_title: string | null;
  seo_description: string | null;
  town_id: string | number | null;
  town_slug: string | null;
  town_title: string | null;
  area_id: string | number | null;
  area_slug: string | null;
  primary_category_id: string | number | null;
  category_slug: string | null;
  map_lat: number | null;
  map_lng: number | null;
  hero_image: string | null;
  main_image: string | null;
  hero_image_url: string | null;
  main_image_url: string | null;
  claim_status: string | null;
  status: string | null;
  is_hidden_from_search: boolean | null;
  date_updated: string | null;
  published_at: string | null;
  /** Internal discovery signals gathered by loader. */
  linked_from_town: boolean;
  linked_from_category: boolean;
  linked_from_guide: boolean;
  linked_from_area: boolean;
  similar_count: number;
  guide_count: number;
  /** Likely duplicate of another published listing. */
  likely_duplicate: boolean;
};

export type GuideIrseInput = {
  kind: "guide";
  slug: string;
  title: string | null;
  guide_type: string | null;
  content: string | null;
  summary: string | null;
  excerpt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_title: string | null;
  og_description: string | null;
  hero_image: string | null;
  main_image: string | null;
  hero_image_url: string | null;
  main_image_url: string | null;
  status: string | null;
  published_at: string | null;
  date_updated: string | null;
  town_link_count: number;
  area_link_count: number;
  business_link_count: number;
  search_tags_count: number;
};

export type TownIrseInput = {
  kind: "town";
  slug: string;
  title: string | null;
  excerpt: string | null;
  content: string | null;
  seo_title: string | null;
  seo_description: string | null;
  hero_image: string | null;
  main_image: string | null;
  hero_image_url: string | null;
  main_image_url: string | null;
  status: string | null;
  listing_count: number;
  guide_count: number;
  has_planning_profile: boolean;
  planning_faq_count: number;
  planning_nearby_count: number;
};

export type AreaIrseInput = {
  kind: "area";
  slug: string;
  title: string | null;
  place_kind: "area" | "poi";
  excerpt: string | null;
  content: string | null;
  seo_title: string | null;
  seo_description: string | null;
  town_id: string | number | null;
  hero_image: string | null;
  main_image: string | null;
  hero_image_url: string | null;
  main_image_url: string | null;
  status: string | null;
  listing_count: number;
  guide_count: number;
  has_planning_profile: boolean;
  planning_faq_count: number;
  planning_nearby_count: number;
};

export type CategoryIrseInput = {
  kind: "category";
  slug: string;
  title: string | null;
  excerpt: string | null;
  status: string | null;
  /** Public path segment e.g. restaurants */
  public_path: string;
  has_audit_metadata: boolean;
  listing_count: number;
  town_coverage_count: number;
  has_editorial_block: boolean;
};

export type IrseInput =
  | BusinessIrseInput
  | GuideIrseInput
  | TownIrseInput
  | AreaIrseInput
  | CategoryIrseInput;

export type IrseInputFor<K extends PageKind> = Extract<IrseInput, { kind: K }>;
