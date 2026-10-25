"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toHeroMovie, type HeroMovie } from "../utils/to-hero-movie";

/**
 * Lấy danh sách phim nổi bật cho hero banner slider (tối đa 5 phim đang chiếu mới nhất).
 */
async function fetchHeroMovies(signal?: AbortSignal): Promise<HeroMovie[]> {
  const res = await apiClient.get<unknown>("/movies", {
    params: { status: "SHOWING", sort: "release_date:desc", page: 1, limit: 5 },
    signal,
  });

  // Backend trả về { data: [...] } hoặc mảng thẳng
  const list: Record<string, unknown>[] = Array.isArray(res)
    ? res
    : Array.isArray((res as Record<string, unknown>)?.data)
      ? ((res as Record<string, unknown>).data as Record<string, unknown>[])
      : [];

  return list.map(toHeroMovie).filter((m) => m.imageUrl !== null);
}

export function useHeroMovies() {
  return useQuery({
    queryKey: ["home", "hero-movies"],
    queryFn: ({ signal }) => fetchHeroMovies(signal),
    staleTime: 5 * 60 * 1000,
  });
}

/** @deprecated Dùng useHeroMovies thay thế */
export const useHeroMovie = useHeroMovies;
