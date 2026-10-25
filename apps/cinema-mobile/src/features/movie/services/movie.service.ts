import { apiClient } from "@/lib/api-client";
import { toPaginated, type Paginated } from "@/lib/pagination";
import type {
  GetMoviesParams,
  MovieDetail,
  MovieListItem,
  MovieShowtimesParams,
  MovieShowtimesResponse,
} from "../types/movie.types";

export const movieService = {
  /** GET /api/v1/movies */
  async getMovies(
    params: GetMoviesParams = {},
    signal?: AbortSignal,
  ): Promise<Paginated<MovieListItem>> {
    const raw = await apiClient.get<MovieListItem[]>("/movies", {
      params: { ...params },
      signal,
    });
    return toPaginated(raw, { page: params.page, limit: params.limit });
  },

  /** GET /api/v1/movies/:id */
  getMovieById(id: string, signal?: AbortSignal): Promise<MovieDetail> {
    return apiClient.get<MovieDetail>(`/movies/${id}`, { signal });
  },

  /** GET /api/v1/movies/:id/showtimes?date=YYYY-MM-DD */
  getMovieShowtimes(
    id: string,
    params: MovieShowtimesParams = {},
    signal?: AbortSignal,
  ): Promise<MovieShowtimesResponse> {
    return apiClient.get<MovieShowtimesResponse>(`/movies/${id}/showtimes`, {
      params: { ...params },
      signal,
    });
  },
};
