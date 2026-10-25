import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { movieService } from "../services/movie.service";
import type { GetMoviesParams } from "../types/movie.types";

export const movieKeys = {
  list: (params: GetMoviesParams) => ["movies", "list", params] as const,
  detail: (id: string | number) => ["movies", "detail", id] as const,
};

/** Danh sách phim cuộn vô hạn: kéo tới cuối thì tải trang kế tiếp. */
export function useMovies(params: Omit<GetMoviesParams, "page">) {
  return useInfiniteQuery({
    queryKey: movieKeys.list(params),
    queryFn: ({ pageParam, signal }) =>
      movieService.getMovies({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages
        ? last.pagination.page + 1
        : undefined,
  });
}

export function useMovieDetail(id: string | undefined) {
  return useQuery({
    queryKey: movieKeys.detail(id ?? ""),
    queryFn: ({ signal }) => movieService.getMovieById(id as string, signal),
    enabled: Boolean(id),
  });
}
