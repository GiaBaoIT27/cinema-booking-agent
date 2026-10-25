"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { cineplexService } from "../services/cineplex.service";
import type { CineplexListParams } from "../types/cineplex.types";

export const cineplexKeys = {
  all: ["cineplexes"] as const,
  list: (params: CineplexListParams) => ["cineplexes", "list", params] as const,
  detail: (id: number) => ["cineplexes", "detail", id] as const,
  showtimes: (id: number, date?: string, movieId?: string) =>
    ["cineplexes", "showtimes", id, { date, movieId }] as const,
};

export function useCineplexes(params: CineplexListParams) {
  return useQuery({
    queryKey: cineplexKeys.list(params),
    queryFn: () => cineplexService.getCineplexes(params),
    placeholderData: keepPreviousData, // chuyển trang không bị nháy
  });
}
