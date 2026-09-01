import { browseSectionBySlug } from "@/lib/categories/unified-browse";
import { getUnifiedLeaves } from "@/lib/categories/unified-taxonomy";
import { normalizeIntentSlug } from "@/lib/business-categories/group-browse-sections";
import { areaIntentPath } from "@/lib/routes/area-intent-path";
import { townIntentPath } from "@/lib/routes/town-intent-path";
import { townPagePath } from "@/lib/routes/town-page-path";

export type PlaceIntentNavMode = "town" | "area";

export type PlaceIntentNavSelection = {
  placeSlug?: string | null;
  categorySlug?: string | null;
  subcategorySlug?: string | null;
};

const leafBySlug = new Map(
  getUnifiedLeaves().map((leaf) => [leaf.slug, leaf] as const),
);

export function resolvePlaceIntentNavFromIntentSlug(
  intentSlug: string | null | undefined,
): Pick<PlaceIntentNavSelection, "categorySlug" | "subcategorySlug"> {
  const normalized = intentSlug ? normalizeIntentSlug(intentSlug) : "";
  if (!normalized) return {};

  if (browseSectionBySlug(normalized)) {
    return { categorySlug: normalized, subcategorySlug: null };
  }

  const leaf = leafBySlug.get(normalized);
  if (leaf) {
    return { categorySlug: leaf.rollupSlug, subcategorySlug: normalized };
  }

  return {};
}

export function placeIntentNavHubPath(mode: PlaceIntentNavMode): string {
  return mode === "town" ? "/towns" : "/areas";
}

export function placeIntentNavPlacePath(
  mode: PlaceIntentNavMode,
  placeSlug: string,
): string {
  return mode === "town" ? townPagePath(placeSlug) : `/area/${encodeURIComponent(placeSlug.trim())}`;
}

export function placeIntentNavIntentPath(
  mode: PlaceIntentNavMode,
  placeSlug: string,
  intentSlug: string,
): string {
  return mode === "town"
    ? townIntentPath(placeSlug, intentSlug)
    : areaIntentPath(placeSlug, intentSlug);
}

/** Deepest route for the current breadcrumb selection. */
export function placeIntentNavHref(
  mode: PlaceIntentNavMode,
  selection: PlaceIntentNavSelection,
): string | null {
  const placeSlug = selection.placeSlug?.trim();
  if (!placeSlug) return placeIntentNavHubPath(mode);

  const subcategorySlug = selection.subcategorySlug?.trim();
  if (subcategorySlug) {
    return placeIntentNavIntentPath(mode, placeSlug, subcategorySlug);
  }

  const categorySlug = selection.categorySlug?.trim();
  if (categorySlug) {
    return placeIntentNavIntentPath(mode, placeSlug, categorySlug);
  }

  return placeIntentNavPlacePath(mode, placeSlug);
}

export type PlaceIntentNavLevel = "hub" | "place" | "category" | "subcategory";

export function placeIntentNavHrefForLevel(
  mode: PlaceIntentNavMode,
  selection: PlaceIntentNavSelection,
  level: PlaceIntentNavLevel,
): string {
  const placeSlug = selection.placeSlug?.trim();
  const categorySlug = selection.categorySlug?.trim();
  const subcategorySlug = selection.subcategorySlug?.trim();

  if (level === "hub" || !placeSlug) return placeIntentNavHubPath(mode);
  if (level === "place" || !categorySlug) return placeIntentNavPlacePath(mode, placeSlug);
  if (level === "category" || !subcategorySlug) {
    return placeIntentNavIntentPath(mode, placeSlug, categorySlug);
  }
  return placeIntentNavIntentPath(mode, placeSlug, subcategorySlug);
}

export function placeIntentNavPlaceLabel(mode: PlaceIntentNavMode): string {
  return mode === "town" ? "Town" : "Area";
}

export function placeIntentNavTriggerLabel(mode: PlaceIntentNavMode): string {
  return mode === "town" ? "Browse by town" : "Browse by area";
}
