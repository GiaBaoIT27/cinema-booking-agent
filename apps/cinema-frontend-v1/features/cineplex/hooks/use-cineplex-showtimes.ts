"use client";

import { useQuery } from "@tanstack/react-query";
import { cineplexService } from "../services/cineplex.service";
import type { CineplexShowtimesParams } from "../types/cineplex.types";
import { cineplexKeys } from "./use-cineplexes";

export function useCineplexShowtimes(
  id: number,
  params: CineplexShowtimesParams,
) {
  return useQuery({
    queryKey: cineplexKeys.showtimes(id, params.date, params.movieId),
    queryFn: () => cineplexService.getCineplexShowtimes(id, params),
    enabled: Number.isInteger(id) && id > 0 && Boolean(params.date),
  });
}
