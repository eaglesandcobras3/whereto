import type { SupabaseClient } from "@supabase/supabase-js";
import {
  categoryDbSlugCandidatesFromPublicPath,
  categoryDbSlugFromPublicPath,
  categoryHubPath,
} from "@/lib/routes/category-hub-path";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import { normalizeBusinessCategorySlug } from "@/lib/search/category-slugs";
import { RETIRED_GUIDE_REDIRECTS } from "@/lib/seo/retired-guide-redirects";
import {
  PRIMARY_EDITORIAL_GUIDE_PATH,
  PRIMARY_EDITORIAL_GUIDE_SLUG,
} from "@/lib/seo/sitemap-strategy";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { parseLabelRoute, type ParsedLabelRoute } from "./parse-label-route";
import { pathForKind } from "./paths";

/** Directory / static paths that are not IRSE page kinds. */
export const NON_SCORABLE_ROOT_PATHS = new Set([
  "/",
  "/about",
  "/businesses",
  "/towns",
  "/areas",
  "/guides",
  "/search",
  "/discover",
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/list-your-business",
  "/saved",
  "/profile",
  "/admin",
  "/portal",
  "/ask",
  "/feedback",
]);

export type LabelRouteLookup = {
  townSlugs: Set<string>;
  areaSlugs: Set<string>;
  /** DB category slug → true when published. */
  categorySlugs: Set<string>;
};

export async function buildLabelRouteLookup(
  supabase: SupabaseClient,
): Promise<LabelRouteLookup> {
  const [towns, areas, pois, categories] = await Promise.all([
    supabase.from("towns").select("slug").is("archived_at", null).not("slug", "is", null),
    supabase
      .from("areas")
      .select("slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .not("slug", "is", null),
    supabase
      .from("points_of_interest")
      .select("slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .not("slug", "is", null),
    supabase
      .from("business_categories")
      .select("slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .not("slug", "is", null),
  ]);

  const townSlugs = new Set(
    (towns.data ?? [])
      .map((r) => String((r as { slug: string }).slug).trim())
      .filter(Boolean),
  );
  const areaSlugs = new Set<string>();
  for (const row of [...(areas.data ?? []), ...(pois.data ?? [])]) {
    const slug = String((row as { slug: string }).slug).trim();
    if (slug) areaSlugs.add(slug);
  }
  const categorySlugs = new Set(
    (categories.data ?? [])
      .map((r) => String((r as { slug: string }).slug).trim())
      .filter(Boolean),
  );

  return { townSlugs, areaSlugs, categorySlugs };
}

/** Normalize URL or path to a decoded pathname starting with `/`. */
export function normalizeLabelPathname(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let pathname = trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      pathname = new URL(trimmed).pathname;
    }
  } catch {
    return null;
  }

  pathname = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    /* keep */
  }
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "");
  return pathname || "/";
}

function resolveCategorySlug(
  segment: string,
  lookup: LabelRouteLookup,
): string | null {
  const mapped = categoryDbSlugFromPublicPath(segment);
  if (mapped && lookup.categorySlugs.has(mapped)) return mapped;

  for (const candidate of categoryDbSlugCandidatesFromPublicPath(segment)) {
    if (lookup.categorySlugs.has(candidate)) return candidate;
  }

  const normalized = normalizeBusinessCategorySlug(segment);
  if (normalized && lookup.categorySlugs.has(normalized)) return normalized;

  // Hyphenated public form of a DB slug (e.g. beauty-and-wellness)
  const underscored = segment.trim().toLowerCase().replace(/-/g, "_");
  if (lookup.categorySlugs.has(underscored)) return underscored;

  return null;
}

/**
 * Resolve a CSV URL/path to an IRSE kind+slug, mirroring site redirects/aliases.
 * Returns null when the path is a non-scorable hub or unknown.
 */
export function resolveLabelRoute(
  raw: string,
  lookup: LabelRouteLookup,
): { route: ParsedLabelRoute; via?: string } | null {
  const pathname = normalizeLabelPathname(raw);
  if (!pathname) return null;

  // Config-style redirects
  if (pathname === "/guide") {
    return {
      route: {
        kind: "guide",
        slug: PRIMARY_EDITORIAL_GUIDE_SLUG,
        path: PRIMARY_EDITORIAL_GUIDE_PATH,
      },
      via: "redirect /guide → primary editorial guide",
    };
  }
  if (pathname === "/services" || pathname.startsWith("/services/")) {
    return null; // redirects to /businesses — not an IRSE entity page
  }

  // Retired guide slugs
  const guideMatch = pathname.match(/^\/guide\/([^/]+)\/?$/);
  if (guideMatch?.[1]) {
    const retired = RETIRED_GUIDE_REDIRECTS[guideMatch[1]];
    if (retired) {
      if (retired.startsWith("/guide/")) {
        const slug = retired.slice("/guide/".length);
        return {
          route: { kind: "guide", slug, path: retired },
          via: `retired guide redirect → ${retired}`,
        };
      }
      // e.g. /towns — not scorable
      return null;
    }
  }

  if (NON_SCORABLE_ROOT_PATHS.has(pathname)) return null;
  if (pathname.startsWith("/admin") || pathname.startsWith("/portal")) return null;
  if (pathname.startsWith("/api/")) return null;

  // Explicit IRSE paths first
  const direct = parseLabelRoute(pathname);
  if (direct) {
    // /categories/X or /businesses/X → prefer published leaf category slug normalization
    if (
      direct.kind === "category" &&
      (pathname.startsWith("/categories/") || pathname.startsWith("/businesses/"))
    ) {
      const resolved = resolveCategorySlug(direct.slug, lookup);
      if (resolved) {
        return {
          route: {
            kind: "category",
            slug: resolved,
            path: categoryHubPath(resolved),
          },
          via: pathname !== categoryHubPath(resolved) ? `category alias → ${resolved}` : undefined,
        };
      }
      // Rollup / browse-group hubs live under /businesses without a leaf category row.
      if (pathname.startsWith("/businesses/")) {
        return { route: direct };
      }
      return null;
    }
    // Known hub map (/restaurants) — verify published when we have lookup
    if (direct.kind === "category" && !lookup.categorySlugs.has(direct.slug)) {
      // still allow mapped hubs even if lookup empty (tests); if lookup has data, require membership
      if (lookup.categorySlugs.size > 0) return null;
    }
    return { route: direct };
  }

  const parts = pathname.replace(/^\//, "").split("/").filter(Boolean);
  if (parts.length !== 1) return null;

  const segment = parts[0]!.toLowerCase();
  if (isReservedRootSlug(segment)) return null;

  // Same order as app/[townSlug]/page.tsx: category → town → area
  const categorySlug = resolveCategorySlug(segment, lookup);
  if (categorySlug) {
    return {
      route: {
        kind: "category",
        slug: categorySlug,
        path: categoryHubPath(categorySlug),
      },
      via: `root category alias /${segment} → ${categorySlug}`,
    };
  }

  if (lookup.townSlugs.has(segment)) {
    return {
      route: {
        kind: "town",
        slug: segment,
        path: pathForKind("town", segment),
      },
      via: `root town alias /${segment} → /town/${segment}`,
    };
  }

  if (lookup.areaSlugs.has(segment)) {
    return {
      route: {
        kind: "area",
        slug: segment,
        path: pathForKind("area", segment),
      },
      via: `root area alias /${segment} → /area/${segment}`,
    };
  }

  return null;
}
