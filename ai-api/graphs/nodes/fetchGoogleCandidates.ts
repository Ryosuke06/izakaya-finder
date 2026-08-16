import { searchGooglePlace } from "@/ai-api/libs/GooglePlace";
import { Candidate, SearchState } from "@/ai-api/schemas/izakaya";
import { RunnableConfig } from "@langchain/core/runnables";
import { normalizeGooglePlaces } from "./shared/normalizeGooglePlaces";

export async function fetchGoogleCandidate(
  state: SearchState,
  _config: RunnableConfig,
): Promise<{ candidates: Candidate[] }> {
  const textQuery = state.planPlaceSearch?.textQuery;
  if (!textQuery) {
    throw new Error("textQueryがありませんでした");
  }

  const response = await searchGooglePlace(textQuery);

  const candidatesGooglePlaces = normalizeGooglePlaces(response);

  return { candidates: candidatesGooglePlaces };
}
