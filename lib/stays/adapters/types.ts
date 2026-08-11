/**
 * Generic rental source adapter — implement CSV/iCal/API without multi-PMS sprawl.
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
  readonly sourceType: "manual" | "csv" | "ical" | "api";
  listProperties(): Promise<AdapterProperty[]>;
  listAvailability?(externalId: string): Promise<AdapterAvailabilityDay[]>;
}
