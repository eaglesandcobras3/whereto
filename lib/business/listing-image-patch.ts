/**
 * Persist listing image URL on `public.businesses` (not businesses_view).
 * Clears legacy Directus UUID FKs when setting a Storage/CDN URL.
 */
export function businessListingImagePatch(
  imageUrl: string | null | undefined,
): Record<string, unknown> | null {
  if (imageUrl === undefined) return null;
  const url = imageUrl?.trim() || null;
  if (url) {
    return {
      main_image_url: url,
      hero_image_url: url,
      main_image: null,
      hero_image: null,
    };
  }
  return {
    main_image_url: null,
    hero_image_url: null,
    main_image: null,
    hero_image: null,
  };
}
