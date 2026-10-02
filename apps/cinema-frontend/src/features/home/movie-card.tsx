import { Button } from "@/components/ui/button";
import { useDictionary } from "@/features/preferences/provider";
import type { Movie } from "./model";

export function MovieMetadata({ movie }: { movie: Movie }) {
  const d = useDictionary();
  return <>{d.genres[movie.genreId]} · {Math.floor(movie.durationMinutes / 60)}h {String(movie.durationMinutes % 60).padStart(2, "0")}m{movie.ageRating ? ` · ${movie.ageRating}` : ""}</>;
}

export function MovieCard({ movie, onDetails }: { movie: Movie; onDetails(movieId: string): void }) {
 const d = useDictionary();
 return <article className="movie-card" data-testid="movie-card" key={movie.id}>
    <div className="movie-poster" aria-hidden="true" style={{ backgroundColor: movie.placeholderColor }} />
    <h3 className="text-movie-title">{movie.title}</h3>
    <p className="movie-metadata"><MovieMetadata movie={movie} /></p>
    <Button onClick={() => onDetails(movie.id)}>{d.home.viewDetails}</Button>
  </article>;
}
