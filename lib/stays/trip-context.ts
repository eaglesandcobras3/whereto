/**
 * Future trip-planning spine — shared dates/town context across marketplace categories.
 * Do not force rentals, experiences, services, and events into one table.
 */
export type TripContext = {
  townId?: string | null;
  townSlug?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
};

export type MarketplaceSearchDocument = {
  entityType: "rental" | "experience" | "service" | "event" | "business";
  entityId: string;
  title: string;
  slug: string;
  townId?: string | null;
  excerpt?: string | null;
  searchTerms?: string | null;
  /** Scheduling differs by type — keep type-specific fields elsewhere. */
};

/**
 * Planned flow (Phase 6+):
 * Rental search → Trip dates and town → Direct booking click → Saved trip →
 * Events, experiences and services
 */
export function tripContextFromSearch(input: {
  townId?: string | null;
  townSlug?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
}): TripContext {
  return {
    townId: input.townId ?? null,
    townSlug: input.townSlug ?? null,
    checkIn: input.checkIn ?? null,
    checkOut: input.checkOut ?? null,
    guests: input.guests ?? null,
  };
}
