import { apiClient } from "@/lib/api-client";
import type { ShowtimeSeatsResponse } from "../types/seat.types";

export const seatService = {
  /** GET /api/v1/showtimes/:showtimeId/seats */
  getShowtimeSeats(
    showtimeId: number,
    signal?: AbortSignal,
  ): Promise<ShowtimeSeatsResponse> {
    return apiClient.get<ShowtimeSeatsResponse>(
      `/showtimes/${showtimeId}/seats`,
      { signal },
    );
  },
};
