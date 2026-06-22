import { getSiteUrl } from "@/lib/site-url";

export type FeedbackPageHrefOptions = {
  /** Shown alongside the URL line in inbox triage (max 200 chars); query key `title`. */
  title?: string | null;
};

/**
 * Stable query key: relative path (`/business/foo`, `/rosemary-beach`, `/guide/bar`).
 * Pass `title` only when `relativePath` is omitted if you truly want inbox context without `p=` (weak).
 */
export function feedbackPageHref(
  relativePath?: string | null,
  options?: FeedbackPageHrefOptions,
): string {
  const trimmedTitle = options?.title?.trim().slice(0, 200) ?? "";
  const raw = relativePath?.trim();

  const qs = new URLSearchParams();
  if (trimmedTitle) qs.set("title", trimmedTitle);

  if (!raw) {
    const q = qs.toString();
    return q ? `/feedback?${q}` : "/feedback";
  }

  const path = raw.startsWith("/") ? raw : `/${raw}`;
  if (!isSafeInternalPath(path)) {
    const qFallback = trimmedTitle ? new URLSearchParams({ title: trimmedTitle }).toString() : "";
    return qFallback ? `/feedback?${qFallback}` : "/feedback";
  }
  qs.set("p", path);
  return `/feedback?${qs.toString()}`;
}

/**
 * Returns a full HTTPS line suitable for `listing_context` (email + triage inbox).
 */
export function prefilledListingContextLine(
  searchParams: Record<string, string | string[] | undefined>,
): string | undefined {
  const pick = (key: string): string | undefined => {
    const v = searchParams[key];
    if (typeof v === "string") return v;
    if (Array.isArray(v) && v[0]) return v[0];
    return undefined;
  };

  const site = getSiteUrl().replace(/\/$/, "");
  const titleOnly = pick("title")?.trim().slice(0, 200);
  let path: string | undefined;

  const p = pick("p") ?? pick("about") ?? pick("ref");
  if (p?.trim()) {
    const trimmed = p.trim();
    path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  } else if (pick("business")?.trim()) {
    path = `/business/${encodeURIComponent(pick("business")!.trim())}`;
  } else if (pick("town")?.trim()) {
    path = `/${encodeURIComponent(pick("town")!.trim())}`;
  } else if (pick("guide")?.trim()) {
    path = `/guide/${encodeURIComponent(pick("guide")!.trim())}`;
  } else if (pick("area")?.trim()) {
    path = `/area/${encodeURIComponent(pick("area")!.trim())}`;
  }

  if (!path) return titleOnly;
  if (!isSafeInternalPath(path)) return titleOnly;

  const urlLine = `${site}${path}`;
  if (titleOnly) return `${titleOnly}: ${urlLine}`;
  return urlLine;
}

function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith("/") || path.includes("..") || path.includes("//")) return false;
  if (/^\/\/|^https?:/i.test(path)) return false;
  return path.length <= 400;
}
