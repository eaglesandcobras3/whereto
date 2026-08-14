export const AUDIT_STATUSES = [
  "exists",
  "closed",
  "cannot_confirm",
  "skipped_verified",
  "error",
] as const;

export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export const TERMINAL_AUDIT_STATUSES: ReadonlySet<string> = new Set([
  "exists",
  "closed",
  "cannot_confirm",
  "skipped_verified",
]);

export type GeminiAuditProposal = {
  status: "exists" | "closed" | "cannot_confirm";
  confidence: "high" | "medium" | "low";
  title: string;
  town: string;
  area: string;
  category: string;
  location: string;
  phone: string;
  website: string;
  excerpt: string;
  overview: string;
  seo_title: string;
  seo_description: string;
  search_keywords: string;
  suggested_tags: string[];
  notes: string;
  sources: string[];
};

export type AllowedVocab = {
  towns: Set<string>;
  areas: Set<string>;
  categories: Set<string>;
};

export const AUDIT_EXTRA_HEADERS = [
  "audit_status",
  "audit_confidence",
  "audit_sources",
  "audit_notes",
  "audit_suggested_tags",
] as const;

export const IMPORT_HEADERS = [
  "id",
  "title",
  "slug",
  "is_storefront",
  "is_service_business",
  "is_verified",
  "town",
  "area",
  "category",
  "search_tags",
  "excerpt",
  "overview",
  "seo_title",
  "seo_description",
  "search_keywords",
  "location",
  "phone",
  "website",
  "map_lat",
  "map_lng",
] as const;

export const OUTPUT_HEADERS = [...IMPORT_HEADERS, ...AUDIT_EXTRA_HEADERS] as const;
