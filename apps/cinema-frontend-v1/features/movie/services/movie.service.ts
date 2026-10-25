import { apiClient } from "@/lib/api-client";
import type {
  MovieListItem,
  MovieDetail,
  GetMoviesParams,
  MoviePagination,
  MoviesPaginatedResponse,
  MovieShowtimesResponse,
  MovieGenre,
} from "../types/movie.type";

type RawMoviesResponse =
  | (MovieListItem[] & { pagination?: MoviePagination })
  | { data?: MovieListItem[]; pagination?: MoviePagination };

export const movieService = {
  /**
   * Lấy danh sách phim có phân trang và bộ lọc
   * GET /api/v1/movies
   */
  async getMovies(params?: GetMoviesParams): Promise<MoviesPaginatedResponse> {
    const raw = await apiClient.get<RawMoviesResponse | null>("/movies", {
      params: {
        search: params?.search,
        status: params?.status,
        genre_id: params?.genre_id,
        page: params?.page,
        limit: params?.limit,
        sort: params?.sort,
      },
    });

    const fallbackPagination = (count: number): MoviePagination => ({
      page: params?.page || 1,
      limit: params?.limit || count,
      totalItems: count,
      totalPages: 1,
    });

    if (Array.isArray(raw)) {
      return {
        data: raw,
        pagination: raw.pagination || fallbackPagination(raw.length),
      };
    }

    if (raw && Array.isArray(raw.data)) {
      return {
        data: raw.data,
        pagination: raw.pagination || fallbackPagination(raw.data.length),
      };
    }

    return {
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        totalItems: 0,
        totalPages: 0,
      },
    };
  },

  /**
   * Lấy chi tiết một bộ phim theo ID
   * GET /api/v1/movies/:id
   */
  async getMovieById(id: string | number): Promise<MovieDetail> {
    return apiClient.get<MovieDetail>(`/movies/${id}`);
  },

  /**
   * Lấy danh sách lịch chiếu gom nhóm theo cụm rạp của một bộ phim
   * GET /api/v1/movies/:id/showtimes
   */
  async getMovieShowtimes(
    id: string | number,
    query?: { cineplexId?: number; date?: string },
  ): Promise<MovieShowtimesResponse> {
    return apiClient.get<MovieShowtimesResponse>(`/movies/${id}/showtimes`, {
      params: {
        cineplexId: query?.cineplexId,
        date: query?.date,
      },
    });
  },

  /**
   * Lấy toàn bộ danh mục thể loại phim
   * GET /api/v1/genres
   */
  async getGenres(): Promise<MovieGenre[]> {
    return apiClient.get<MovieGenre[]>("/genres");
  },
};
