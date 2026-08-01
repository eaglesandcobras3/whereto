import posthog from "posthog-js";
import { captureEvent } from "@/lib/analytics/gtag-runner";
import type { PageShareMethod, PageShareType } from "@/lib/share/page-share";

export type PageShareAnalyticsContext = {
  pageType: PageShareType;
  pageId: string | null;
  pageTitle: string;
  pageSlug: string;
  pageUrl: string;
};

export type DeviceType = "mobile" | "tablet" | "desktop";

export function getDeviceType(
  userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "",
): DeviceType {
  if (/iPad|Tablet|PlayBook|Silk/i.test(userAgent)) return "tablet";
  if (/Mobi|Android|iPhone|iPod|IEMobile|BlackBerry/i.test(userAgent)) {
    return "mobile";
  }
  return "desktop";
}

function resolveUserId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const id = posthog.get_distinct_id?.();
    return typeof id === "string" && id.length > 0 ? id : undefined;
  } catch {
    return undefined;
  }
}

/** Common properties for share_button_clicked / share_completed. */
export function buildShareEventProperties(
  ctx: PageShareAnalyticsContext,
  shareMethod?: PageShareMethod,
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    page_type: ctx.pageType,
    page_id: ctx.pageId,
    page_title: ctx.pageTitle,
    page_slug: ctx.pageSlug,
    page_url: ctx.pageUrl,
    device_type: getDeviceType(),
    referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
  };

  const userId = resolveUserId();
  if (userId) props.user_id = userId;
  if (shareMethod) props.share_method = shareMethod;

  return props;
}

/**
 * Fired when the user clicks Share.
 * Intentionally omits share_method so open-intent is distinct from the chosen method
 * (method is recorded on share_completed).
 */
export function trackShareButtonClicked(ctx: PageShareAnalyticsContext): void {
  captureEvent("share_button_clicked", buildShareEventProperties(ctx));
}

export function trackShareCompleted(
  ctx: PageShareAnalyticsContext,
  shareMethod: PageShareMethod,
): void {
  captureEvent("share_completed", buildShareEventProperties(ctx, shareMethod));
}

export function trackShareCancelled(ctx: PageShareAnalyticsContext): void {
  captureEvent("share_cancelled", {
    page_type: ctx.pageType,
    page_id: ctx.pageId,
    page_title: ctx.pageTitle,
    page_url: ctx.pageUrl,
  });
}
