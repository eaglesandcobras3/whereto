/** Approximate geo coordinates for 30A town pages (TouristDestination schema). */
export const TOWN_GEO_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  "inlet-beach": { latitude: 30.282, longitude: -86.005 },
  "rosemary-beach": { latitude: 30.278, longitude: -86.012 },
  "alys-beach": { latitude: 30.276, longitude: -86.02 },
  seaside: { latitude: 30.321, longitude: -86.141 },
  watercolor: { latitude: 30.318, longitude: -86.128 },
  "seagrove-beach": { latitude: 30.315, longitude: -86.12 },
  "grayton-beach": { latitude: 30.335, longitude: -86.165 },
  "blue-mountain-beach": { latitude: 30.345, longitude: -86.175 },
  "santa-rosa-beach": { latitude: 30.372, longitude: -86.228 },
  "dune-allen-beach": { latitude: 30.385, longitude: -86.245 },
};

export function townGeoCoordinates(
  slug: string,
): { latitude: number; longitude: number } {
  return TOWN_GEO_COORDINATES[slug] ?? { latitude: 30.28, longitude: -86.02 };
}
