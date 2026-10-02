export type ReleaseStatus = "now-showing" | "upcoming";
export type GenreId = "sci-fi" | "drama" | "romance" | "thriller" | "adventure";
export type Movie = {
  id: string;
  title: string;
  releaseStatus: ReleaseStatus;
  genreId: GenreId;
  durationMinutes: number;
  ageRating?: string;
  placeholderColor: string;
};
export type Cinema = { id: string; name: string };
export type Showtime = {
  id: string;
  cinemaId: string;
  movieId: string;
  date: string;
  time: string;
};
export type Catalog = {
  movies: Movie[];
  cinemas: Cinema[];
  showtimes: Showtime[];
};
export type SearchQuery = {
  query: string;
  status: ReleaseStatus;
  genreId: GenreId | null;
};
export type QuickSelection = {
  cinemaId: string | null;
  movieId: string | null;
  date: string | null;
  showtimeId: string | null;
};
export type QuickOptions = {
  cinemas: Cinema[];
  movies: Movie[];
  dates: string[];
  showtimes: Showtime[];
};
export type FixtureScenario = "ready" | "error-once";
export type CatalogAdapter = {
  search(query: SearchQuery, signal?: AbortSignal): Promise<Movie[]>;
  getQuickOptions(selection: QuickSelection): QuickOptions;
  resolveQuickSelection(selection: QuickSelection): Showtime | undefined;
};
export type HomeIntent =
  | { kind: "cinema-directory" | "my-tickets" | "login" | "ai-assistant" }
  | { kind: "movie-details"; movieId: string }
  | { kind: "seat-selection"; showtime: Showtime };
