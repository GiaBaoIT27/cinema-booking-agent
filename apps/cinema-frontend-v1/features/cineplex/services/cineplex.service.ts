import { apiClient } from "@/lib/api-client";
import type {
  CineplexDetail,
  CineplexListItem,
  CineplexListParams,
  CineplexShowtime,
  CineplexShowtimesParams,
  PaginatedResult,
  Pagination,
} from "../types/cineplex.types";

/** apiClient đã bóc envelope: danh sách có thể là mảng gắn .pagination hoặc { data, pagination }. */
type RawCineplexesResponse =
  | (CineplexListItem[] & { pagination?: Pagination })
  | { data?: CineplexListItem[]; pagination?: Pagination };

export const cineplexService = {
  /**
   * Lấy danh sách cụm rạp có phân trang, lọc và tìm gần
   * GET /api/v1/cineplexes
   */
  async getCineplexes(
    params?: CineplexListParams,
  ): Promise<PaginatedResult<CineplexListItem>> {
    const raw = await apiClient.get<RawCineplexesResponse | null>(
      "/cineplexes",
      {
        params: {
          provinceId: params?.provinceId,
          wardId: params?.wardId,
          latitude: params?.latitude,
          longitude: params?.longitude,
          radiusKm: params?.radiusKm,
          status: params?.status,
          search: params?.search,
          page: params?.page,
          limit: params?.limit,
        },
      },
    );

    const fallbackPagination = (count: number): Pagination => ({
      page: params?.page || 1,
      limit: params?.limit || count,
      totalItems: count,
      totalPages: 1,
    });

    if (Array.isArray(raw)) {
      return {
        items: raw,
        pagination: raw.pagination || fallbackPagination(raw.length),
      };
    }

    if (raw && Array.isArray(raw.data)) {
      return {
        items: raw.data,
        pagination: raw.pagination || fallbackPagination(raw.data.length),
      };
    }

    return {
      items: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    };
  },

  /**
   * Lấy chi tiết một cụm rạp theo ID
   * GET /api/v1/cineplexes/:id
   */
  async getCineplexById(id: string | number): Promise<CineplexDetail> {
    return apiClient.get<CineplexDetail>(`/cineplexes/${id}`);
  },

  /**
   * Lấy suất chiếu theo rạp (lọc theo ngày, phim)
   * GET /api/v1/cineplexes/:id/showtimes
   */
  async getCineplexShowtimes(
    id: string | number,
    params?: CineplexShowtimesParams,
  ): Promise<CineplexShowtime[]> {
    return apiClient.get<CineplexShowtime[]>(`/cineplexes/${id}/showtimes`, {
      params: { date: params?.date, movieId: params?.movieId },
    });
  },
};
