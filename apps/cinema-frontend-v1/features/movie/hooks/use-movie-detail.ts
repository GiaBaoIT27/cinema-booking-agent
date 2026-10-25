"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { movieService } from "../services/movie.service";
import { toUiMovieDetail } from "../utils/movie-adapter";
import type { MovieDetail } from "../types/movie.type";

interface DetailResult {
  requestKey: string;
  data: MovieDetail | null;
  error: string | null;
}

export function useMovieDetail(movieId: string | number) {
  const hasId = Boolean(movieId);
  const numericId = Number(movieId);
  const isValidId = hasId && !isNaN(numericId) && numericId > 0;

  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<DetailResult | null>(null);

  const requestKey = `${numericId}:${reloadCount}`;

  useEffect(() => {
    if (!isValidId) return;

    let cancelled = false;

    movieService
      .getMovieById(numericId)
      .then((data) => {
        if (cancelled) return;
        setResult(
          data
            ? { requestKey, data, error: null }
            : {
                requestKey,
                data: null,
                error: "Không tìm thấy thông tin phim",
              },
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({
          requestKey,
          data: null,
          error:
            err instanceof Error ? err.message : "Lỗi khi tải chi tiết phim",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isValidId, numericId, requestKey]);

  // Kết quả chỉ hợp lệ nếu thuộc về request hiện tại; nếu không → đang tải.
  const current = result && result.requestKey === requestKey ? result : null;

  const rawMovie = isValidId ? (current?.data ?? null) : null;
  const movie = useMemo(
    () => (rawMovie ? toUiMovieDetail(rawMovie) : null),
    [rawMovie],
  );

  let error: string | null = null;
  if (hasId && !isValidId) error = "Mã định danh phim không hợp lệ";
  else if (isValidId) error = current?.error ?? null;

  const isLoading = isValidId && current === null;

  const refetch = useCallback(() => setReloadCount((c) => c + 1), []);

  return {
    movie,
    rawMovie,
    isLoading,
    error,
    refetch,
  };
}
