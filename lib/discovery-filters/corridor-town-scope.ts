/**
 * Corridor-aware town expansion for discover "near {town}" queries.
 *
 * East anchors include Seaside and everything east; west anchors include Grayton
 * and everything west; central anchors search the full corridor.
 */

/** Scenic 30A spine, east → west. */
export const CORRIDOR_TOWNS_EAST_TO_WEST = [
  "carillon-beach",
  "inlet-beach",
  "rosemary-beach",
  "seacrest-beach",
  "alys-beach",
  "watersound",
  "seagrove-beach",
  "seaside",
  "watercolor",
  "grayton-beach",
  "blue-mountain-beach",
  "santa-rosa-beach",
  "gulf-place",
  "dune-allen-beach",
  "prominence",
] as const;

export type CorridorTownSlug = (typeof CORRIDOR_TOWNS_EAST_TO_WEST)[number];

const EAST_ANCHORS = new Set<CorridorTownSlug>([
  "carillon-beach",
  "inlet-beach",
  "rosemary-beach",
  "seacrest-beach",
  "alys-beach",
]);

const CENTRAL_ANCHORS = new Set<CorridorTownSlug>([
  "watersound",
  "seagrove-beach",
  "seaside",
  "watercolor",
  "grayton-beach",
]);

const WEST_ANCHORS = new Set<CorridorTownSlug>([
  "blue-mountain-beach",
  "santa-rosa-beach",
  "gulf-place",
  "dune-allen-beach",
  "prominence",
]);

const SEASIDE_INDEX = CORRIDOR_TOWNS_EAST_TO_WEST.indexOf("seaside");
const GRAYTON_INDEX = CORRIDOR_TOWNS_EAST_TO_WEST.indexOf("grayton-beach");

const EAST_ZONE = CORRIDOR_TOWNS_EAST_TO_WEST.slice(0, SEASIDE_INDEX + 1);
const WEST_ZONE = CORRIDOR_TOWNS_EAST_TO_WEST.slice(GRAYTON_INDEX);

const CORRIDOR_SET = new Set<string>(CORRIDOR_TOWNS_EAST_TO_WEST);

export type CorridorTownExpansion = {
  /** Slugs to resolve to town_ids; empty when searching the full corridor. */
  slugs: string[];
  /** True when the anchor is central — do not apply a town filter. */
  searchAllTowns: boolean;
};

function isCorridorSlug(slug: string): slug is CorridorTownSlug {
  return CORRIDOR_SET.has(slug);
}

function zoneSlugsForAnchor(slug: string): CorridorTownExpansion {
  if (!isCorridorSlug(slug)) {
    return { slugs: [slug], searchAllTowns: false };
  }
  if (CENTRAL_ANCHORS.has(slug)) {
    return { slugs: [], searchAllTowns: true };
  }
  if (EAST_ANCHORS.has(slug)) {
    return { slugs: [...EAST_ZONE], searchAllTowns: false };
  }
  if (WEST_ANCHORS.has(slug)) {
    return { slugs: [...WEST_ZONE], searchAllTowns: false };
  }
  return { slugs: [slug], searchAllTowns: false };
}

/**
 * Expand anchor town slug(s) for a proximity ("near") discover search.
 * Returns `searchAllTowns: true` for central anchors; otherwise a deduped slug list.
 */
export function expandCorridorTownSlugsForNearSearch(anchorSlugs: string[]): CorridorTownExpansion {
  const anchors = anchorSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!anchors.length) {
    return { slugs: [], searchAllTowns: false };
  }

  let searchAllTowns = false;
  const expanded = new Set<string>();

  for (const slug of anchors) {
    const zone = zoneSlugsForAnchor(slug);
    if (zone.searchAllTowns) {
      searchAllTowns = true;
      break;
    }
    for (const s of zone.slugs) expanded.add(s);
  }

  if (searchAllTowns) {
    return { slugs: [], searchAllTowns: true };
  }

  if (expanded.size === 0) {
    return { slugs: anchors, searchAllTowns: false };
  }

  return { slugs: [...expanded], searchAllTowns: false };
}
