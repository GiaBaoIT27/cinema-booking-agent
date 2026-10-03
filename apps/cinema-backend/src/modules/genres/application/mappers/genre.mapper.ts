import { Genre } from '../../domain/entities/genre.entity.js';
import type { GenreMovieRow } from '../../domain/ports/movie-catalog.gateway.port.js';

/** POST / PUT / phần tử trong GET /genres (id giữ dạng string — contract cũ). */
export function toGenreResponse(genre: Genre) {
  return {
    id: genre.id,
    code: genre.code,
    name: genre.name,
    description: genre.description,
    createdAt: genre.createdAt,
  };
}

/** GET /genres/:id */
export function toGenreDetail(genre: Genre, totalAssociatedMovies: number) {
  return { ...toGenreResponse(genre), totalAssociatedMovies };
}

/** Phần tử trong GET /genres/:id/movies */
export function toGenreMovieItem(movie: GenreMovieRow) {
  return {
    id: movie.id,
    title: movie.title,
    durationMinutes: movie.durationMinutes,
    releaseDate: movie.releaseDate,
    ageRating: movie.ageRating,
    status: movie.status,
    posterUrl: movie.posterUrl,
  };
}
