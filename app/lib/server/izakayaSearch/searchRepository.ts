import "server-only";

import { IzakayaSearchRequest, SearchState } from "@/ai-api/schemas/izakaya";
import { prisma } from "../../db";

export async function createSearchRecord(
  request: IzakayaSearchRequest,
  result: SearchState,
) {
  return prisma.search.create({
    data: {
      station:
        request.area.mode === "station_input" ? request.area.station : "",
      people: request.people,
      budget: request.budget,
      allYouCanDrink: request.allYouCanDrink,
      beerRequired: request.beerRequired,
      moodTags: request.moodTags,
      preferences: request.preferences,
      request: request,
      result,
      summary: result.summary,
    },
  });
}
