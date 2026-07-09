import { getSiteUrl } from "@/lib/site-url";

export type FeedbackPageHrefOptions = {
  /** Reserved for future use; feedback links currently prefill only from a relative path. */
  title?: string | null;
};

/**
 * Stable query key: relative path (`/business/foo`, `/town/rosemary-beach`, `/guide/bar`).
 * Keep this narrow so the feedback page can remain a simple static shell with optional
 * client-side prefill based on one path parameter.
 */
export function feedbackPageHref(
  relativePath?: string | null,
  options?: FeedbackPageHrefOptions,
): string {
  const raw = relativePath?.trim();

  if (!raw) {
    return "/feedback";
  }

  const path = raw.startsWith("/") ? raw : `/${raw}`;
  if (!isSafeInternalPath(path)) {
    return "/feedback";
  }
  const qs = new URLSearchParams();
  qs.set("p", path);
  return `/feedback?${qs.toString()}`;
}

function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith("/") || path.includes("..") || path.includes("//")) return false;
  if (/^\/\/|^https?:/i.test(path)) return false;
  return path.length <= 400;
}
