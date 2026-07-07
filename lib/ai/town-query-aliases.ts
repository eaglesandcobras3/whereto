/** Canonical town needles for NL query parsing (longest needles first). */
export const TOWN_QUERY_ALIASES: ReadonlyArray<readonly [needle: string, slug: string]> = [
  ["blue mountain", "blue-mountain-beach"],
  ["santa rosa", "santa-rosa-beach"],
  ["gulf place", "gulf-place"],
  ["dune allen", "dune-allen-beach"],
  ["rosemary beach", "rosemary-beach"],
  ["seacrest beach", "seacrest-beach"],
  ["alys beach", "alys-beach"],
  ["seagrove beach", "seagrove-beach"],
  ["grayton beach", "grayton-beach"],
  ["carillon beach", "carillon-beach"],
  ["inlet beach", "inlet-beach"],
  ["carillon", "carillon-beach"],
  ["inlet", "inlet-beach"],
  ["rosemary", "rosemary-beach"],
  ["seacrest", "seacrest-beach"],
  ["alys", "alys-beach"],
  ["watersound", "watersound"],
  ["seagrove", "seagrove-beach"],
  ["seaside", "seaside"],
  ["watercolor", "watercolor"],
  ["grayton", "grayton-beach"],
  ["sandestin", "sandestin"],
] as const;

const SORTED_TOWN_ALIASES = [...TOWN_QUERY_ALIASES].sort(
  (a, b) => b[0].length - a[0].length,
);

/**
 * All town slugs mentioned in normalized query text, in left-to-right order.
 * Handles lists like "rosemary, seaside and alys" or "rosemary or seaside".
 */
export function extractTownsFromNormalizedQuery(normalized: string): string[] {
  const matches: Array<{ index: number; slug: string }> = [];
  const seenSlugs = new Set<string>();

  for (const [needle, slug] of SORTED_TOWN_ALIASES) {
    if (seenSlugs.has(slug)) continue;
    const index = normalized.indexOf(needle);
    if (index >= 0) {
      matches.push({ index, slug });
      seenSlugs.add(slug);
    }
  }

  return matches.sort((a, b) => a.index - b.index).map((match) => match.slug);
}

/** First town slug when a 30A place name appears in normalized query text. */
export function extractTownFromNormalizedQuery(normalized: string): string | null {
  return extractTownsFromNormalizedQuery(normalized)[0] ?? null;
}
