const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

export type TextSearchResult = {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    types?: string[];
  }>;
};

export async function googleTextSearch(
  apiKey: string,
  textQuery: string,
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
): Promise<TextSearchResult> {
  const res = await fetch(TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.types",
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount: 20,
      locationBias: {
        circle: {
          center: { latitude: centerLat, longitude: centerLng },
          radius: radiusMeters,
        },
      },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Places searchText ${res.status}: ${t}`);
  }
  return (await res.json()) as TextSearchResult;
}

export type PlaceDetails = {
  id?: string;
  types?: string[];
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  regularOpeningHours?: unknown;
  photos?: Array<{ name?: string }>;
  businessStatus?: string;
};

export async function googlePlaceDetails(
  apiKey: string,
  placeResourceName: string,
): Promise<PlaceDetails> {
  const url = `https://places.googleapis.com/v1/${placeResourceName}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "id,types,displayName,formattedAddress,nationalPhoneNumber,websiteUri,location,rating,userRatingCount,priceLevel,regularOpeningHours,photos,businessStatus",
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Place details ${res.status}: ${t}`);
  }
  return (await res.json()) as PlaceDetails;
}

/** Places API returns resource name like `places/ChIJ...` */
export function placeIdToResource(placeId: string): string {
  return placeId.startsWith("places/") ? placeId : `places/${placeId}`;
}
