import allowlists from "@/data/facet-allowlists.json";
import type { FacetTag, FacetTagFamily } from "@/lib/discovery-filters/filter-state";

export type FacetDefinition = {
  slug: string;
  label: string;
  family: FacetTagFamily;
};

export type FacetAllowlistEntry = {
  primary_families: FacetTagFamily[];
  facets: FacetDefinition[];
};

type AllowlistFile = Record<string, FacetAllowlistEntry>;

const FILE = allowlists as AllowlistFile;

export function getFacetAllowlistForCategory(categorySlug: string | undefined): FacetDefinition[] {
  if (!categorySlug) return [];
  const entry = FILE[categorySlug];
  if (!entry?.facets?.length) return [];
  return entry.facets;
}

export function getFacetAllowlistForServiceCategory(
  serviceCategorySlug: string | undefined,
): FacetDefinition[] {
  if (!serviceCategorySlug) return FILE._services_default?.facets ?? [];
  const entry = FILE[serviceCategorySlug];
  return entry?.facets ?? FILE._services_default?.facets ?? [];
}

export function resolveFacetDefinition(
  slug: string,
  categorySlug: string | undefined,
  serviceCategorySlug: string | undefined,
  entityType: "storefront" | "service",
): FacetDefinition | null {
  const normalized = slug.trim().toLowerCase().replace(/\s+/g, "_");
  const pool =
    entityType === "service"
      ? getFacetAllowlistForServiceCategory(serviceCategorySlug)
      : getFacetAllowlistForCategory(categorySlug);
  const hit = pool.find((f) => f.slug === normalized);
  if (hit) return hit;

  // Accept explicit family:slug tokens even if not in allowlist UI
  return null;
}

export function parseFacetParamTokens(
  raw: string | undefined,
  categorySlug: string | undefined,
  serviceCategorySlug: string | undefined,
  entityType: "storefront" | "service",
): FacetTag[] {
  if (!raw?.trim()) return [];

  const out: FacetTag[] = [];
  const seen = new Set<string>();

  for (const token of raw.split(",")) {
    const part = token.trim();
    if (!part) continue;

    let family: FacetTagFamily | null = null;
    let slug = part;

    if (part.includes(":")) {
      const [fam, rest] = part.split(":", 2);
      if (facetTagFamilySchemaSafe(fam) && rest) {
        family = fam;
        slug = rest;
      }
    }

    const normalizedSlug = slug.trim().toLowerCase().replace(/\s+/g, "_");
    if (!normalizedSlug) continue;

    if (!family) {
      const def = resolveFacetDefinition(
        normalizedSlug,
        categorySlug,
        serviceCategorySlug,
        entityType,
      );
      if (def) {
        family = def.family;
      } else {
        family = "item_tags";
      }
    }

    const key = `${family}:${normalizedSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ family, slug: normalizedSlug });
  }

  return out;
}

function facetTagFamilySchemaSafe(value: string): value is FacetTagFamily {
  return (
    value === "item_tags" ||
    value === "search_tags" ||
    value === "atmosphere_tags" ||
    value === "occasion_tags" ||
    value === "meal_period_tags" ||
    value === "dietary_tags"
  );
}
