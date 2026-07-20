import "server-only";

import {
  IzakayaSearchRequest,
  SearchState,
  SearchStateSchema,
} from "@/ai-api/schemas/izakaya";
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

export async function findSearchResultById(id: string) {
  const search = await prisma.search.findUnique({
    where: {
      id,
    },
  });

  if (!search) {
    throw new Error(`${id}に紐付いたデータは存在しません`);
  }

  const parsedResult = SearchStateSchema.parse(search.result);

  return {
    id: search.id,
    station: search.station,
    people: search.people,
    budget: search.budget,
    summary: search.summary,
    result: parsedResult,
  };
}
