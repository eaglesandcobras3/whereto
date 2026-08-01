import { getSiteUrl } from "@/lib/site-url";

export type PageShareType = "town" | "area" | "business" | "guide";

export type PageShareMethod = "native" | "copy_link" | "email";

export type PageSharePayload = {
  title: string;
  text: string;
  url: string;
};

export type ShareCapabilityNavigator = {
  share?: (data?: ShareData) => Promise<void>;
  canShare?: (data?: ShareData) => boolean;
};

/** Share dialog title: "[Page Name] | WhereTo30A" */
export function pageShareTitle(pageName: string): string {
  return `${pageName} | WhereTo30A`;
}

/** Short share body: "Check out [Page Name] on WhereTo30A." */
export function pageShareMessage(pageName: string): string {
  return `Check out ${pageName} on WhereTo30A.`;
}

/** Drop query string and hash from an absolute or relative URL string. */
export function stripUrlQueryAndHash(url: string): string {
  try {
    const parsed = new URL(url, "https://whereto30a.invalid");
    return url.startsWith("http://") || url.startsWith("https://")
      ? `${parsed.origin}${parsed.pathname}`
      : parsed.pathname;
  } catch {
    const withoutHash = url.split("#")[0] ?? url;
    return withoutHash.split("?")[0] ?? withoutHash;
  }
}

/**
 * Canonical absolute page URL for sharing.
 * Uses site origin + path and never includes query params or hash.
 */
export function canonicalPageUrl(path: string, origin = getSiteUrl()): string {
  const base = origin.replace(/\/$/, "");
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  const pathOnly = stripUrlQueryAndHash(withSlash);
  const pathname =
    pathOnly.startsWith("http://") || pathOnly.startsWith("https://")
      ? new URL(pathOnly).pathname
      : pathOnly;
  return `${base}${pathname}`;
}

export function buildPageSharePayload(input: {
  pageName: string;
  path: string;
  origin?: string;
}): PageSharePayload {
  return {
    title: pageShareTitle(input.pageName),
    text: pageShareMessage(input.pageName),
    url: canonicalPageUrl(input.path, input.origin),
  };
}

export function buildShareEmailHref(payload: PageSharePayload): string {
  const subject = encodeURIComponent(payload.title);
  const body = encodeURIComponent(`${payload.text}\n\n${payload.url}`);
  return `mailto:?subject=${subject}&body=${body}`;
}

export function canUseNativeShare(
  nav: ShareCapabilityNavigator | undefined = typeof navigator !== "undefined"
    ? navigator
    : undefined,
): boolean {
  return typeof nav?.share === "function";
}
