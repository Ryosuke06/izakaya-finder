import {
  Candidate,
  CandidateSchema,
  GooglePlaceTextSearchResponse,
} from "@/ai-api/schemas/izakaya";

export function normalizeGooglePlaces(
  candidates: GooglePlaceTextSearchResponse,
): Candidate[] {
  const searchArray: Candidate[] = [];
  const seenPlaceIds = new Set<string>();
  for (let i = 0; i < candidates.places.length; i++) {
    if (candidates.places[i].businessStatus === "CLOSED_PERMANENTLY") {
      continue;
    }
    // ここで住所がない場合を省いています。将来的には消してもいいかも？？
    if (!candidates.places[i].formattedAddress) {
      continue;
    }

    if (seenPlaceIds.has(candidates.places[i].id)) {
      continue;
    }
    seenPlaceIds.add(candidates.places[i].id);

    const resultSort = {
      placeId: candidates.places[i].id,
      name: candidates.places[i].displayName.text,
      address: candidates.places[i].formattedAddress,
      lat: candidates.places[i].location.latitude,
      lng: candidates.places[i].location.longitude,
      rating: candidates.places[i].rating,
      userRatingsTotal: candidates.places[i].userRatingCount,
      priceLevel: candidates.places[i].priceLevel,
      website: candidates.places[i].websiteUri,
      googleMapsUri: candidates.places[i].googleMapsUri,
      businessStatus: candidates.places[i].businessStatus,
    };
    let resultSortPars = CandidateSchema.parse(resultSort);
    searchArray.push(resultSortPars);
  }

  return searchArray;
}
