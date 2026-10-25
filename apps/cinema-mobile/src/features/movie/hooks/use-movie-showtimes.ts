import { useQuery } from "@tanstack/react-query";
import { movieService } from "../services/movie.service";

export function useMovieShowtimes(
  movieId: string | undefined,
  date: string | undefined,
) {
  return useQuery({
    queryKey: ["movies", "showtimes", movieId ?? "", date ?? ""] as const,
    queryFn: ({ signal }) =>
      movieService.getMovieShowtimes(movieId as string, { date }, signal),
    select: (res) => res.showtimesByCinema ?? [],
    enabled: Boolean(movieId) && Boolean(date),
  });
}
