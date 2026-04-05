/**
 * Google Places API (New) photo resource names, e.g. `places/ChIJ…/photos/Aw…`.
 * Proxied via `/api/place-photo` so the API key never ships to the browser.
 */
export function isValidPlacePhotoName(name: string): boolean {
  if (!name || name.length > 512) return false;
  if (!name.startsWith("places/")) return false;
  if (!name.includes("/photos/")) return false;
  if (name.includes("..") || name.includes("?") || name.includes("#")) return false;
  return true;
}

export function placePhotoProxyUrl(photoName: string | null | undefined): string | null {
  if (!photoName || !isValidPlacePhotoName(photoName)) return null;
  return `/api/place-photo?name=${encodeURIComponent(photoName)}`;
}

export function firstPlacePhotoProxyUrl(
  photos: string[] | null | undefined,
): string | null {
  const first = photos?.find((p) => isValidPlacePhotoName(p));
  return first ? placePhotoProxyUrl(first) : null;
}
