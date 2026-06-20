"use server";

import {
  createInitialSearchState,
  graph,
} from "@/ai-api/graphs/izakayaSearchGraph";
import {
  IzakayaSearchRequestSchema,
  SearchState,
} from "@/ai-api/schemas/izakaya";
import { prisma } from "../lib/db";
import { redirect } from "next/navigation";

export async function searchIzakaya(formData: FormData) {
  const payload = {
    area: {
      mode: "station_input",
      station: String(formData.get("station") ?? ""),
    },
    people: Number(formData.get("people")),
    budget: String(formData.get("budget")),
    allYouCanDrink: formData.get("isDrink") === "true",
    beerRequired: formData.get("isBeer") === "true",
    moodTags: [String(formData.get("mood") ?? "")],
    preferences: String(formData.get("preferences")),
  };

  const parsed = IzakayaSearchRequestSchema.safeParse(payload);
  if (!parsed.success) {
    console.error("Invalid izakaya search request", parsed.error.flatten());
    return;
  }

  const initialState = createInitialSearchState(parsed.data);

  const result: SearchState = await graph.invoke(initialState);

  const search = await prisma.search.create({
    data: {
      station:
        parsed.data.area.mode === "station_input"
          ? parsed.data.area.station
          : "",
      people: parsed.data.people,
      budget: parsed.data.budget,
      allYouCanDrink: parsed.data.allYouCanDrink,
      beerRequired: parsed.data.beerRequired,
      moodTags: parsed.data.moodTags,
      preferences: parsed.data.preferences,
      request: parsed.data,
      result,
      summary: result.summary,
    },
  });

  redirect(`/results/${search.id}`);
}
