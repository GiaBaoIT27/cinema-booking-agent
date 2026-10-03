import type { Catalog, QuickOptions, QuickSelection, Showtime } from "./model";

export const EMPTY_QUICK_SELECTION: QuickSelection = {
  cinemaId: null,
  movieId: null,
  date: null,
  showtimeId: null,
};
export type QuickAction = {
  type: "cinema" | "movie" | "date" | "showtime";
  value: string | null;
};
export function reduceQuickSelection(
  state: QuickSelection,
  action: QuickAction,
): QuickSelection {
  switch (action.type) {
    case "cinema":
      return {
        cinemaId: action.value,
        movieId: null,
        date: null,
        showtimeId: null,
      };
    case "movie":
      return {
        cinemaId: state.cinemaId,
        movieId: action.value,
        date: null,
        showtimeId: null,
      };
    case "date":
      return {
        cinemaId: state.cinemaId,
        movieId: state.movieId,
        date: action.value,
        showtimeId: null,
      };
    case "showtime":
      return { ...state, showtimeId: action.value };
  }
}

export function getQuickOptions(
  catalog: Catalog,
  selection: QuickSelection,
): QuickOptions {
  const cinemaShowtimes = selection.cinemaId
    ? catalog.showtimes.filter((row) => row.cinemaId === selection.cinemaId)
    : [];
  const eligibleIds = new Set(cinemaShowtimes.map((row) => row.movieId));
  const movies = catalog.movies.filter(
    (movie) =>
      movie.releaseStatus === "now-showing" && eligibleIds.has(movie.id),
  );
  const selectedMovieIsEligible = movies.some(
    (movie) => movie.id === selection.movieId,
  );
  const movieShowtimes = selectedMovieIsEligible
    ? cinemaShowtimes.filter((row) => row.movieId === selection.movieId)
    : [];
  const dates = [...new Set(movieShowtimes.map((row) => row.date))].sort();
  const showtimes =
    selection.date && dates.includes(selection.date)
      ? movieShowtimes
          .filter((row) => row.date === selection.date)
          .sort((a, b) => a.time.localeCompare(b.time))
      : [];
  return { cinemas: catalog.cinemas, movies, dates, showtimes };
}

export function resolveQuickSelection(
  catalog: Catalog,
  selection: QuickSelection,
): Showtime | undefined {
  if (
    !selection.cinemaId ||
    !selection.movieId ||
    !selection.date ||
    !selection.showtimeId
  )
    return undefined;
  return catalog.showtimes.find(
    (row) =>
      row.id === selection.showtimeId &&
      row.cinemaId === selection.cinemaId &&
      row.movieId === selection.movieId &&
      row.date === selection.date &&
      catalog.movies.some(
        (movie) =>
          movie.id === row.movieId && movie.releaseStatus === "now-showing",
      ),
  );
}
