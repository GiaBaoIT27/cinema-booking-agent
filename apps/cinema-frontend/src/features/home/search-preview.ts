import type { Movie, SearchQuery } from "./model";
export type SearchPreview =
  | { status: "closed" }
  | { status: "loading"; requestId: number; submitted: SearchQuery }
  | { status: "error"; requestId: number; submitted: SearchQuery }
  | {
      status: "ready";
      requestId: number;
      submitted: SearchQuery;
      movies: Movie[];
    };
export type SearchAction =
  | { type: "start"; requestId: number; submitted: SearchQuery }
  | { type: "resolve"; requestId: number; movies: Movie[] }
  | { type: "reject"; requestId: number }
  | { type: "close" };
export function reduceSearchPreview(
  state: SearchPreview,
  action: SearchAction,
): SearchPreview {
  if (action.type === "close") return { status: "closed" };
  if (action.type === "start")
    return {
      status: "loading",
      requestId: action.requestId,
      submitted: { ...action.submitted },
    };
  if (state.status !== "loading" || state.requestId !== action.requestId)
    return state;
  if (action.type === "resolve")
    return { ...state, status: "ready", movies: action.movies };
  return { ...state, status: "error" };
}
export function clearSearchQuery(query: SearchQuery): SearchQuery {
  return { query: "", status: query.status, genreId: null };
}
