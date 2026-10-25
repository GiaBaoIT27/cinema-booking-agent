"use client";

import { useCallback, useState } from "react";
import { bookingService } from "../services/booking.service";
import {
  releaseSeatsFlow,
  toggleSeatFlow,
  type ToggleOutcome,
} from "../utils/hold-flow";

const RELEASE_FAILED_MESSAGE = "Không thể bỏ chọn ghế. Vui lòng thử lại.";

export function useSeatHold() {
  const [error, setError] = useState<string | null>(null);

  /** Bấm vào ghế: chưa chọn thì giữ ghế, đang chọn thì trả ghế (lỗi nằm trong `error`) */
  const toggleSeat = useCallback(
    async (input: {
      showtimeId: number;
      seatId: number;
      isSelected: boolean;
      expiresAt?: number;
    }): Promise<ToggleOutcome> => {
      setError(null);
      const outcome = await toggleSeatFlow(bookingService, input);

      if (outcome.kind === "hold-failed") setError(outcome.message);
      if (outcome.kind === "release-failed") setError(RELEASE_FAILED_MESSAGE);
      return outcome;
    },
    [],
  );

  /** Trả nhiều ghế cùng lúc; lỗi bị bỏ qua và trả về false */
  const releaseSeats = useCallback(
    (showtimeId: number, seatIds: number[]) =>
      releaseSeatsFlow(bookingService, showtimeId, seatIds),
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return { toggleSeat, releaseSeats, error, setError, clearError };
}
