/** Slug helper for rental properties (admin / manual entry). */

export function slugifyRentalTitle(title: string, suffix?: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const idPart = (suffix ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  if (idPart) return `${base || "stay"}-${idPart}`;
  return base || "stay";
}
