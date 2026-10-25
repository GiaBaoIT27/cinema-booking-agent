import { Inject, Injectable } from '@nestjs/common';

import { MoviesFacade, MovieStatus } from '#modules/movies/public-api/index.js';
import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';

import {
  SHOWTIME_REPOSITORY,
  type IShowtimeRepository,
} from '../../domain/repositories/showtime.repository.interface.js';
import { GetMovieShowtimesQueryDto } from '../dto/get-movie-showtimes-query.dto.js';
import {
  toMovieShowtimeRow,
  toMovieShowtimesResponse,
} from '../mappers/movie-showtimes.mapper.js';

/**
 * GET /api/v1/movies/:id/showtimes — lịch chiếu của một phim.
 * Trước đây thuộc module movies đọc qua SqlShowtimeGatewayAdapter (raw SQL) —
 * chuyển về đây vì showtimes là chủ sở hữu của bảng `showtimes`;
 * kiểm tra phim qua MoviesFacade (đã là import có sẵn của ShowtimesModule).
 */
@Injectable()
export class MovieShowtimesService {
  constructor(
    private readonly moviesFacade: MoviesFacade,
    @Inject(SHOWTIME_REPOSITORY)
    private readonly showtimeRepository: IShowtimeRepository,
  ) {}

  async findByMovieId(id: number, query: GetMovieShowtimesQueryDto) {
    const movie = await this.moviesFacade.getMovieById(id);
    if (!movie)
      throw new BusinessException(
        ErrorCode.MOVIE_NOT_FOUND,
        `Phim với ID ${id} không tồn tại trên hệ thống`,
      );

    // Phim đã kết thúc → không có lịch chiếu khả dụng
    if (movie.status === MovieStatus.ENDED) {
      throw new BusinessException(
        ErrorCode.MOVIE_NOT_ELIGIBLE_FOR_SHOWTIME,
        `Phim với ID ${id} đã kết thúc và không còn lịch chiếu khả dụng`,
      );
    }

    const { cineplexId, date } = query;
    const targetDate = date ?? new Date().toISOString().split('T')[0];

    const showtimes = await this.showtimeRepository.findBookableByMovie(
      String(movie.id),
      {
        cineplexId: cineplexId !== undefined ? String(cineplexId) : undefined,
        from: new Date(`${targetDate}T00:00:00.000Z`),
        to: new Date(`${targetDate}T23:59:59.999Z`),
        now: new Date(),
      },
    );

    const rows = showtimes
      .map(toMovieShowtimeRow)
      .filter((row): row is NonNullable<typeof row> => row !== null);

    return toMovieShowtimesResponse(movie, rows);
  }
}
