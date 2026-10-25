import { apiClient } from "@/lib/api-client";
import type { ShowtimeSeatsResponse } from "../types/seat.type";

export const seatService = {
  /**
   * Lấy sơ đồ ghế và trạng thái từng ghế của một suất chiếu
   * GET /api/v1/showtimes/:showtimeId/seats
   */
  async getShowtimeSeats(
    showtimeId: string | number,
  ): Promise<ShowtimeSeatsResponse> {
    return apiClient.get<ShowtimeSeatsResponse>(
      `/showtimes/${showtimeId}/seats`,
    );
  },
};
