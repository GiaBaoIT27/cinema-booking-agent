import { useInfiniteQuery } from "@tanstack/react-query";
import { cineplexService } from "../services/cineplex.service";
import type { CineplexListParams } from "../types/cineplex.types";

export const cineplexKeys = {
  list: (params: CineplexListParams) => ["cineplexes", "list", params] as const,
  detail: (id: number) => ["cineplexes", "detail", id] as const,
  showtimes: (id: number, date?: string, movieId?: string) =>
    ["cineplexes", "showtimes", id, { date, movieId }] as const,
};

/** Danh sách rạp cuộn vô hạn: kéo tới cuối thì tải trang kế tiếp. */
export function useCineplexes(params: Omit<CineplexListParams, "page">) {
  return useInfiniteQuery({
    queryKey: cineplexKeys.list(params),
    queryFn: ({ pageParam, signal }) =>
      cineplexService.getCineplexes({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages
        ? last.pagination.page + 1
        : undefined,
  });
}
