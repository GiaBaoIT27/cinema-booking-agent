import { Movie } from '../../domain/entities/movie.entity.js';

/**
 * Phim + thông tin nhà phát hành & thể loại đã ghép từ module khác (qua facade).
 * Đây cũng là dạng dữ liệu được cache cho GET /movies/:id.
 */
export type MovieDetailModel = Omit<Movie, 'distributor' | 'genres'> & {
  distributor: { id: string; name: string } | null;
  genres: Array<{ id: string; code: string; name: string }>;
};
