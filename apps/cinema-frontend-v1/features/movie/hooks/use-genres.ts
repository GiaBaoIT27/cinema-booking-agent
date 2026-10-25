"use client";

import { useEffect, useState } from "react";
import { movieService } from "../services/movie.service";
import type { MovieGenre } from "../types/movie.type";

interface GenresState {
  genres: MovieGenre[];
  isLoading: boolean;
}

export function useGenres() {
  const [genres, setGenres] = useState<GenresState>({
    genres: [],
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;

    movieService
      .getGenres()
      .then((data) => {
        if (!isMounted) return;
        setGenres({
          genres:
            Array.isArray(data) && data.length > 0
              ? [{ id: "all", name: "Tất cả" }, ...data]
              : [],
          isLoading: false,
        });
      })
      .catch(() => {
        // Fallback to defaults
        if (isMounted) setGenres({ genres: [], isLoading: false });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return genres;
}
