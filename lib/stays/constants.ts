export const STAYS_HUB_PATH = "/stays" as const;
export const LIST_YOUR_RENTALS_PATH = "/list-your-rentals" as const;

export const RENTAL_INDEX_MIN_UNIQUE_TEXT = 80;
export const RENTAL_TOWN_HUB_MIN_PROPERTIES = 3;
export const RENTAL_STALE_DAYS = 30;

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  house: "House",
  condo: "Condo",
  townhome: "Townhome",
  cottage: "Cottage",
  villa: "Villa",
  apartment: "Apartment",
  other: "Other",
};

export function staysPropertyPath(slug: string): string {
  return `/stays/${encodeURIComponent(slug.trim())}`;
}

export function staysTownPath(townSlug: string): string {
  return `/stays/town/${encodeURIComponent(townSlug.trim())}`;
}

export function staysBookingGoPath(propertyId: string): string {
  return `/api/stays/go/${encodeURIComponent(propertyId)}`;
}
