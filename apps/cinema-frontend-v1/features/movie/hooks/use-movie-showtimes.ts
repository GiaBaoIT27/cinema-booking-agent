"use client";

import { useCallback, useEffect, useState } from "react";
import { movieService } from "../services/movie.service";
import type { MovieShowtimesResponse } from "../types/movie.type";

interface UseMovieShowtimesOptions {
  cineplexId?: number;
  date?: string; // YYYY-MM-DD
}

interface ShowtimesResult {
  requestKey: string;
  data: MovieShowtimesResponse | null;
  error: string | null;
}

export function useMovieShowtimes(
  movieId: string | number,
  options: UseMovieShowtimesOptions = {},
) {
  const { cineplexId, date } = options;
  const numericId = Number(movieId);
  const isValidId = Boolean(movieId) && !isNaN(numericId) && numericId > 0;

  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<ShowtimesResult | null>(null);

  const requestKey = `${numericId}|${cineplexId}|${date}|${reloadCount}`;

  useEffect(() => {
    if (!isValidId) return;

    let cancelled = false;

    movieService
      .getMovieShowtimes(numericId, { cineplexId, date })
      .then((data) => {
        if (cancelled) return;
        setResult({ requestKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({
          requestKey,
          data: null,
          error:
            err instanceof Error ? err.message : "Lỗi khi tải lịch chiếu phim",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isValidId, numericId, cineplexId, date, requestKey]);

  const current = result && result.requestKey === requestKey ? result : null;

  const showtimesData = isValidId ? (current?.data ?? null) : null;
  const error = isValidId ? (current?.error ?? null) : null;
  const isLoading = isValidId && current === null;

  const refetch = useCallback(() => setReloadCount((c) => c + 1), []);

  return {
    showtimesData,
    isLoading,
    error,
    refetch,
  };
}
