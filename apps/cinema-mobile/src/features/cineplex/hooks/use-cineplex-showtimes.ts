import { useQuery } from "@tanstack/react-query";
import { cineplexService } from "../services/cineplex.service";
import type { CineplexShowtimesParams } from "../types/cineplex.types";
import { normalizeShowtimeGroups } from "../utils/normalize-showtimes";
import { cineplexKeys } from "./use-cineplexes";

export function useCineplexShowtimes(
  id: number,
  params: CineplexShowtimesParams,
) {
  return useQuery({
    queryKey: cineplexKeys.showtimes(id, params.date, params.movieId),
    queryFn: ({ signal }) => cineplexService.getCineplexShowtimes(id, params, signal),
    select: normalizeShowtimeGroups,
    enabled: Number.isInteger(id) && id > 0 && Boolean(params.date),
  });
}
