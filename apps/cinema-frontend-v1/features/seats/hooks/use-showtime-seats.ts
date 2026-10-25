"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { seatService } from "../services/seat.service";
import { buildSeatLayout } from "../utils/seat-adapter";
import type {
  SeatMapLayout,
  ShowtimeSeatsInfo,
  ShowtimeSeatsResponse,
} from "../types/seat.type";

interface SeatsResult {
  requestKey: string;
  data: ShowtimeSeatsResponse | null;
  error: string | null;
}

// Tham chiếu ổn định khi chưa có dữ liệu
const EMPTY_LAYOUT: SeatMapLayout = { seats: [], cells: [], columns: 0 };

/**
 * @param refreshKey đổi giá trị này để tải lại sơ đồ ghế (vd sau khi giữ ghế thất bại)
 */
export function useShowtimeSeats(
  showtimeId?: string | number | null,
  refreshKey: number = 0,
) {
  const numericId = Number(showtimeId);
  const isValidId =
    showtimeId !== undefined &&
    showtimeId !== null &&
    showtimeId !== "" &&
    !isNaN(numericId) &&
    numericId > 0;

  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<SeatsResult | null>(null);

  const requestKey = `${numericId}|${reloadCount}|${refreshKey}`;

  useEffect(() => {
    if (!isValidId) return;

    let cancelled = false;

    seatService
      .getShowtimeSeats(numericId)
      .then((data) => {
        if (cancelled) return;
        setResult({ requestKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({
          requestKey,
          data: null,
          error: err instanceof Error ? err.message : "Lỗi khi tải sơ đồ ghế",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isValidId, numericId, requestKey]);

  // Kết quả chỉ hợp lệ nếu thuộc về request hiện tại; nếu không → đang tải.
  const current = result && result.requestKey === requestKey ? result : null;

  const data = isValidId ? (current?.data ?? null) : null;
  const layout = useMemo(
    () => (data ? buildSeatLayout(data) : EMPTY_LAYOUT),
    [data],
  );
  const info: ShowtimeSeatsInfo | null = data
    ? {
        auditoriumName: data.auditoriumName,
        totalSeats: data.totalSeats,
        availableSeats: data.availableSeats,
      }
    : null;

  const error = isValidId ? (current?.error ?? null) : null;
  const isLoading = isValidId && current === null;

  const refetch = useCallback(() => setReloadCount((c) => c + 1), []);

  return { layout, info, isValidId, isLoading, error, refetch };
}
