import { Movie } from '../../domain/entities/movie.entity.js';
import type { MovieDetailModel } from '../models/movie-detail.model.js';

/** Phần tử trong danh sách GET /movies */
export function toMovieListItem(movie: Movie) {
  return {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.originalTitle,
    durationMinutes: movie.durationMinutes,
    ageRating: movie.ageRating,
    posterUrl: movie.posterUrl,
    trailerUrl: movie.trailerUrl,
    releaseDate: movie.releaseDate,
    endDate: movie.endDate,
    status: movie.status,
    createdAt: movie.createdAt,
  };
}

/** GET /movies/:id, PUT /movies/:id, PATCH /movies/:id/status, PATCH /movies/:id/genres */
export function toMovieDetail(movie: MovieDetailModel) {
  return {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.originalTitle,
    description: movie.description,
    director: movie.director,
    cast: movie.cast,
    durationMinutes: movie.durationMinutes,
    ageRating: movie.ageRating,
    country: movie.country,
    originalLanguage: movie.originalLanguage,
    revenueShareRatio: movie.revenueShareRatio,
    trailerUrl: movie.trailerUrl,
    posterUrl: movie.posterUrl,
    bannerUrl: movie.bannerUrl,
    releaseDate: movie.releaseDate,
    endDate: movie.endDate,
    status: movie.status,
    distributor: movie.distributor
      ? { id: movie.distributor.id, name: movie.distributor.name }
      : null,
    genres: (movie.genres ?? []).map((genre) => ({
      id: genre.id,
      code: genre.code,
      name: genre.name,
    })),
    createdAt: movie.createdAt,
    updatedAt: movie.updatedAt,
  };
}

/** POST /movies */
export function toCreateMovieResponse(movie: Movie) {
  return {
    id: movie.id,
    title: movie.title,
    status: movie.status,
    createdAt: movie.createdAt,
  };
}
