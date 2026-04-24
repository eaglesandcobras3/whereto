/**
 * Single-segment path param from `app/.../[[...]]` — kebab, lowercase, no trailing noise.
 * Keeps `/{townSlug}` lookups stable vs browser casing/encoding.
 */
export function normalizeUrlSegment(segment: string): string {
  if (!segment) return "";
  let s: string;
  try {
    s = decodeURIComponent(segment);
  } catch {
    s = segment;
  }
  return s.trim().toLowerCase();
}
