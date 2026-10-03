import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { homeCatalog } from "../../../../src/features/home/fixtures";
import { createFixtureAdapter } from "../../../../src/features/home/fixture-adapter";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("search combines normalized title, status, and genre while preserving catalog order", async () => {
  const adapter = createFixtureAdapter(homeCatalog);
  const result = adapter.search({
    query: "  DUNE ",
    status: "now-showing",
    genreId: "sci-fi",
  });
  await vi.advanceTimersByTimeAsync(300);
  expect((await result).map((movie) => movie.id)).toEqual(["dune-part-two"]);
  const empty = adapter.search({
    query: "missing",
    status: "now-showing",
    genreId: null,
  });
  await vi.advanceTimersByTimeAsync(300);
  expect(await empty).toEqual([]);
  const upcoming = adapter.search({
    query: "",
    status: "upcoming",
    genreId: null,
  });
  await vi.advanceTimersByTimeAsync(300);
  expect((await upcoming).map((movie) => movie.id)).toEqual([
    "orbit-zero",
    "summer-letters",
    "skyward",
    "quiet-city",
    "last-signal",
  ]);
});

test("search remains pending until the configured delay completes", async () => {
  const adapter = createFixtureAdapter(homeCatalog);
  const settled = vi.fn();
  const result = adapter
    .search({ query: "Dune", status: "now-showing", genreId: null })
    .then(settled);
  await vi.advanceTimersByTimeAsync(299);
  expect(settled).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  await result;
  expect(settled).toHaveBeenCalledOnce();
});

test("abort rejects with AbortError and clears the pending timer", async () => {
  const adapter = createFixtureAdapter(homeCatalog);
  const controller = new AbortController();
  const result = adapter.search(
    { query: "Dune", status: "now-showing", genreId: null },
    controller.signal,
  );
  controller.abort();
  await expect(result).rejects.toMatchObject({ name: "AbortError" });
  expect(vi.getTimerCount()).toBe(0);
});

test("error-once is consumed by the first completed request, then retry succeeds", async () => {
  const adapter = createFixtureAdapter(homeCatalog, { scenario: "error-once" });
  const query = {
    query: "Afterlight",
    status: "now-showing" as const,
    genreId: null,
  };
  const canceled = new AbortController();
  const aborted = adapter.search(query, canceled.signal);
  canceled.abort();
  await expect(aborted).rejects.toMatchObject({ name: "AbortError" });
  const failed = adapter.search(query);
  const failure = expect(failed).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(300);
  await failure;
  const retry = adapter.search(query);
  await vi.advanceTimersByTimeAsync(300);
  expect((await retry).map((movie) => movie.id)).toEqual(["afterlight"]);
});
