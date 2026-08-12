/** Shared rental marketplace types (app-layer; DB may lag generated types). */

export const RENTAL_PARTNER_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "import_pending",
  "active",
  "paused",
  "rejected",
] as const;

export type RentalPartnerStatus = (typeof RENTAL_PARTNER_STATUSES)[number];

export const RENTAL_PROPERTY_STATUSES = [
  "draft",
  "pending_review",
  "published",
  "paused",
  "archived",
  "removed",
] as const;

export type RentalPropertyStatus = (typeof RENTAL_PROPERTY_STATUSES)[number];

export const RENTAL_PROPERTY_TYPES = [
  "house",
  "condo",
  "townhome",
  "cottage",
  "villa",
  "apartment",
  "other",
] as const;

export type RentalPropertyType = (typeof RENTAL_PROPERTY_TYPES)[number];

export const RENTAL_BEACH_ACCESS = ["none", "public", "private", "unknown"] as const;
export type RentalBeachAccess = (typeof RENTAL_BEACH_ACCESS)[number];

export const RENTAL_IMPORT_METHODS = ["manual", "ical", "api"] as const;
export type RentalImportMethod = (typeof RENTAL_IMPORT_METHODS)[number];

export const RENTAL_LOCATION_PRECISION = ["exact", "approximate", "hidden"] as const;
export type RentalLocationPrecision = (typeof RENTAL_LOCATION_PRECISION)[number];

export type RentalPartnerProfile = {
  id: string;
  business_id: string | null;
  display_name: string | null;
  show_public_business_profile: boolean;
  status: RentalPartnerStatus;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  pms_name: string | null;
  pms_other: string | null;
  booking_engine_base_url: string | null;
  booking_url_template: string | null;
  booking_url_hosts: string[];
  authority_attested_at: string | null;
  content_rights_attested_at: string | null;
  import_method: RentalImportMethod | null;
  application_payload: Record<string, unknown> | null;
  admin_notes: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_reason: string | null;
  ical_url: string | null;
  last_availability_sync_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RentalProperty = {
  id: string;
  business_id: string | null;
  partner_id: string;
  source_id: string | null;
  external_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  local_context: string | null;
  excerpt: string | null;
  property_type: RentalPropertyType;
  status: RentalPropertyStatus;
  town_id: string | null;
  area_id: string | null;
  community_name: string | null;
  bedrooms: number;
  bathrooms: number;
  sleeps: number;
  pets_allowed: boolean | null;
  private_pool: boolean | null;
  gulf_front: boolean | null;
  gulf_view: boolean | null;
  beach_access: RentalBeachAccess | null;
  golf_cart_included: boolean | null;
  walkability_notes: string | null;
  parking_notes: string | null;
  rules: string | null;
  starting_nightly_rate: number | null;
  currency: string;
  pricing_disclaimer: string | null;
  pricing_reliable: boolean;
  booking_url: string | null;
  map_lat: number | null;
  map_lng: number | null;
  location_precision: RentalLocationPrecision;
  content_rights_confirmed: boolean;
  duplicate_of_property_id: string | null;
  fingerprint: string | null;
  last_synced_at: string | null;
  last_sync_status: "ok" | "failed" | "stale" | "never" | null;
  last_sync_error: string | null;
  removed_from_source_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  search_tags: string[];
  search_terms: string | null;
  hero_image_url: string | null;
  sort: number | null;
  featured: boolean;
  is_hidden_from_search: boolean;
  published_at: string | null;
  date_created: string;
  date_updated: string;
};

export type RentalPropertyView = RentalProperty & {
  town_title: string | null;
  town_slug: string | null;
  area_title: string | null;
  area_slug: string | null;
  business_title: string | null;
  business_slug: string | null;
  business_is_verified: boolean | null;
  business_website: string | null;
  partner_status: RentalPartnerStatus | null;
  partner_display_name: string | null;
  partner_show_public_business_profile: boolean | null;
  partner_booking_url_template: string | null;
  partner_booking_engine_base_url: string | null;
  primary_image_url: string | null;
};

export type RentalImage = {
  id: string;
  property_id: string;
  storage_url: string;
  sort: number;
  alt: string | null;
  width: number | null;
  height: number | null;
  source_url: string | null;
  rights_confirmed: boolean;
  created_at: string;
};

export type TripContext = {
  townId?: string | null;
  townSlug?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
};
