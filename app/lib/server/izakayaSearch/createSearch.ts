import "server-only";

import {
  createInitialSearchState,
  graph,
} from "@/ai-api/graphs/izakayaSearchGraph";
import { SearchState } from "@/ai-api/schemas/izakaya";
import { parseIzakayaSearchForm } from "./formSchema";
import { createSearchRecord } from "./searchRepository";

export async function createIzakayaFromForm(formData: FormData) {
  const parsed = parseIzakayaSearchForm(formData);
  if (!parsed.ok) {
    throw new Error("フォームの変換がうまくいきませんでした");
  }

  const initialState = createInitialSearchState(parsed.data);

  const result: SearchState = await graph.invoke(initialState);

  return createSearchRecord(parsed.data, result);
}
