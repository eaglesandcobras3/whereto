import { normalizeSearchTagSlug } from "@/lib/discovery-filters/search-tag-label";

/** Parse URL `facet` param into normalized `search_tags` slugs (comma-separated). */
export function parseTagSlugsFromParam(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const token of raw.split(",")) {
    const part = token.trim();
    if (!part) continue;

    // Legacy `family:slug` tokens — use slug only (search_tags is the single index).
    const slugPart = part.includes(":") ? (part.split(":", 2)[1] ?? part) : part;
    const slug = normalizeSearchTagSlug(slugPart);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }

  return out;
}
