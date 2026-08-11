import { externalWebsiteHref } from "@/lib/urls/external-website-href";

export type BookingUrlParts = {
  bookingUrl?: string | null;
  template?: string | null;
  baseUrl?: string | null;
  externalId?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
};

/** Fill partner booking URL template placeholders. */
export function buildPartnerBookingUrl(parts: BookingUrlParts): string | null {
  const checkIn = parts.checkIn?.trim() || "";
  const checkOut = parts.checkOut?.trim() || "";
  const guests = parts.guests != null && parts.guests > 0 ? String(parts.guests) : "";
  const externalId = parts.externalId?.trim() || "";

  const template = parts.template?.trim();
  if (template) {
    const filled = template
      .replaceAll("{check_in}", encodeURIComponent(checkIn))
      .replaceAll("{check_out}", encodeURIComponent(checkOut))
      .replaceAll("{guests}", encodeURIComponent(guests))
      .replaceAll("{external_id}", encodeURIComponent(externalId));
    return externalWebsiteHref(filled);
  }

  const propertyUrl = externalWebsiteHref(parts.bookingUrl);
  if (propertyUrl) {
    if (!checkIn && !checkOut && !guests) return propertyUrl;
    try {
      const u = new URL(propertyUrl);
      if (checkIn) u.searchParams.set("check_in", checkIn);
      if (checkOut) u.searchParams.set("check_out", checkOut);
      if (guests) u.searchParams.set("guests", guests);
      return u.toString();
    } catch {
      return propertyUrl;
    }
  }

  return externalWebsiteHref(parts.baseUrl);
}

export function bookingDestinationHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Ensure destination host is on the partner allowlist (empty allowlist = any https host). */
export function isBookingHostAllowed(destinationUrl: string, allowHosts: string[] | null | undefined): boolean {
  const host = bookingDestinationHost(destinationUrl);
  if (!host) return false;
  const list = (allowHosts ?? []).map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return true;
  return list.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}
