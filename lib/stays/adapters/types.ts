/**
 * Generic rental source adapter — iCal/API later; inventory is admin/manual for MVP.
 */
export type AdapterProperty = {
  externalId: string;
  title: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  sleeps?: number;
  description?: string;
  bookingUrl?: string;
  imageUrls?: string[];
  lat?: number;
  lng?: number;
  raw?: Record<string, unknown>;
};

export type AdapterAvailabilityDay = {
  date: string; // YYYY-MM-DD
  isAvailable: boolean;
};

export interface RentalSourceAdapter {
  readonly sourceType: "manual" | "ical" | "api";
  listProperties(): Promise<AdapterProperty[]>;
  listAvailability?(externalId: string): Promise<AdapterAvailabilityDay[]>;
}
