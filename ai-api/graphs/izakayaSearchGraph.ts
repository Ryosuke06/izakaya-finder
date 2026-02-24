import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import {
  Candidate,
  IzakayaSearchRequest,
  RecommendationItem,
  SearchState,
} from "../schemas/izakaya";
import { fetchCandidates } from "./nodes/fetchCandidatesNode";
import { rankCandidates } from "./nodes/rankCandidatesNode";
import { buildSummary } from "./nodes/buildSummaryNode";

export const StateAnnotation = Annotation.Root({
  request: Annotation<IzakayaSearchRequest>(),
  candidates: Annotation<Candidate[]>(),
  ranked: Annotation<RecommendationItem[]>(),
  summary: Annotation<string>(),
  traceId: Annotation<string | undefined>(),
  traceUrl: Annotation<string | undefined>(),
});

export function createInitialSearchState(
  request: IzakayaSearchRequest,
): SearchState {
  return {
    request: request,
    candidates: [],
    ranked: [],
    summary: "",
    traceId: undefined,
    traceUrl: undefined,
  };
}

export const graph = new StateGraph(StateAnnotation)
  .addNode("fetchCandidates", fetchCandidates)
  .addNode("rankCandidates", rankCandidates)
  .addNode("buildSummary", buildSummary)
  .addEdge(START, "fetchCandidates")
  .addEdge("fetchCandidates", "rankCandidates")
  .addEdge("rankCandidates", "buildSummary")
  .addEdge("buildSummary", END)
  .compile();

// await graph.invoke({messages: [{role: "user", context: Message}] });
