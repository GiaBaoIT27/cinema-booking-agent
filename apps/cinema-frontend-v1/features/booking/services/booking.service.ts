import { apiClient } from "@/lib/api-client";
import type {
  HoldSeatsResponse,
  MyHoldsResponse,
  ReleaseSeatsResponse,
  SeatHoldPayload,
} from "../types/booking.type";

// Các endpoint này yêu cầu đăng nhập (backend lấy userId từ token)
export const bookingService = {
  /**
   * Giữ ghế cho người dùng hiện tại
   * POST /api/v1/bookings/hold
   */
  async holdSeats(payload: SeatHoldPayload): Promise<HoldSeatsResponse> {
    return apiClient.post<HoldSeatsResponse>("/bookings/hold", payload);
  },

  /**
   * Giải phóng ghế đang giữ
   * POST /api/v1/bookings/release
   */
  async releaseSeats(payload: SeatHoldPayload): Promise<ReleaseSeatsResponse> {
    return apiClient.post<ReleaseSeatsResponse>("/bookings/release", payload);
  },

  /**
   * Xem các ghế người dùng hiện tại đang giữ
   * GET /api/v1/bookings/my-holds
   */
  async getMyHolds(): Promise<MyHoldsResponse> {
    return apiClient.get<MyHoldsResponse>("/bookings/my-holds");
  },
};

export type BookingHoldApi = Pick<
  typeof bookingService,
  "holdSeats" | "releaseSeats"
>;
