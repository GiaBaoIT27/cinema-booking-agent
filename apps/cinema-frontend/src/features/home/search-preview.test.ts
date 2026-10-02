import { expect, test } from "vitest";
import { clearSearchQuery, reduceSearchPreview } from "./search-preview";
const submitted = {
  query: "Dune",
  status: "now-showing",
  genreId: null,
} as const;
test("start captures an independent submission snapshot", () => {
  const query = { ...submitted, query: String(submitted.query) };
  const state = reduceSearchPreview(
    { status: "closed" },
    { type: "start", requestId: 1, submitted: query },
  );
  query.query = "Changed";
  expect(state).toEqual({ status: "loading", requestId: 1, submitted });
});
test("completion after close cannot reopen preview", () => {
  const closed = reduceSearchPreview(
    { status: "loading", requestId: 1, submitted },
    { type: "close" },
  );
  expect(
    reduceSearchPreview(closed, { type: "resolve", requestId: 1, movies: [] }),
  ).toEqual({ status: "closed" });
});
test("old resolution and rejection cannot replace a newer request", () => {
  const state = { status: "loading", requestId: 2, submitted } as const;
  expect(
    reduceSearchPreview(state, { type: "resolve", requestId: 1, movies: [] }),
  ).toEqual(state);
  expect(reduceSearchPreview(state, { type: "reject", requestId: 1 })).toEqual(
    state,
  );
  expect(
    reduceSearchPreview(state, { type: "resolve", requestId: 2, movies: [] }),
  ).toEqual({ ...state, status: "ready", movies: [] });
});
test("error keeps submitted context and ignores late completion", () => {
  const error = reduceSearchPreview(
    { status: "loading", requestId: 1, submitted },
    { type: "reject", requestId: 1 },
  );
  expect(error).toEqual({ status: "error", requestId: 1, submitted });
  expect(
    reduceSearchPreview(error, { type: "resolve", requestId: 1, movies: [] }),
  ).toEqual(error);
});
test("clear query and genre preserves release context", () => {
  expect(
    clearSearchQuery({
      query: "missing",
      status: "upcoming",
      genreId: "drama",
    }),
  ).toEqual({ query: "", status: "upcoming", genreId: null });
});
