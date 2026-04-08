/**
 * Public listing image URL from Supabase Storage (`businesses.hero_image_url`).
 */
export function businessListingImageUrl(
  heroImageUrl: string | null | undefined,
): string | null {
  const u = heroImageUrl?.trim();
  if (!u?.startsWith("http")) return null;
  return u;
}
