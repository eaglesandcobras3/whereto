import { SERVICE_CATEGORY_SLUGS } from "@/lib/service-categories/constants";

const ALIASES: Record<string, (typeof SERVICE_CATEGORY_SLUGS)[number]> = {
  lawn: "lawn_care",
  "lawn-care": "lawn_care",
  pool: "pool_spa",
  "pool-spa": "pool_spa",
  "pressure-washing": "pressure_washing",
  pest: "pest_control",
  "pest-control": "pest_control",
  boat: "marine_boat",
  marine: "marine_boat",
  hauling: "moving",
  property: "property_management",
};

export function normalizeServiceCategorySlug(
  slug: string | null | undefined,
): string | null {
  if (!slug?.trim()) return null;
  const key = slug.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  const aliased = ALIASES[key];
  if (aliased) return aliased;
  if ((SERVICE_CATEGORY_SLUGS as readonly string[]).includes(key)) return key;
  return null;
}
