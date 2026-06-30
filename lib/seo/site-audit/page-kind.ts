import { isCategoryHubPublicPath } from "@/lib/routes/category-hub-path";
import { SERVICE_VENDORS_HUB_PATH } from "@/lib/routes/service-vendors-hub";
import { businessBrowseGroupFromPublicSegment } from "@/lib/business-categories/browse-group-nav";
import { serviceBrowseGroupFromPublicSegment } from "@/lib/service-categories/browse-group-nav";
import type { PageKind } from "./types";

const HUB_PATHS = new Set([
  "/towns",
  "/areas",
  "/categories",
  "/guides",
  "/businesses",
  SERVICE_VENDORS_HUB_PATH,
]);

const UTILITY_PREFIXES = [
  "/admin/",
  "/portal/",
  "/auth/",
  "/profile/",
  "/saved/",
  "/dev/",
  "/search",
  "/ask",
  "/share/",
  "/login",
  "/signup",
  "/api/",
];

export function classifyPageKind(pathname: string): PageKind {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (path === "/") return "home";
  if (HUB_PATHS.has(path)) return "hub";
  if (path.startsWith("/business/")) return "business";
  if (path.startsWith("/area/")) return "area";
  if (path.startsWith("/guide/")) return "guide";
  if (path.startsWith("/events/")) return "event";
  if (path.startsWith("/categories/")) {
    const segment = path.split("/")[2] ?? "";
    if (businessBrowseGroupFromPublicSegment(segment)) return "browse_group";
    return "other";
  }
  if (path.startsWith(`${SERVICE_VENDORS_HUB_PATH}/`)) {
    const segment = path.split("/")[2] ?? "";
    if (serviceBrowseGroupFromPublicSegment(segment)) return "service_group";
    return "other";
  }
  if (isCategoryHubPublicPath(path)) return "category_hub";

  const parts = path.split("/").filter(Boolean);
  if (parts.length === 2) return "seo_intent";
  if (parts.length === 1) {
    if (UTILITY_PREFIXES.some((p) => path.startsWith(p))) return "utility";
    return "town";
  }
  return "other";
}

export function isIndexableKind(kind: PageKind): boolean {
  return kind !== "utility" && kind !== "other";
}

export function shouldCrawlUrl(pathname: string, robotsDisallow: string[]): boolean {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  for (const prefix of robotsDisallow) {
    if (prefix === "/") return false;
    if (path === prefix || path.startsWith(prefix)) return false;
  }
  if (path.startsWith("/api/")) return false;
  if (path.startsWith("/_next/")) return false;
  return true;
}

export function normalizeAuditUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    const s = u.toString();
    return s.endsWith("/") && u.pathname !== "/" ? s.slice(0, -1) : s;
  } catch {
    return url;
  }
}

export function pathnameFromUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
