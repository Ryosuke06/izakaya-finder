"use server";

import {
  createInitialSearchState,
  graph,
} from "@/ai-api/graphs/izakayaSearchGraph";
import { IzakayaSearchRequestSchema } from "@/ai-api/schemas/izakaya";

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

  await graph.invoke(initialState);
}
