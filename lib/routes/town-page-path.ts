import { normalizeUrlSegment } from "@/lib/routes/url-slug";

/** Canonical public path for a town guide detail page. */
export function townPagePath(slug: string): string {
  const normalized = normalizeUrlSegment(slug);
  return normalized ? `/town/${normalized}` : "/towns";
}
