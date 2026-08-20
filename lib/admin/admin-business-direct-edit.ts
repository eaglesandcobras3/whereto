import { z } from "zod";
import { buildSearchDocumentFields } from "@/lib/search/derive-search-document";
import { slugifyBusinessTitle, uniqueSlug } from "@/lib/portal/slug";

function nullableText(max: number) {
  return z
    .string()
    .max(max)
    .optional()
    .transform((s) => {
      const t = (s ?? "").trim();
      return t === "" ? null : t;
    });
}

const optionalUrl = z
  .string()
  .max(500)
  .optional()
  .transform((s) => (s ?? "").trim())
  .refine(
    (s) => s === "" || /^https?:\/\/.+/i.test(s),
    "Use a full URL starting with http:// or https://",
  )
  .transform((s) => (s === "" ? null : s));

export const adminBusinessPatchSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  phone: nullableText(40),
  email: nullableText(320),
  website: optionalUrl,
  address: nullableText(500),
  excerpt: nullableText(500),
  overview: nullableText(4000),
  content: nullableText(8000),
  seo_title: nullableText(60),
  seo_description: nullableText(160),
  search_keywords: nullableText(500),
  service_area: nullableText(500),
  town_id: z.union([z.string().uuid(), z.null()]).optional(),
  area_id: z.union([z.string().uuid(), z.null()]).optional(),
  primary_category_id: z.union([z.string().uuid(), z.null()]).optional(),
  is_storefront: z.boolean().optional(),
  is_service_business: z.boolean().optional(),
  is_verified: z.boolean().optional(),
  is_explorable: z.boolean().optional(),
  map_lat: z.union([z.number().finite(), z.null()]).optional(),
  map_lng: z.union([z.number().finite(), z.null()]).optional(),
  search_tags: z.array(z.string().trim().min(1).max(64)).max(12).optional(),
  /** When true and title changed, regenerate slug uniqueness against other businesses. */
  regenerate_slug: z.boolean().optional(),
});

export type AdminBusinessPatchInput = z.infer<typeof adminBusinessPatchSchema>;

export type AdminBusinessRow = {
  id: string;
  title: string | null;
  slug: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  excerpt: string | null;
  overview: string | null;
  content: string | null;
  seo_title: string | null;
  seo_description: string | null;
  search_keywords: string | null;
  search_terms: string | null;
  embedding_summary: string | null;
  service_area: string | null;
  town_id: string | null;
  area_id: string | null;
  primary_category_id: string | null;
  is_storefront: boolean | null;
  is_service_business: boolean | null;
  is_verified: boolean | null;
  is_explorable: boolean | null;
  map_lat: number | null;
  map_lng: number | null;
  search_tags: string[] | null;
  main_image_url: string | null;
  hero_image_url: string | null;
  status: string | null;
};

export const ADMIN_BUSINESS_SELECT = `
  id, title, slug, phone, email, website, address, excerpt, overview, content,
  seo_title, seo_description, search_keywords, search_terms, embedding_summary,
  service_area, town_id, area_id, primary_category_id,
  is_storefront, is_service_business, is_verified, is_explorable,
  map_lat, map_lng, search_tags, main_image_url, hero_image_url, status
`;

function arraysEqual(a: string[] | null | undefined, b: string[] | null | undefined): boolean {
  const aa = [...(a ?? [])].map(String).sort();
  const bb = [...(b ?? [])].map(String).sort();
  return JSON.stringify(aa) === JSON.stringify(bb);
}

/**
 * Build a patch for `public.businesses` only (never businesses_view).
 * Returns null when there are no material changes.
 */
export function buildAdminBusinessPatch(
  existing: AdminBusinessRow,
  input: AdminBusinessPatchInput,
  opts?: { takenSlugs?: Set<string> },
): { patch: Record<string, unknown>; changes: string[] } | null {
  const patch: Record<string, unknown> = {};
  const changes: string[] = [];

  function setIfChanged(field: string, next: unknown, prev: unknown) {
    const same =
      Array.isArray(next) || Array.isArray(prev)
        ? arraysEqual(next as string[] | null, prev as string[] | null)
        : next === prev;
    if (!same) {
      patch[field] = next;
      changes.push(field);
    }
  }

  if (input.title !== undefined) setIfChanged("title", input.title, existing.title);
  if (input.phone !== undefined) setIfChanged("phone", input.phone, existing.phone);
  if (input.email !== undefined) setIfChanged("email", input.email, existing.email);
  if (input.website !== undefined) setIfChanged("website", input.website, existing.website);
  if (input.address !== undefined) setIfChanged("address", input.address, existing.address);
  if (input.excerpt !== undefined) setIfChanged("excerpt", input.excerpt, existing.excerpt);
  if (input.overview !== undefined) {
    setIfChanged("overview", input.overview, existing.overview);
    // Keep content in sync when overview is the primary long copy field.
    if (input.content === undefined) {
      setIfChanged("content", input.overview, existing.content);
    }
  }
  if (input.content !== undefined) setIfChanged("content", input.content, existing.content);
  if (input.seo_title !== undefined) setIfChanged("seo_title", input.seo_title, existing.seo_title);
  if (input.seo_description !== undefined) {
    setIfChanged("seo_description", input.seo_description, existing.seo_description);
  }
  if (input.search_keywords !== undefined) {
    setIfChanged("search_keywords", input.search_keywords, existing.search_keywords);
  }
  if (input.service_area !== undefined) {
    setIfChanged("service_area", input.service_area, existing.service_area);
  }
  if (input.town_id !== undefined) setIfChanged("town_id", input.town_id, existing.town_id);
  if (input.area_id !== undefined) setIfChanged("area_id", input.area_id, existing.area_id);
  if (input.primary_category_id !== undefined) {
    setIfChanged("primary_category_id", input.primary_category_id, existing.primary_category_id);
  }
  if (input.is_storefront !== undefined) {
    setIfChanged("is_storefront", input.is_storefront, existing.is_storefront);
  }
  if (input.is_service_business !== undefined) {
    setIfChanged("is_service_business", input.is_service_business, existing.is_service_business);
  }
  if (input.is_verified !== undefined) {
    setIfChanged("is_verified", input.is_verified, existing.is_verified);
  }
  if (input.is_explorable !== undefined) {
    setIfChanged("is_explorable", input.is_explorable, existing.is_explorable);
  }
  if (input.map_lat !== undefined) setIfChanged("map_lat", input.map_lat, existing.map_lat);
  if (input.map_lng !== undefined) setIfChanged("map_lng", input.map_lng, existing.map_lng);
  if (input.search_tags !== undefined) {
    const nextTags = [...new Set(input.search_tags.map((t) => t.trim()).filter(Boolean))].slice(0, 12);
    setIfChanged("search_tags", nextTags, existing.search_tags);
  }

  if (input.regenerate_slug === true && (patch.title !== undefined || input.title)) {
    const title = String(patch.title ?? input.title ?? existing.title ?? "business");
    const taken = new Set(opts?.takenSlugs ?? []);
    taken.delete(existing.slug);
    const nextSlug = uniqueSlug(title, taken);
    setIfChanged("slug", nextSlug, existing.slug);
  }

  const derivedInputsChanged =
    patch.title !== undefined ||
    patch.excerpt !== undefined ||
    patch.search_keywords !== undefined ||
    patch.search_tags !== undefined;

  if (derivedInputsChanged) {
    const merged = { ...existing, ...patch };
    const derived = buildSearchDocumentFields({
      title: (merged.title as string | null) ?? null,
      excerpt: (merged.excerpt as string | null) ?? null,
      business_type: null,
      search_keywords: (merged.search_keywords as string | null) ?? null,
    });
    // Prefer explicit search_tags from the admin form when provided.
    if (patch.search_tags === undefined) {
      setIfChanged("search_tags", derived.search_tags, existing.search_tags);
    }
    setIfChanged("search_terms", derived.search_terms, existing.search_terms);
    setIfChanged("embedding_summary", derived.embedding_summary, existing.embedding_summary);
  }

  if (changes.length === 0) return null;
  return { patch, changes };
}

export function preferredBusinessSlug(title: string): string {
  return slugifyBusinessTitle(title) || "business";
}
