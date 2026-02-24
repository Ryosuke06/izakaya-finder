import {
  Candidate,
  RecommendationItem,
  SearchState,
} from "@/ai-api/schemas/izakaya";
import { RunnableConfig } from "@langchain/core/runnables";

export function rankCandidates(
  state: SearchState,
  _config: RunnableConfig,
): { ranked: RecommendationItem[] } {
  const rank = [];
  for (let i = 0; i < state.candidates.length; i++) {
    rank.push;
  }
  return {
    ranked: [
      {
        placeId: "",
        name: "",
        address: "",
        score: 0,
        reasons: [""],
        evidence: {
          allYouCanDrinkHit: undefined,
          beerHit: undefined,
        },
        meta: {
          rating: undefined,
          userRatingsTotal: undefined,
          priceLevel: undefined,
          googleMapsUrl: undefined,
          website: undefined,
        },
      },
    ],
  };
}
