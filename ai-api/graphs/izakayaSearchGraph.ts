import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import {
  Candidate,
  IzakayaSearchRequest,
  PlanPlaceSearchNode,
  RecommendationItem,
  SearchState,
} from "../schemas/izakaya";
import { fetchCandidates } from "./nodes/fetchCandidatesNode";
import { rankCandidates } from "./nodes/rankCandidatesNode";
import { buildSummary } from "./nodes/buildSummaryNode";
import { planPlacesSearch } from "./nodes/planPlacesSearch";
import { fetchGoogleCandidate } from "./nodes/fetchGoogleCandidates";

export const StateAnnotation = Annotation.Root({
  request: Annotation<IzakayaSearchRequest>(),
  planPlaceSearch: Annotation<PlanPlaceSearchNode | null>(),
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
    planPlaceSearch: null,
    candidates: [],
    ranked: [],
    summary: "",
    traceId: undefined,
    traceUrl: undefined,
  };
}

export const graph = new StateGraph(StateAnnotation)
  .addNode("fetchPlacesSearch", planPlacesSearch)
  .addNode("fetchGoogleCandidate", fetchGoogleCandidate)
  .addNode("rankCandidates", rankCandidates)
  .addNode("buildSummary", buildSummary)
  .addEdge(START, "fetchPlacesSearch")
  .addEdge("fetchPlacesSearch", "fetchGoogleCandidate")
  .addEdge("fetchGoogleCandidate", "rankCandidates")
  .addEdge("rankCandidates", "buildSummary")
  .addEdge("buildSummary", END)
  .compile();
