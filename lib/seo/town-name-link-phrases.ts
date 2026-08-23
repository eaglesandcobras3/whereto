/** Display phrases for inline town links in editorial copy (longest first). */
export const TOWN_NAME_LINK_PHRASES: ReadonlyArray<{ phrase: string; slug: string }> = [
  { phrase: "Panama City Beach", slug: "panama-city-beach" },
  { phrase: "Blue Mountain Beach", slug: "blue-mountain-beach" },
  { phrase: "Dune Allen Beach", slug: "dune-allen-beach" },
  { phrase: "Miramar Beach", slug: "miramar-beach" },
  { phrase: "Santa Rosa Beach", slug: "santa-rosa-beach" },
  { phrase: "Seacrest Beach", slug: "seacrest-beach" },
  { phrase: "Rosemary Beach", slug: "rosemary-beach" },
  { phrase: "Seagrove Beach", slug: "seagrove-beach" },
  { phrase: "Grayton Beach", slug: "grayton-beach" },
  { phrase: "Inlet Beach", slug: "inlet-beach" },
  { phrase: "Alys Beach", slug: "alys-beach" },
  { phrase: "Gulf Place", slug: "gulf-place" },
  { phrase: "WaterColor", slug: "watercolor" },
  { phrase: "WaterSound", slug: "watersound" },
  { phrase: "Sandestin", slug: "sandestin" },
  { phrase: "Prominence", slug: "prominence" },
  { phrase: "Seaside", slug: "seaside" },
  { phrase: "Seagrove", slug: "seagrove-beach" },
  { phrase: "Seacrest", slug: "seacrest-beach" },
  { phrase: "Rosemary", slug: "rosemary-beach" },
  { phrase: "Grayton", slug: "grayton-beach" },
  { phrase: "Destin", slug: "destin" },
  { phrase: "Miramar", slug: "miramar-beach" },
  { phrase: "Alys", slug: "alys-beach" },
  { phrase: "Inlet", slug: "inlet-beach" },
  { phrase: "Santa Rosa", slug: "santa-rosa-beach" },
  { phrase: "Dune Allen", slug: "dune-allen-beach" },
  { phrase: "Blue Mountain", slug: "blue-mountain-beach" },
] as const;

export const TOWN_NAME_LINK_PHRASES_SORTED = [...TOWN_NAME_LINK_PHRASES].sort(
  (a, b) => b.phrase.length - a.phrase.length,
);

function isWordBoundary(char: string | undefined): boolean {
  if (!char) return true;
  return !/[a-z0-9]/i.test(char);
}

export type TownNameMatch = {
  start: number;
  end: number;
  slug: string;
  text: string;
};

/** Non-overlapping town name matches in display text (case-insensitive). */
export function findTownNameMatches(
  text: string,
  options?: { excludeSlug?: string; linkableSlugs?: ReadonlySet<string> },
): TownNameMatch[] {
  const matches: TownNameMatch[] = [];
  const lower = text.toLowerCase();

  for (const { phrase, slug } of TOWN_NAME_LINK_PHRASES_SORTED) {
    if (options?.excludeSlug && slug === options.excludeSlug) continue;
    if (options?.linkableSlugs && !options.linkableSlugs.has(slug)) continue;
    const phraseLower = phrase.toLowerCase();
    let searchFrom = 0;

    while (searchFrom < text.length) {
      const idx = lower.indexOf(phraseLower, searchFrom);
      if (idx < 0) break;

      const end = idx + phrase.length;
      const overlaps = matches.some((m) => !(end <= m.start || idx >= m.end));
      const bounded =
        isWordBoundary(text[idx - 1]) && isWordBoundary(text[end]);

      if (!overlaps && bounded) {
        matches.push({
          start: idx,
          end,
          slug,
          text: text.slice(idx, end),
        });
        searchFrom = end;
      } else {
        searchFrom = idx + 1;
      }
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}
