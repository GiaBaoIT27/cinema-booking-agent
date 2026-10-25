export type MovieStatusType = "SHOWING" | "UPCOMING" | "ENDED";
export type MovieAgeRating = "P" | "K" | "T13" | "T16" | "T18";

export interface MovieListItem {
  id: string;
  title: string;
  originalTitle?: string | null;
  durationMinutes: number;
  ageRating: MovieAgeRating | string;
  posterUrl: string | null;
  trailerUrl?: string | null;
  releaseDate: string | null;
  endDate?: string | null;
  status: MovieStatusType | string;
  createdAt?: string;
  formats?: string[];
  genres?: string[];
  rating?: number;
}

export interface MovieGenre {
  id: string;
  code?: string;
  name: string;
  slug?: string;
  description?: string | null;
}

export interface MovieDetail {
  id: string;
  title: string;
  originalTitle?: string | null;
  description: string | null;
  director: string | null;
  cast: string | null;
  durationMinutes: number;
  ageRating: MovieAgeRating | string;
  country: string | null;
  originalLanguage: string | null;
  revenueShareRatio?: number;
  trailerUrl: string | null;
  posterUrl: string | null;
  bannerUrl: string | null;
  releaseDate: string | null;
  endDate: string | null;
  status: MovieStatusType | string;
  distributor?: { id: string; name: string } | null;
  genres: MovieGenre[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MovieShowtimeItem {
  showtimeId: number;
  auditoriumName: string;
  projectionType: string;
  startTime: string;
  endTime: string;
}

export interface MovieShowtimesByCinema {
  cineplexId: number;
  cineplexName: string;
  showtimes: MovieShowtimeItem[];
}

/** Data của GET /movies/:id/showtimes?date=YYYY-MM-DD. */
export interface MovieShowtimesResponse {
  movieId: number;
  movieTitle: string;
  showtimesByCinema: MovieShowtimesByCinema[];
}

export interface MovieShowtimesParams {
  /** YYYY-MM-DD */
  date?: string;
}

export interface GetMoviesParams {
  search?: string;
  status?: MovieStatusType;
  genre_id?: number;
  page?: number;
  limit?: number;
  sort?: string;
}
