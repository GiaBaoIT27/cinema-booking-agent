import { useQuery } from "@tanstack/react-query";
import { seatService } from "../services/seat.service";
import { toSeatsView } from "../utils/seat-adapter";

export function useShowtimeSeats(showtimeId: number) {
  return useQuery({
    queryKey: ["showtimes", "seats", showtimeId] as const,
    queryFn: ({ signal }) => seatService.getShowtimeSeats(showtimeId, signal),
    select: toSeatsView,
    enabled: Number.isInteger(showtimeId) && showtimeId > 0,
    // Người khác có thể giữ/mua ghế: làm mới định kỳ khi màn hình đang mở.
    refetchInterval: 15_000,
  });
}
