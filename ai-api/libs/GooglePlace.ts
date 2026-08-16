import {
  GooglePlaceTextSearchResponse,
  GooglePlaceTextSearchResponseSchema,
} from "../schemas/izakaya";

export async function searchGooglePlace(
  textQuery: string,
): Promise<GooglePlaceTextSearchResponse> {
  const url = "https://places.googleapis.com/v1/places:searchText";
  const googleMapApiKey = process.env.GOOGLE_MAP_API_KEY;
  if (!googleMapApiKey) {
    throw new Error("GoogleMapAPIキーが見つかりません。");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
      "X-Goog-Api-Key": googleMapApiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.primaryType,places.types,places.rating,places.userRatingCount,places.priceLevel,places.businessStatus,places.websiteUri",
    },
    body: JSON.stringify({ textQuery: textQuery }),
  });
  if (!response.ok) {
    throw new Error(`Google Place API error: ${response.status}`);
  }

  const result = await response.json();
  return GooglePlaceTextSearchResponseSchema.parse(result);
}
