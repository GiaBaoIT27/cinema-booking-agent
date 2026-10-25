import { apiClient } from "@/lib/api-client";
import type {
  HoldSeatsResponse,
  ReleaseSeatsResponse,
  SeatHoldPayload,
} from "../types/booking.types";

// Các endpoint này yêu cầu đăng nhập (backend lấy userId từ token).
export const bookingService = {
  /** POST /api/v1/bookings/hold */
  holdSeats(payload: SeatHoldPayload): Promise<HoldSeatsResponse> {
    return apiClient.post<HoldSeatsResponse>("/bookings/hold", payload);
  },

  /** POST /api/v1/bookings/release */
  releaseSeats(payload: SeatHoldPayload): Promise<ReleaseSeatsResponse> {
    return apiClient.post<ReleaseSeatsResponse>("/bookings/release", payload);
  },
};

export type BookingHoldApi = Pick<
  typeof bookingService,
  "holdSeats" | "releaseSeats"
>;
