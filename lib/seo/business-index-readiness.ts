/** Minimum combined excerpt + content length for a listing to be sitemap/index eligible. */
export const BUSINESS_INDEX_MIN_UNIQUE_TEXT = 80;

export type BusinessIndexReadinessFields = {
  slug?: string | null;
  excerpt?: string | null;
  content?: string | null;
  address?: string | null;
  hero_image?: string | null;
  main_image?: string | null;
  hero_image_url?: string | null;
  main_image_url?: string | null;
  primary_category_id?: string | null;
  town_id?: string | null;
};

function textLen(...parts: Array<string | null | undefined>): number {
  return parts.reduce((n, p) => n + (p?.trim().length ?? 0), 0);
}

export function hasBusinessListingImage(row: BusinessIndexReadinessFields): boolean {
  return Boolean(
    row.hero_image?.trim() ||
      row.main_image?.trim() ||
      row.hero_image_url?.trim() ||
      row.main_image_url?.trim(),
  );
}

export function isBusinessIndexReady(row: BusinessIndexReadinessFields): boolean {
  const slug = row.slug?.trim();
  if (!slug) return false;

  const uniqueText = textLen(row.excerpt, row.content);
  const hasUniqueText = uniqueText >= BUSINESS_INDEX_MIN_UNIQUE_TEXT;
  const image = hasBusinessListingImage(row);
  const address = Boolean(row.address?.trim());
  const category = row.primary_category_id != null;
  const town = row.town_id != null;

  return hasUniqueText && image && address && category && town;
}

export function businessSitemapPath(slug: string): string {
  return `/business/${encodeURIComponent(slug.trim())}`;
}
