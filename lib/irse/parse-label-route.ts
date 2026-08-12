import {
  categoryDbSlugFromPublicPath,
} from "@/lib/routes/category-hub-path";
import { isPageKind, type PageKind } from "./types";

export type ParsedLabelRoute = {
  kind: PageKind;
  slug: string;
  path: string;
};

/**
 * Parse a site path or absolute URL into IRSE kind + slug.
 * Examples: `/business/foo`, `https://whereto30a.com/guide/bar`, `/restaurants`
 */
export function parseLabelRoute(raw: string): ParsedLabelRoute | null {
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
  // decode once for slug matching against DB
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    /* keep pathname */
  }

  const parts = decoded.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const head = parts[0]!.toLowerCase();

  if (head === "business" && parts[1]) {
    return { kind: "business", slug: parts[1], path: `/business/${parts[1]}` };
  }
  if (head === "guide" && parts[1]) {
    return { kind: "guide", slug: parts[1], path: `/guide/${parts[1]}` };
  }
  if (head === "town" && parts[1]) {
    return { kind: "town", slug: parts[1], path: `/town/${parts[1]}` };
  }
  if (head === "area" && parts[1]) {
    return { kind: "area", slug: parts[1], path: `/area/${parts[1]}` };
  }
  if (head === "categories" && parts[1]) {
    return { kind: "category", slug: parts[1], path: `/businesses/${parts[1]}` };
  }
  if (head === "businesses" && parts[1] && parts.length === 2) {
    const mapped = categoryDbSlugFromPublicPath(parts[1]);
    return {
      kind: "category",
      slug: mapped ?? parts[1].replace(/-/g, "_"),
      path: `/businesses/${parts[1]}`,
    };
  }

  // Legacy root category hubs: /restaurants, /coffee-shops, …
  if (parts.length === 1) {
    const dbSlug = categoryDbSlugFromPublicPath(head);
    if (dbSlug) {
      return { kind: "category", slug: dbSlug, path: `/businesses/${head}` };
    }
  }

  return null;
}

/** Parse optional kind + slug columns when path/url is missing. */
export function parseKindSlugLabel(
  kindRaw: string | undefined,
  slugRaw: string | undefined,
): ParsedLabelRoute | null {
  const kind = (kindRaw ?? "").trim().toLowerCase();
  const slug = (slugRaw ?? "").trim();
  if (!isPageKind(kind) || !slug) return null;
  const path =
    kind === "category"
      ? `/businesses/${slug.replace(/_/g, "-")}`
      : `/${kind}/${slug}`;
  return { kind, slug, path };
}
