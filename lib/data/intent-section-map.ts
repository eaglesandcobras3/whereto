import "server-only";

import { browseSectionIcon } from "@/lib/categories/unified-browse";
import {
  getAllFeatureFlags,
  isBusinessMapsFeatureEnabled,
} from "@/lib/feature-flags";
import {
  listStorefrontMapMarkersForBusinessIds,
  type BusinessMapMarker,
} from "@/lib/data/business-map-markers";

/** Map pins for a town/area intent section, matching category-hub map gating. */
export async function listIntentSectionMapMarkers(
  businesses: { id: string }[],
  sectionSlug: string,
): Promise<BusinessMapMarker[]> {
  const flags = await getAllFeatureFlags();
  if (!isBusinessMapsFeatureEnabled(flags)) return [];
  const ids = businesses.map((business) => business.id).filter(Boolean);
  if (ids.length === 0) return [];
  try {
    return await listStorefrontMapMarkersForBusinessIds(ids, {
      defaultIcon: browseSectionIcon(sectionSlug),
    });
  } catch {
    return [];
  }
}
