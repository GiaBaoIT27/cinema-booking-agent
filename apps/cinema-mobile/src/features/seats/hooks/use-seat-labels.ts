import { useQuery } from "@tanstack/react-query";
import { seatService } from "../services/seat.service";

/** seatId → nhãn ghế, lấy từ sơ đồ ghế của suất chiếu (chi tiết đơn chỉ có seatId). */
const select = (raw: Awaited<ReturnType<typeof seatService.getShowtimeSeats>>) =>
  Object.fromEntries((raw.seatMatrix ?? []).map((s) => [s.seatId, s.seatNumber])) as Record<number, string>;

export function useSeatLabels(showtimeId: number | undefined) {
  return useQuery({
    // Cùng khóa với useShowtimeSeats để dùng chung cache; chỉ khác `select`.
    queryKey: ["showtimes", "seats", showtimeId ?? 0] as const,
    queryFn: ({ signal }) => seatService.getShowtimeSeats(showtimeId as number, signal),
    select,
    enabled: typeof showtimeId === "number" && showtimeId > 0,
    retry: false, // suất đã chiếu xong có thể không còn lấy được: bỏ qua, chỉ mất nhãn ghế
    staleTime: 10 * 60 * 1000,
  });
}
