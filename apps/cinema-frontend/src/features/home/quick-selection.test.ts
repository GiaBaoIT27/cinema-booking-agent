import { expect, test } from "vitest";
import { homeCatalog } from "./fixtures";
import { EMPTY_QUICK_SELECTION, getQuickOptions, reduceQuickSelection, resolveQuickSelection } from "./quick-selection";

test("catalog IDs are unique and showtimes reference existing movies and cinemas", () => {
  for (const rows of [homeCatalog.movies, homeCatalog.cinemas, homeCatalog.showtimes]) {
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  }
  for (const row of homeCatalog.showtimes) {
    expect(homeCatalog.movies.some((movie) => movie.id === row.movieId)).toBe(true);
    expect(homeCatalog.cinemas.some((cinema) => cinema.id === row.cinemaId)).toBe(true);
  }
  expect(homeCatalog.cinemas.map((row) => [row.id, row.name])).toEqual([
    ["demo-central", "Demo Central"], ["demo-west", "Demo West"], ["demo-no-showtimes", "Demo Empty"],
  ]);
  expect(homeCatalog.showtimes.map((row) => [row.id, row.cinemaId, row.movieId, row.date, row.time])).toEqual([
    ["central-dune-1010-1800", "demo-central", "dune-part-two", "2026-10-10", "18:00"],
    ["central-dune-1010-2030", "demo-central", "dune-part-two", "2026-10-10", "20:30"],
    ["central-dune-1011-1800", "demo-central", "dune-part-two", "2026-10-11", "18:00"],
    ["central-afterlight-1011-1900", "demo-central", "afterlight", "2026-10-11", "19:00"],
    ["west-dune-1010-1900", "demo-west", "dune-part-two", "2026-10-10", "19:00"],
    ["west-afterlight-1011-2000", "demo-west", "afterlight", "2026-10-11", "20:00"],
  ]);
});

test("catalog keeps the agreed movie order and baseline metadata", () => {
  expect(homeCatalog.movies.map((movie) => [movie.id, movie.title, movie.releaseStatus, movie.genreId, movie.durationMinutes, movie.ageRating, movie.placeholderColor])).toEqual([
    ["dune-part-two", "Dune: Part Two", "now-showing", "sci-fi", 166, undefined, "#355c4d"],
    ["afterlight", "Afterlight", "now-showing", "drama", 124, undefined, "#6f7d73"],
    ["paper-moons", "Paper Moons", "now-showing", "romance", 112, undefined, "#8a6d62"],
    ["night-shift", "Night Shift", "now-showing", "thriller", 118, undefined, "#293c39"],
    ["red-horizon", "Red Horizon", "now-showing", "adventure", 132, undefined, "#76534a"],
    ["orbit-zero", "Orbit Zero", "upcoming", "sci-fi", 128, "13+", "#355c4d"],
    ["summer-letters", "Summer Letters", "upcoming", "drama", 123, "13+", "#355c4d"],
    ["skyward", "Skyward", "upcoming", "adventure", 135, "13+", "#355c4d"],
    ["quiet-city", "Quiet City", "upcoming", "drama", 107, "16+", "#355c4d"],
    ["last-signal", "Last Signal", "upcoming", "sci-fi", 118, "13+", "#355c4d"],
  ]);
});

test("quick options follow relationships and sort dates and times without selecting for the user", () => {
  expect(EMPTY_QUICK_SELECTION).toEqual({ cinemaId: null, movieId: null, date: null, showtimeId: null });
  expect(getQuickOptions(homeCatalog, EMPTY_QUICK_SELECTION).cinemas.map((row) => row.id)).toEqual(["demo-central", "demo-west", "demo-no-showtimes"]);
  const cinema = getQuickOptions(homeCatalog, { ...EMPTY_QUICK_SELECTION, cinemaId: "demo-central" });
  expect(cinema.movies.map((row) => row.id)).toEqual(["dune-part-two", "afterlight"]);
  expect(cinema.dates).toEqual([]);
  const movie = getQuickOptions(homeCatalog, { ...EMPTY_QUICK_SELECTION, cinemaId: "demo-central", movieId: "dune-part-two" });
  expect(movie.dates).toEqual(["2026-10-10", "2026-10-11"]);
  expect(movie.showtimes).toEqual([]);
  const day = getQuickOptions(homeCatalog, { cinemaId: "demo-central", movieId: "dune-part-two", date: "2026-10-10", showtimeId: null });
  expect(day.showtimes.map((row) => row.time)).toEqual(["18:00", "20:30"]);
});

test("changing an upstream field clears all downstream fields", () => {
  const full = { cinemaId: "demo-central", movieId: "dune-part-two", date: "2026-10-10", showtimeId: "central-dune-1010-1800" };
  expect(reduceQuickSelection(full, { type: "cinema", value: "demo-west" })).toEqual({ cinemaId: "demo-west", movieId: null, date: null, showtimeId: null });
  expect(reduceQuickSelection(full, { type: "movie", value: "afterlight" })).toEqual({ cinemaId: "demo-central", movieId: "afterlight", date: null, showtimeId: null });
  expect(reduceQuickSelection(full, { type: "date", value: "2026-10-11" })).toEqual({ cinemaId: "demo-central", movieId: "dune-part-two", date: "2026-10-11", showtimeId: null });
  expect(reduceQuickSelection(full, { type: "showtime", value: null })).toEqual({ ...full, showtimeId: null });
});

test("a showtime from another cinema or date cannot validate a tuple", () => {
  const full = { cinemaId: "demo-central", movieId: "dune-part-two", date: "2026-10-10", showtimeId: "central-dune-1010-1800" };
  expect(resolveQuickSelection(homeCatalog, full)?.id).toBe("central-dune-1010-1800");
  expect(resolveQuickSelection(homeCatalog, { ...full, cinemaId: "demo-west" })).toBeUndefined();
  expect(resolveQuickSelection(homeCatalog, { ...full, date: "2026-10-11" })).toBeUndefined();
  expect(resolveQuickSelection(homeCatalog, { ...full, movieId: null })).toBeUndefined();
  expect(getQuickOptions(homeCatalog, { ...EMPTY_QUICK_SELECTION, cinemaId: "demo-no-showtimes" }).movies).toEqual([]);
});

test("upcoming movies stay out of quick booking even if a schedule row is present", () => {
  const catalog = { ...homeCatalog, showtimes: [
    ...homeCatalog.showtimes,
    { id: "central-orbit-1010-1700", cinemaId: "demo-central", movieId: "orbit-zero", date: "2026-10-10", time: "17:00" },
  ] };
  expect(getQuickOptions(catalog, { ...EMPTY_QUICK_SELECTION, cinemaId: "demo-central" }).movies.map((row) => row.id)).toEqual(["dune-part-two", "afterlight"]);
  expect(resolveQuickSelection(catalog, { cinemaId: "demo-central", movieId: "orbit-zero", date: "2026-10-10", showtimeId: "central-orbit-1010-1700" })).toBeUndefined();
});
