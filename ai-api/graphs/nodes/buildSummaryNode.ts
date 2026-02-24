import { RunnableConfig } from "@langchain/core/runnables";
import { SearchState } from "@/ai-api/schemas/izakaya";

export function buildSummary(
  state: SearchState,
  _config: RunnableConfig,
): { summary: string } {
  return { summary: `${state.ranked.length}件のサーチ結果をお伝えします。` };
}
