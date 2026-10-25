import { Inject, Injectable } from '@nestjs/common';

import { RedisService } from '#src/core/redis/redis.service.js';
import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';
import {
  CinemasFacade,
  CineplexStatus,
} from '#modules/cinemas/public-api/index.js';

import {
  SHOWTIME_REPOSITORY,
  type IShowtimeRepository,
} from '../../domain/repositories/showtime.repository.interface.js';
import {
  SHOWTIME_REDIS_KEYS,
  SHOWTIME_REDIS_TTL,
} from '../../infrastructure/constants/showtime-redis.constant.js';
import { QueryCineplexShowtimesDto } from '../dto/query-cineplex-showtimes.dto.js';
import { groupCineplexShowtimesByMovie } from '../mappers/cineplex-showtimes.mapper.js';

/**
 * GET /api/v1/cineplexes/:id/showtimes — lịch chiếu của một cụm rạp.
 * Trước đây thuộc module cinemas đọc qua SqlShowtimeGateway (raw SQL join
 * showtimes/movies/auditoriums) — chuyển về đây vì showtimes là chủ sở hữu
 * duy nhất của bảng `showtimes`; kiểm tra cụm rạp qua CinemasFacade.
 */
@Injectable()
export class CineplexShowtimesService {
  constructor(
    private readonly cinemasFacade: CinemasFacade,
    @Inject(SHOWTIME_REPOSITORY)
    private readonly showtimeRepository: IShowtimeRepository,
    private readonly redisService: RedisService,
  ) {}

  async findShowtimes(cineplexId: string, query: QueryCineplexShowtimesDto) {
    const { movieId } = query;
    // Mặc định lấy ngày hiện tại (YYYY-MM-DD)
    const date = query.date || new Date().toISOString().slice(0, 10);

    const cineplex = await this.cinemasFacade.getCineplexById(cineplexId);
    if (!cineplex) {
      throw new BusinessException(
        ErrorCode.CINEMA_CINEPLEX_NOT_FOUND,
        `Cụm rạp với ID ${cineplexId} không tồn tại trên hệ thống`,
      );
    }

    // Cụm rạp đã đóng cửa => không có suất chiếu.
    // Check NGOÀI cache để luôn đọc được trạng thái mới nhất (không dính stale).
    if (cineplex.status === CineplexStatus.CLOSED) return [];

    // Key nằm trong namespace cinema:showtimes:list:* — được xóa bởi PATTERN_LIST
    // khi bất kỳ suất chiếu nào thay đổi (cùng namespace với cache list của showtimes).
    const cacheKey = SHOWTIME_REDIS_KEYS.LIST(
      `venue=${cineplexId}:d=${date}:m=${movieId ?? '*'}`,
    );

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const showtimes = await this.showtimeRepository.findByCineplexAndRange(
          cineplexId,
          new Date(`${date}T00:00:00.000Z`),
          new Date(`${date}T23:59:59.999Z`),
          movieId,
        );
        return groupCineplexShowtimesByMovie(showtimes);
      },
      SHOWTIME_REDIS_TTL.LIST_SECONDS,
    );
  }
}
