import { Injectable, Inject, Logger, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Showtime } from '../../domain/entities/showtime.entity.js';
import { ShowtimeStatus } from '../../domain/enums/showtime-status.enum.js';

import { ShowtimeSeatStatus } from '../../domain/enums/showtime-seat-status.js';
import { canTransitionStatus } from '../../domain/rules/showtime-status.rules.js';
import {
  SHOWTIME_REPOSITORY,
  type IShowtimeRepository,
} from '../../domain/repositories/showtime.repository.interface.js';
import { ShowtimeSchedulingService } from './showtime-scheduling.service.js';
import { PriceCalculationService } from './price-calculation.service.js';
import { RedisService } from '#src/core/redis/redis.service.js';
import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';
import {
  SHOWTIME_REDIS_KEYS,
  SHOWTIME_REDIS_TTL,
} from '../../infrastructure/constants/showtime-redis.constant.js';
import {
  CreateShowtimeDto,
  UpdateShowtimeDto,
  GetShowtimesQueryDto,
  UpdateShowtimeStatusDto,
  ShowtimeSeatMatrixResponseDto,
} from '../dto/index.js';

import { MoviesFacade, MovieStatus } from '#modules/movies/public-api/index.js';
import { CinemasFacade } from '#modules/cinemas/public-api/cinemas.facade.js';

@Injectable()
export class ShowtimeService {
  private readonly logger = new Logger(ShowtimeService.name);

  constructor(
    @Inject(SHOWTIME_REPOSITORY)
    private readonly showtimeRepository: IShowtimeRepository,
    private readonly schedulingService: ShowtimeSchedulingService,
    private readonly priceCalculationService: PriceCalculationService,

    private readonly moviesFacade: MoviesFacade,
    private readonly cinemasFacade: CinemasFacade,

    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  // GET api/v1/showtimes
  async findAll(queryDto: GetShowtimesQueryDto) {
    const targetDate = queryDto.date ?? new Date().toISOString().split('T')[0];
    const cacheKey = SHOWTIME_REDIS_KEYS.LIST(
      `d=${targetDate}:p=${queryDto.page}:l=${queryDto.limit}`,
    );

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        return await this.showtimeRepository.findPaginated({
          ...queryDto,
          date: targetDate,
        });
      },
      SHOWTIME_REDIS_TTL.LIST_SECONDS,
    );
  }

  // POST api/v1/showtimes
  async create(createDto: CreateShowtimeDto): Promise<Showtime> {
    const startTimeDate = new Date(createDto.startTime);

    // Validate thời gian bắt đầu phải lớn hơn thời điểm hiện tại
    this.schedulingService.validateStartTime(startTimeDate);

    const cleaningMinutes = createDto.cleaningMinutes ?? 15;

    // 1. Kiểm tra Auditorium có tồn tại không
    await this.cinemasFacade.assertAuditoriumExists(createDto.auditoriumId);

    // 2. Kiểm tra Movie có tồn tại không
    const movie = await this.moviesFacade.getMovieById(createDto.movieId);

    if (!movie) {
      throw new BusinessException(
        ErrorCode.MOVIE_NOT_FOUND,
        `Bộ phim với ID ${createDto.movieId} không tồn tại`,
      );
    }

    if (movie.status === MovieStatus.ENDED) {
      throw new BusinessException(
        ErrorCode.MOVIE_NOT_ELIGIBLE_FOR_SHOWTIME,
        'Không thể tạo/cập nhật suất chiếu cho phim đã kết thúc (ENDED)',
      );
    }

    // 3. Tính thời gian kết thúc
    const endTimeDate = this.schedulingService.calculateEndTime(
      startTimeDate,
      movie.durationMinutes,
      cleaningMinutes,
    );

    // 4. Kiểm tra trùng lịch và Lưu suất chiếu trong Transaction
    const createdShowtime = await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        await this.schedulingService.assertNoOverlapping(
          createDto.auditoriumId.toString(),
          startTimeDate,
          endTimeDate,
        );

        const showtime = transactionalEntityManager.create(Showtime, {
          auditoriumId: createDto.auditoriumId.toString(),
          movieId: createDto.movieId.toString(),
          projectionType: createDto.projectionType,
          audioLanguage: createDto.audioLanguage,
          subtitleLanguage: createDto.subtitleLanguage ?? null,
          startTime: startTimeDate,
          endTime: endTimeDate,
          cleaningMinutes,
          status: ShowtimeStatus.SCHEDULED,
        });

        return await transactionalEntityManager.save(Showtime, showtime);
      },
    );

    // 5. Xóa Cache danh sách
    await this.redisService.delByPattern(SHOWTIME_REDIS_KEYS.PATTERN_LIST);

    return createdShowtime;
  }

  // GET api/v1/showtimes/:id
  async findOne(id: number): Promise<Showtime> {
    const cacheKey = SHOWTIME_REDIS_KEYS.DETAIL(id);

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const showtime = await this.showtimeRepository.findById(id.toString());

        if (!showtime) {
          throw new BusinessException(
            ErrorCode.SHOWTIME_NOT_FOUND,
            `Suất chiếu với ID ${id} không tồn tại trên hệ thống`,
          );
        }

        return showtime;
      },
      SHOWTIME_REDIS_TTL.DETAIL_SECONDS,
    );
  }

  // PUT api/v1/showtimes/:id
  async update(id: number, updateDto: UpdateShowtimeDto): Promise<Showtime> {
    const startTimeDate = new Date(updateDto.startTime);
    this.schedulingService.validateStartTime(startTimeDate);

    const cleaningMinutes = updateDto.cleaningMinutes ?? 15;

    const updatedShowtime = await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        // 1. Kiểm tra tồn tại suất chiếu
        const showtime = await transactionalEntityManager.findOne(Showtime, {
          where: { id: id.toString() },
        });

        if (!showtime) {
          throw new BusinessException(
            ErrorCode.SHOWTIME_NOT_FOUND,
            `Suất chiếu với ID ${id} không tồn tại trên hệ thống`,
          );
        }

        // 2. Chỉ cho phép sửa khi status = SCHEDULED
        if (showtime.status !== ShowtimeStatus.SCHEDULED) {
          throw new BusinessException(
            ErrorCode.SHOWTIME_LOCKED_CANNOT_UPDATE,
            'Suất chiếu đã mở bán (OPEN) hoặc đã kết thúc/hủy, không thể chỉnh sửa thông tin',
          );
        }

        // 3. Kiểm tra Auditorium
        await this.cinemasFacade.assertAuditoriumExists(updateDto.auditoriumId);

        // 4. Kiểm tra Movie qua MoviesFacade
        // 2. Kiểm tra Movie có tồn tại không
        const movie = await this.moviesFacade.getMovieById(updateDto.movieId);

        if (!movie) {
          throw new BusinessException(
            ErrorCode.MOVIE_NOT_FOUND,
            `Bộ phim với ID ${updateDto.movieId} không tồn tại`,
          );
        }

        if (movie.status === MovieStatus.ENDED) {
          throw new BusinessException(
            ErrorCode.MOVIE_NOT_ELIGIBLE_FOR_SHOWTIME,
            'Không thể tạo/cập nhật suất chiếu cho phim đã kết thúc (ENDED)',
          );
        }

        // 5. Tính toán endTime
        const endTimeDate = this.schedulingService.calculateEndTime(
          startTimeDate,
          movie.durationMinutes,
          cleaningMinutes,
        );

        // 6. Kiểm tra trùng lịch chiếu
        await this.schedulingService.assertNoOverlapping(
          updateDto.auditoriumId.toString(),
          startTimeDate,
          endTimeDate,
        );

        // 7. Cập nhật Entity
        Object.assign(showtime, {
          auditoriumId: updateDto.auditoriumId.toString(),
          movieId: updateDto.movieId.toString(),
          projectionType: updateDto.projectionType,
          audioLanguage: updateDto.audioLanguage,
          subtitleLanguage: updateDto.subtitleLanguage ?? null,
          startTime: startTimeDate,
          endTime: endTimeDate,
          cleaningMinutes,
        });

        return await transactionalEntityManager.save(Showtime, showtime);
      },
    );

    // 8. Evict Cache
    await Promise.all([
      this.redisService.del(SHOWTIME_REDIS_KEYS.DETAIL(id)),
      this.redisService.delByPattern(SHOWTIME_REDIS_KEYS.PATTERN_LIST),
    ]);

    return updatedShowtime;
  }

  // PATCH api/v1/showtimes/:id/status
  async updateStatus(
    id: number,
    updateStatusDto: UpdateShowtimeStatusDto,
  ): Promise<Showtime> {
    const showtime = await this.showtimeRepository.findById(id.toString());

    if (!showtime) {
      throw new BusinessException(
        ErrorCode.SHOWTIME_NOT_FOUND,
        `Suất chiếu với ID ${id} không tồn tại trên hệ thống`,
      );
    }

    const currentStatus = showtime.status;
    const targetStatus = updateStatusDto.status;

    if (currentStatus === targetStatus) {
      return showtime;
    }

    if (!canTransitionStatus(currentStatus, targetStatus)) {
      throw new BusinessException(
        ErrorCode.MOVIE_STATUS_TRANSITION_NOT_ALLOWED,
        `Không thể chuyển trạng thái từ ${currentStatus} sang ${targetStatus}`,
      );
    }

    showtime.status = targetStatus;
    const updatedShowtime = await this.showtimeRepository.save(showtime);

    await Promise.all([
      this.redisService.del(SHOWTIME_REDIS_KEYS.DETAIL(id)),
      this.redisService.delByPattern(SHOWTIME_REDIS_KEYS.PATTERN_LIST),
    ]);

    return updatedShowtime;
  }

  // GET api/v1/showtimes/:id/seats
  async getSeatMatrix(
    showtimeId: number,
  ): Promise<ShowtimeSeatMatrixResponseDto> {
    const showtime = await this.showtimeRepository.findByIdWithAuditoriumSeats(
      showtimeId.toString(),
    );

    if (!showtime) {
      throw new BusinessException(
        ErrorCode.SHOWTIME_NOT_FOUND,
        `Suất chiếu với ID ${showtimeId} không tồn tại trên hệ thống`,
      );
    }

    const auditoriumSeats = showtime.auditorium?.seats ?? [];
    const dbShowtimeSeats = showtime.showtimeSeats ?? [];
    const now = new Date();

    const seatPriceMap = await this.getSeatPriceMap(showtime);

    const dbSeatStatusMap = new Map<number, any>();
    for (const ss of dbShowtimeSeats) {
      dbSeatStatusMap.set(Number(ss.seatId), ss);
    }

    const redisHoldKey = `showtime:${showtimeId}:holds`;
    const redisHeldSeatsRaw = await this.redisService.hgetall(redisHoldKey);

    const redisHeldSeatsMap = new Map<number, void>();
    for (const [seatIdStr, value] of Object.entries(redisHeldSeatsRaw)) {
      try {
        const hold = JSON.parse(value) as { expiresAt?: string | Date };
        if (hold?.expiresAt && new Date(hold.expiresAt) > now) {
          redisHeldSeatsMap.set(Number(seatIdStr));
        }
      } catch {
        // Bỏ qua nếu data không đúng định dạng JSON
      }
    }

    let availableCount = 0;

    const seatMatrix = auditoriumSeats.map((seat) => {
      const seatId = Number(seat.id);
      let realtimeStatus: ShowtimeSeatStatus | 'BLOCKED' =
        ShowtimeSeatStatus.AVAILABLE;

      if (seat.status === 'DISABLED' || seat.status === 'MAINTENANCE') {
        realtimeStatus = 'BLOCKED';
      } else {
        const dbSeat = dbSeatStatusMap.get(seatId);

        if (dbSeat && dbSeat.status === 'BOOKED') {
          realtimeStatus = ShowtimeSeatStatus.BOOKED;
        } else if (redisHeldSeatsMap.has(seatId)) {
          realtimeStatus = ShowtimeSeatStatus.HOLDING;
        } else if (
          dbSeat &&
          dbSeat.status === 'HOLDING' &&
          dbSeat.holdExpiresAt &&
          new Date(dbSeat.holdExpiresAt) > now
        ) {
          realtimeStatus = ShowtimeSeatStatus.HOLDING;
        } else {
          realtimeStatus = ShowtimeSeatStatus.AVAILABLE;
          availableCount++;
        }
      }

      const price = seatPriceMap.get(String(seat.seatTypeId)) ?? 0;

      return {
        seatId,
        rowLabel: seat.rowLabel,
        columnNumber: seat.columnNumber,
        seatNumber: seat.seatNumber,
        seatType: seat.seatType?.code ?? null,
        status: realtimeStatus,
        price,
      };
    });

    return {
      showtimeId,
      auditoriumName: showtime.auditorium?.name ?? '',
      totalSeats: seatMatrix.length,
      availableSeats: availableCount,
      seatMatrix,
    };
  }

  /** Tính toán bảng giá vé tương ứng với từng loại ghế của suất chiếu */
  private async getSeatPriceMap(
    showtime: Showtime,
  ): Promise<Map<string, number>> {
    return this.priceCalculationService.getSeatPriceMap(showtime);
  }
}
