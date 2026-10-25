"use client";

import { useQuery } from "@tanstack/react-query";
import { cineplexService } from "../services/cineplex.service";
import { cineplexKeys } from "./use-cineplexes";

export function useCineplexDetail(id: number) {
  return useQuery({
    queryKey: cineplexKeys.detail(id),
    queryFn: () => cineplexService.getCineplexById(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}
