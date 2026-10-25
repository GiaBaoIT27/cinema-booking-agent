"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { movieService } from "../services/movie.service";
import { toUiMovie } from "../utils/movie-adapter";
import type {
  GetMoviesParams,
  MovieListItem,
  MoviePagination,
} from "../types/movie.type";

type UseMoviesOptions = GetMoviesParams;

interface MoviesResult {
  requestKey: string;
  items: MovieListItem[];
  pagination: MoviePagination | null;
  error: string | null;
}

// Tham chiếu ổn định để useMemo không tính lại mỗi lần render
const EMPTY_ITEMS: MovieListItem[] = [];
const DEFAULT_PAGINATION: MoviePagination = {
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 1,
};

export function useMovies(options: UseMoviesOptions = {}) {
  const {
    status,
    search,
    genre_id,
    page = 1,
    limit = 20,
    sort = "release_date:desc",
  } = options;

  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<MoviesResult | null>(null);

  const requestKey = [
    status,
    search,
    genre_id,
    page,
    limit,
    sort,
    reloadCount,
  ].join("|");

  useEffect(() => {
    let cancelled = false;

    movieService
      .getMovies({ status, search, genre_id, page, limit, sort })
      .then((res) => {
        if (cancelled) return;
        const items = res?.data ?? [];
        setResult({
          requestKey,
          items,
          pagination: res?.pagination ?? {
            page,
            limit,
            totalItems: items.length,
            totalPages: Math.ceil(items.length / limit) || 1,
          },
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({
          requestKey,
          items: EMPTY_ITEMS,
          pagination: null,
          error:
            err instanceof Error ? err.message : "Lỗi khi tải danh sách phim",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [status, search, genre_id, page, limit, sort, requestKey]);

  // Kết quả chỉ hợp lệ nếu thuộc về request hiện tại; nếu không → đang tải.
  const current = result && result.requestKey === requestKey ? result : null;

  const rawMovies = current?.items ?? EMPTY_ITEMS;
  const movies = useMemo(() => rawMovies.map(toUiMovie), [rawMovies]);
  const pagination = current?.pagination ?? DEFAULT_PAGINATION;
  const error = current?.error ?? null;
  const isLoading = current === null;

  const refetch = useCallback(() => setReloadCount((c) => c + 1), []);

  return {
    movies,
    rawMovies,
    isLoading,
    error,
    pagination,
    refetch,
  };
}
