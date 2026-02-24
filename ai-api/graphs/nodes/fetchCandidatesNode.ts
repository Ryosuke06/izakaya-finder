import { Candidate, SearchState } from "@/ai-api/schemas/izakaya";
import { RunnableConfig } from "@langchain/core/runnables";

export function fetchCandidates(
  state: SearchState,
  _config: RunnableConfig,
): { candidates: Candidate[] } {
  return {
    candidates: [
      {
        placeId: "",
        name: "",
        address: "",
        lat: 0,
        lng: 0,
        rating: 1,
        userRatingsTotal: 0,
        priceLevel: 6000,
        website: "",
        googleMapsUrl: "",
        editorialSummary: undefined,
        reviewsText: [""],
      },
    ],
  };
}
