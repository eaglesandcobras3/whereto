export type CensusMatch = {
  lat: number;
  lng: number;
  matchedAddress: string;
};

type CensusResponse = {
  result?: {
    addressMatches?: Array<{
      matchedAddress?: string;
      coordinates?: { x?: number; y?: number };
    }>;
  };
};

export function parseCensusGeocodeResponse(payload: unknown): CensusMatch | null {
  const matches = (payload as CensusResponse).result?.addressMatches ?? [];
  const first = matches[0];
  const lng = first?.coordinates?.x;
  const lat = first?.coordinates?.y;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    matchedAddress: first.matchedAddress?.trim() || "",
  };
}

export function censusAddressQuery(location: string, town: string): string {
  const loc = location.trim();
  if (!loc) return "";
  const hasState = /\bFL\b|\bFlorida\b/i.test(loc);
  if (hasState) return loc;
  const townPart = town.trim();
  if (townPart && !loc.toLowerCase().includes(townPart.toLowerCase())) {
    return `${loc}, ${townPart}, FL`;
  }
  return `${loc}, FL`;
}

export function shouldGeocodeRow(row: {
  is_storefront?: string;
  is_service_business?: string;
  location?: string;
  map_lat?: string;
  map_lng?: string;
  audit_status?: string;
}, overwrite: boolean): boolean {
  if (row.is_storefront !== "true") return false;
  if (!row.location?.trim()) return false;
  const status = row.audit_status?.trim();
  if (status === "cannot_confirm" || status === "closed" || status === "error") return false;
  if (overwrite) return true;
  return !row.map_lat?.trim() || !row.map_lng?.trim();
}
