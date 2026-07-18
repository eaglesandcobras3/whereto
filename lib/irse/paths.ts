import { categoryHubPath } from "@/lib/routes/category-hub-path";
import type { PageKind } from "./types";

export function pathForKind(kind: PageKind, slug: string): string {
  const s = slug.trim();
  switch (kind) {
    case "business":
      return `/business/${encodeURIComponent(s)}`;
    case "guide":
      return `/guide/${encodeURIComponent(s)}`;
    case "town":
      return `/town/${encodeURIComponent(s)}`;
    case "area":
      return `/area/${encodeURIComponent(s)}`;
    case "category":
      return categoryHubPath(s);
  }
}

export function absoluteUrlForPath(path: string, siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
