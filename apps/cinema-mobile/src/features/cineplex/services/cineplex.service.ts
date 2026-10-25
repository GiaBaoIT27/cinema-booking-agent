import { apiClient } from "@/lib/api-client";
import { toPaginated, type Paginated } from "@/lib/pagination";
import type {
  CineplexDetail,
  CineplexListItem,
  CineplexListParams,
  CineplexShowtimesParams,
} from "../types/cineplex.types";

export const cineplexService = {
  /** GET /api/v1/cineplexes */
  async getCineplexes(
    params: CineplexListParams = {},
    signal?: AbortSignal,
  ): Promise<Paginated<CineplexListItem>> {
    const raw = await apiClient.get<CineplexListItem[]>("/cineplexes", {
      params: { ...params },
      signal,
    });
    return toPaginated(raw, { page: params.page, limit: params.limit });
  },

  /** GET /api/v1/cineplexes/:id */
  getCineplexById(
    id: string | number,
    signal?: AbortSignal,
  ): Promise<CineplexDetail> {
    return apiClient.get<CineplexDetail>(`/cineplexes/${id}`, { signal });
  },

  /** GET /api/v1/cineplexes/:id/showtimes: trả unknown, chuẩn hóa ở normalize-showtimes. */
  getCineplexShowtimes(
    id: string | number,
    params: CineplexShowtimesParams = {},
    signal?: AbortSignal,
  ): Promise<unknown> {
    return apiClient.get<unknown>(`/cineplexes/${id}/showtimes`, {
      params: { date: params.date, movieId: params.movieId },
      signal,
    });
  },
};
