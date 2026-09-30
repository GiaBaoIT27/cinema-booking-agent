import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Showtime } from '../../domain/entities/showtime.entity.js';
import { Auditorium } from '#modules/cinemas/entities/auditorium.entity.js';
import { Movie } from '#modules/movies/entities/movie.entity.js';
import { Seat } from '#modules/cinemas/entities/seat.entity.js';
import { SeatType } from '#modules/seat-types/entities/seat-type.entity.js';
import { ShowtimeSeat } from '../../domain/entities/showtime-seat.entity.js';
import { ShowtimeSeatPrice } from '../../domain/entities/showtime-seat-price.entity.js';
import { PriceRule } from '../../domain/entities/price-rules.entity.js';
import { DayType } from '../../domain/enums/day-type.enum.js';
import { GetShowtimesQueryDto } from '../dto/get-showtimes-query.dto.js';
import { CreateShowtimeDto } from '../dto/create-showtime.dto.js';
import { UpdateShowtimeDto } from '../dto/update-showtime.dto.js';
import { UpdateShowtimeStatusDto } from '../dto/update-showtime-status.dto.js';
import { ShowtimeSeatMatrixResponseDto } from '../dto/showtime-seat-matrix-response.dto.js';
import { OverrideSeatPriceDto } from '../dto/override-seat-price.dto.js';
import { BatchOverrideSeatPricesDto } from '../dto/batch-override-seat-prices.dto.js';
import { Ticket } from '#modules/orders/entities/ticket.entity.js';
import { TicketStatus } from '#modules/orders/enums/ticket-status.enum.js';
import { MovieStatus } from '../../../movies/enums/movie-status.enum.js';
import { ShowtimeStatus } from '../../domain/enums/showtime-status.enum.js';
import { ShowtimeSeatStatus } from '../../domain/enums/showtime-seat-status.js';
import {
  SHOWTIME_REDIS_KEYS,
  SHOWTIME_REDIS_TTL,
} from '../../constants/showtime-redis.constant.js';
import { RedisService } from '#src/core/redis/redis.service.js';

@Injectable()
export class ShowtimeService {
  private readonly logger = new Logger(ShowtimeService.name);
  // Giá mặc định áp dụng khi không tìm thấy PriceRule nào khớp (fallback an toàn)
  private readonly DEFAULT_BASE_PRICE = 100000;

  // Ma trận định nghĩa các chuyển đổi trạng thái hợp lệ (State Machine Matrix)
  private readonly ALLOWED_STATUS_TRANSITIONS: Record<
    ShowtimeStatus,
    ShowtimeStatus[]
  > = {
    [ShowtimeStatus.SCHEDULED]: [ShowtimeStatus.OPEN, ShowtimeStatus.CANCELLED],
    [ShowtimeStatus.OPEN]: [ShowtimeStatus.CLOSED, ShowtimeStatus.CANCELLED],
    [ShowtimeStatus.CLOSED]: [], // CLOSED là trạng thái kết thúc, không thể chuyển đổi
    [ShowtimeStatus.CANCELLED]: [], // CANCELLED là trạng thái kết thúc, không thể chuyển đổi
  };

  constructor(
    @InjectRepository(Showtime)
    private readonly showtimeRepository: Repository<Showtime>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    @InjectRepository(ShowtimeSeat)
    private readonly showtimeSeatRepository: Repository<ShowtimeSeat>,
    @InjectRepository(ShowtimeSeatPrice)
    private readonly showtimeSeatPriceRepository: Repository<ShowtimeSeatPrice>,
    @InjectRepository(PriceRule)
    private readonly priceRuleRepository: Repository<PriceRule>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  // GET api/v1/showtimes
  async findAll(
    queryDto: GetShowtimesQueryDto,
  ): Promise<{ data: Showtime[]; totalElements: number }> {
    const {
      movieId,
      cineplexId,
      date,
      projectionType,
      status,
      page = 1,
      limit = 20,
    } = queryDto;

    // Nếu không truyền date, mặc định lấy ngày hôm nay (YYYY-MM-DD UTC)
    const targetDate = date ?? new Date().toISOString().split('T')[0];

    // Tạo Query String chuẩn làm Cache Key
    const queryStr = `m=${movieId ?? 'null'}:c=${cineplexId ?? 'null'}:d=${targetDate}:pt=${projectionType ?? 'null'}:st=${status ?? 'null'}:p=${page}:l=${limit}`;
    const cacheKey = SHOWTIME_REDIS_KEYS.LIST(queryStr);

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const queryBuilder = this.showtimeRepository
          .createQueryBuilder('s')
          .innerJoinAndSelect('s.movie', 'm')
          .innerJoinAndSelect('s.auditorium', 'a')
          .innerJoinAndSelect('a.cineplex', 'c');

        if (movieId) {
          queryBuilder.andWhere('s.movieId = :movieId', { movieId });
        }

        if (cineplexId) {
          queryBuilder.andWhere('c.id = :cineplexId', { cineplexId });
        }

        if (projectionType) {
          queryBuilder.andWhere('s.projectionType = :projectionType', {
            projectionType,
          });
        }

        if (status) {
          queryBuilder.andWhere('s.status = :status', { status });
        }

        // Lọc khoảng thời gian [00:00:00, 23:59:59.999] trong ngày để tận dụng Database Index
        const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
        const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);
        queryBuilder.andWhere(
          's.startTime >= :startOfDay AND s.startTime <= :endOfDay',
          { startOfDay, endOfDay },
        );

        // Sắp xếp tăng dần theo thời gian chiếu
        queryBuilder.orderBy('s.startTime', 'ASC');

        // Phân trang
        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);

        const [showtimes, totalElements] = await queryBuilder.getManyAndCount();

        return { data: showtimes, totalElements };
      },
      SHOWTIME_REDIS_TTL.LIST_SECONDS, // TTL = 15 phút (900s)
    );
  }

  // POST api/v1/showtimes
  async create(createDto: CreateShowtimeDto): Promise<Showtime> {
    const startTimeDate = new Date(createDto.startTime);
    const now = new Date();

    // Validate thời gian bắt đầu phải lớn hơn thời điểm hiện tại
    if (startTimeDate <= now) {
      throw new BadRequestException({
        errorCode: 'INVALID_START_TIME',
        message: 'Thời gian bắt đầu suất chiếu phải lớn hơn thời điểm hiện tại',
      });
    }

    const cleaningMinutes = createDto.cleaningMinutes ?? 15;

    // Thực thi trong Database Transaction
    const createdShowtime = await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        // 1. Kiểm tra Auditorium có tồn tại không
        const auditorium = await transactionalEntityManager.findOne(
          Auditorium,
          {
            where: { id: createDto.auditoriumId.toString() },
          },
        );

        if (!auditorium) {
          throw new NotFoundException({
            errorCode: 'AUDITORIUM_NOT_FOUND',
            message: `Phòng chiếu với ID ${createDto.auditoriumId} không tồn tại`,
          });
        }

        // 2. Kiểm tra Movie có tồn tại và trạng thái hợp lệ (SHOWING / UPCOMING)
        const movie = await transactionalEntityManager.findOne(Movie, {
          where: { id: createDto.movieId.toString() },
        });

        if (!movie) {
          throw new NotFoundException({
            errorCode: 'MOVIE_NOT_FOUND',
            message: `Bộ phim với ID ${createDto.movieId} không tồn tại`,
          });
        }

        if (movie.status === MovieStatus.ENDED) {
          throw new BadRequestException({
            errorCode: 'MOVIE_NOT_ELIGIBLE_FOR_SHOWTIME',
            message: 'Không thể tạo suất chiếu cho phim đã kết thúc (ENDED)',
          });
        }

        // 3. Tự động tính toán Thời gian Kết thúc (endTime = startTime + durationMinutes + cleaningMinutes)
        const totalDurationMinutes = movie.durationMinutes + cleaningMinutes;
        const endTimeDate = new Date(
          startTimeDate.getTime() + totalDurationMinutes * 60 * 1000,
        );

        // 4. Thuật toán Kiểm tra Trùng lịch chiếu (Overlapping Check)
        // Hai khoảng thời gian [S1, E1] và [S2, E2] trùng nhau khi: S1 < E2 AND E1 > S2
        const overlappingShowtime = await transactionalEntityManager
          .createQueryBuilder(Showtime, 's')
          .where('s.auditoriumId = :auditoriumId', {
            auditoriumId: createDto.auditoriumId,
          })
          .andWhere('s.status != :cancelledStatus', {
            cancelledStatus: ShowtimeStatus.CANCELLED,
          })
          .andWhere('s.startTime < :endTime', { endTime: endTimeDate })
          .andWhere('s.endTime > :startTime', { startTime: startTimeDate })
          .getOne();

        if (overlappingShowtime) {
          throw new ConflictException({
            errorCode: 'SHOWTIME_SCHEDULE_OVERLAP',
            message:
              'Khung thời gian suất chiếu bị trùng lấp với một suất chiếu khác tại cùng phòng chiếu',
          });
        }

        // 5. Khởi tạo bản ghi suất chiếu mới
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

    // 6. Evict Cache danh sách suất chiếu
    await this.redisService.delByPattern(SHOWTIME_REDIS_KEYS.PATTERN_LIST);

    return createdShowtime;
  }

  // GET api/v1/showtimes/:id
  async findOne(id: number): Promise<Showtime> {
    const cacheKey = SHOWTIME_REDIS_KEYS.DETAIL(id);

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const showtime = await this.showtimeRepository
          .createQueryBuilder('s')
          .innerJoinAndSelect('s.movie', 'm')
          .innerJoinAndSelect('s.auditorium', 'a')
          .innerJoinAndSelect('a.cineplex', 'c')
          .where('s.id = :id', { id: id.toString() })
          .getOne();

        if (!showtime) {
          throw new NotFoundException({
            errorCode: 'SHOWTIME_NOT_FOUND',
            message: `Suất chiếu với ID ${id} không tồn tại trên hệ thống`,
          });
        }

        return showtime;
      },
      SHOWTIME_REDIS_TTL.DETAIL_SECONDS, // TTL = 30 phút (1800s)
    );
  }

  // PUT api/v1/showtimes/:id
  async update(id: number, updateDto: UpdateShowtimeDto): Promise<Showtime> {
    const startTimeDate = new Date(updateDto.startTime);
    const now = new Date();

    if (startTimeDate <= now) {
      throw new BadRequestException({
        errorCode: 'INVALID_START_TIME',
        message: 'Thời gian bắt đầu suất chiếu phải lớn hơn thời điểm hiện tại',
      });
    }

    const cleaningMinutes = updateDto.cleaningMinutes ?? 15;

    // Thực thi trong Database Transaction
    const updatedShowtime = await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        // 1. Kiểm tra tồn tại suất chiếu (404 Not Found)
        const showtime = await transactionalEntityManager.findOne(Showtime, {
          where: { id: id.toString() },
        });

        if (!showtime) {
          throw new NotFoundException({
            errorCode: 'SHOWTIME_NOT_FOUND',
            message: `Suất chiếu với ID ${id} không tồn tại trên hệ thống`,
          });
        }

        // 2. Kiểm tra Trạng thái: Chỉ cho phép chỉnh sửa khi suất chiếu ở trạng thái SCHEDULED (400 Bad Request)
        if (showtime.status !== ShowtimeStatus.SCHEDULED) {
          throw new BadRequestException({
            errorCode: 'SHOWTIME_LOCKED_CANNOT_UPDATE',
            message:
              'Suất chiếu đã mở bán (OPEN) hoặc đã kết thúc/hủy, không thể chỉnh sửa thông tin',
          });
        }

        // 3. Kiểm tra Auditorium có tồn tại không
        const auditorium = await transactionalEntityManager.findOne(
          Auditorium,
          {
            where: { id: updateDto.auditoriumId.toString() },
          },
        );

        if (!auditorium) {
          throw new NotFoundException({
            errorCode: 'AUDITORIUM_NOT_FOUND',
            message: `Phòng chiếu với ID ${updateDto.auditoriumId} không tồn tại`,
          });
        }

        // 4. Kiểm tra Movie có tồn tại và trạng thái hợp lệ (SHOWING / UPCOMING)
        const movie = await transactionalEntityManager.findOne(Movie, {
          where: { id: updateDto.movieId.toString() },
        });

        if (!movie) {
          throw new NotFoundException({
            errorCode: 'MOVIE_NOT_FOUND',
            message: `Bộ phim với ID ${updateDto.movieId} không tồn tại`,
          });
        }

        if (movie.status === MovieStatus.ENDED) {
          throw new BadRequestException({
            errorCode: 'MOVIE_NOT_ELIGIBLE_FOR_SHOWTIME',
            message:
              'Không thể cập nhật suất chiếu cho phim đã kết thúc (ENDED)',
          });
        }

        // 5. Tự động tính toán lại end_time
        const totalDurationMinutes = movie.durationMinutes + cleaningMinutes;
        const endTimeDate = new Date(
          startTimeDate.getTime() + totalDurationMinutes * 60 * 1000,
        );

        // 6. Thuật toán Kiểm tra Trùng lịch chiếu (Overlapping Check - Loại trừ ID hiện tại)
        const overlappingShowtime = await transactionalEntityManager
          .createQueryBuilder(Showtime, 's')
          .where('s.auditoriumId = :auditoriumId', {
            auditoriumId: updateDto.auditoriumId,
          })
          .andWhere('s.id != :id', { id: id.toString() })
          .andWhere('s.status != :cancelledStatus', {
            cancelledStatus: ShowtimeStatus.CANCELLED,
          })
          .andWhere('s.startTime < :endTime', { endTime: endTimeDate })
          .andWhere('s.endTime > :startTime', { startTime: startTimeDate })
          .getOne();

        if (overlappingShowtime) {
          throw new ConflictException({
            errorCode: 'SHOWTIME_SCHEDULE_OVERLAP',
            message:
              'Khung thời gian suất chiếu bị trùng lấp với một suất chiếu khác tại cùng phòng chiếu',
          });
        }

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

    // 8. Evict Cache chi tiết suất chiếu và danh sách
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
    // 1. Kiểm tra tồn tại suất chiếu (404 Not Found)
    const showtime = await this.showtimeRepository.findOne({
      where: { id: id.toString() },
    });

    if (!showtime) {
      throw new NotFoundException({
        errorCode: 'SHOWTIME_NOT_FOUND',
        message: `Suất chiếu với ID ${id} không tồn tại trên hệ thống`,
      });
    }

    const currentStatus = showtime.status;
    const targetStatus = updateStatusDto.status;

    if (currentStatus === targetStatus) {
      return showtime;
    }

    // 2. Kiểm tra Quy tắc Chuyển đổi Trạng thái (State Machine Validation)
    const allowedNextStatuses = this.ALLOWED_STATUS_TRANSITIONS[currentStatus];

    if (!allowedNextStatuses.includes(targetStatus)) {
      throw new BadRequestException({
        errorCode: 'INVALID_STATUS_TRANSITION',
        message: `Không thể chuyển trạng thái suất chiếu từ ${currentStatus} sang ${targetStatus}`,
      });
    }

    // 3. Xử lý logic nghiệp vụ đặc thù: OPEN -> CANCELLED (Kích hoạt luồng Hoàn tiền)
    if (
      currentStatus === ShowtimeStatus.OPEN &&
      targetStatus === ShowtimeStatus.CANCELLED
    ) {
      this.logger.warn(
        `Suất chiếu ID ${id} bị HỦY khi đang OPEN. Tiến hành kích hoạt luồng Hoàn tiền tự động (Auto-Refund) cho khách hàng.`,
      );
      await this.triggerAutoRefundProcess(id);
    }

    // 4. Cập nhật DB
    showtime.status = targetStatus;
    const updatedShowtime = await this.showtimeRepository.save(showtime);

    // 5. Evict Cache: Xóa Cache chi tiết suất chiếu và Cache danh sách
    await Promise.all([
      this.redisService.del(SHOWTIME_REDIS_KEYS.DETAIL(id)),
      this.redisService.delByPattern(SHOWTIME_REDIS_KEYS.PATTERN_LIST),
    ]);

    return updatedShowtime;
  }

  // 6. GET api/v1/showtimes/:id/seats
  async getSeatMatrix(
    showtimeId: number,
  ): Promise<ShowtimeSeatMatrixResponseDto> {
    // BƯỚC 1: Một câu Query duy nhất (Single-Trip Query) lấy trọn gói:
    // Suất chiếu -> Phòng chiếu -> Tất cả Ghế vật lý -> Loại ghế & Trạng thái vé đã bán trong DB
    const showtime = await this.showtimeRepository
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.auditorium', 'a')
      .innerJoinAndSelect('a.seats', 'seat')
      .leftJoinAndSelect('seat.seatType', 'st')
      .leftJoinAndSelect('s.showtimeSeats', 'ss', 'ss.seatId = seat.id')
      .where('s.id = :showtimeId', { showtimeId })
      .orderBy('seat.rowLabel', 'ASC')
      .addOrderBy('seat.seatNumber', 'ASC')
      .getOne();

    if (!showtime) {
      throw new NotFoundException({
        errorCode: 'SHOWTIME_NOT_FOUND',
        message: `Suất chiếu với ID ${showtimeId} không tồn tại trên hệ thống`,
      });
    }

    const auditoriumSeats = showtime.auditorium?.seats ?? [];
    const dbShowtimeSeats = showtime.showtimeSeats ?? [];
    const now = new Date();

    // BƯỚC 1.5: Bảng giá động của suất chiếu (PriceRule + SeatType + ShowtimeSeatPrice override)
    const seatPriceMap = await this.getSeatPriceMap(showtime);

    // BƯỚC 2: Map trạng thái từ DB để tìm kiếm với độ phức tạp O(1)
    const dbSeatStatusMap = new Map<number, any>();
    for (const ss of dbShowtimeSeats) {
      dbSeatStatusMap.set(Number(ss.seatId), ss);
    }

    // BƯỚC 3: Đọc dữ liệu giữ ghế tạm thời Realtime từ Redis Hash (Sử dụng hgetall mới bổ sung)
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
        // Bỏ qua nếu data lưu trong Redis Hash bị lỗi format JSON
      }
    }

    // BƯỚC 4: Tổng hợp ma trận ghế Realtime
    let availableCount = 0;

    const seatMatrix = auditoriumSeats.map((seat) => {
      const seatId = Number(seat.id);
      let realtimeStatus: ShowtimeSeatStatus | 'BLOCKED' =
        ShowtimeSeatStatus.AVAILABLE;

      // 4.1. Ghế hỏng / bảo trì
      if (seat.status === 'DISABLED' || seat.status === 'MAINTENANCE') {
        realtimeStatus = 'BLOCKED';
      } else {
        const dbSeat = dbSeatStatusMap.get(seatId);

        // 4.2. Trạng thái đã bán dứt điểm (BOOKED)
        if (dbSeat && dbSeat.status === 'BOOKED') {
          realtimeStatus = ShowtimeSeatStatus.BOOKED;
        }
        // 4.3. Trạng thái đang giữ ghế (Redis giữ ưu tiên cao hơn DB)
        else if (redisHeldSeatsMap.has(seatId)) {
          realtimeStatus = ShowtimeSeatStatus.HOLDING; // Hoặc trạng thái tương đương của bạn
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

      // 4.4. Giá vé động: ShowtimeSeatPrice (override) > PriceRule.basePrice x SeatType (multiplier + surcharge)
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
      auditoriumName: showtime.auditorium.name,
      totalSeats: seatMatrix.length,
      availableSeats: availableCount,
      seatMatrix,
    };
  }

  // 7. GET api/v1/showtimes/:id/seat-prices
  async getSeatPrices(showtimeId: number) {
    const cacheKey = `showtime_seat_prices:st=${showtimeId}`;

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const result = await this.showtimeSeatPriceRepository
          .createQueryBuilder('ssp')
          .innerJoinAndSelect('ssp.seatType', 'st')
          .where('ssp.showtimeId = :showtimeId', {
            showtimeId: showtimeId.toString(),
          })
          .orderBy('st.id', 'ASC')
          .getMany();

        if (!result || result.length === 0) {
          throw new NotFoundException({
            errorCode: 'SEAT_PRICES_NOT_GENERATED',
            message: 'Bảng giá cho suất chiếu này chưa được tạo',
          });
        }

        const formattedPrices = result.map((ssp) => ({
          seatTypeId: Number(ssp.seatTypeId),
          seatTypeCode: ssp.seatType.code,
          seatTypeName: ssp.seatType.name,
          priceMultiplier: Number(ssp.seatType.priceMultiplier),
          surchargeAmount: Number(ssp.seatType.surchargeAmount),
          finalPrice: Number(ssp.finalPrice),
          isOverridden: ssp.isOverridden,
          updatedAt: ssp.updatedAt,
        }));

        return {
          showtimeId,
          seatPrices: formattedPrices,
        };
      },
      43200, // 12 hours TTL
    );
  }

  // 8. POST api/v1/showtimes/:id/seat-prices/generate
  async generateSeatPrices(showtimeId: number, isForce: boolean) {
    return await this.dataSource.transaction(async (manager) => {
      // Kiểm tra suất chiếu
      const showtime = await manager.findOne(Showtime, {
        where: { id: showtimeId.toString() },
        relations: {
          auditorium: {
            seats: {
              seatType: true,
            },
          },
        },
      });

      if (!showtime) {
        throw new NotFoundException({
          errorCode: 'SHOWTIME_NOT_FOUND',
          message: 'Không tìm thấy suất chiếu',
        });
      }

      // Ràng buộc đặt vé
      const bookedTicketsCount = await manager.count(Ticket, {
        where: {
          showtimeId: showtimeId.toString(),
          status: In([TicketStatus.VALID, TicketStatus.CHECKED_IN]),
        },
      });

      if (bookedTicketsCount > 0) {
        throw new ConflictException({
          errorCode: 'SHOWTIME_HAS_BOOKED_TICKETS',
          message:
            'Không thể tính lại bảng giá vì đã có vé được đặt hoặc thanh toán',
        });
      }

      const basePrice = await this.resolveBasePrice(showtime);

      // Tính toán & Upsert
      const seatTypes = new Map<string, SeatType>();
      for (const seat of showtime.auditorium?.seats ?? []) {
        if (seat.seatType && !seatTypes.has(String(seat.seatTypeId))) {
          seatTypes.set(String(seat.seatTypeId), seat.seatType);
        }
      }

      let processedCount = 0;
      for (const [seatTypeIdStr, seatType] of seatTypes) {
        const existingPrice = await manager.findOne(ShowtimeSeatPrice, {
          where: {
            showtimeId: showtimeId.toString(),
            seatTypeId: seatTypeIdStr,
          },
        });

        if (existingPrice && existingPrice.isOverridden && !isForce) {
          continue;
        }

        const finalPrice = Math.round(
          basePrice * Number(seatType.priceMultiplier ?? 1) +
            Number(seatType.surchargeAmount ?? 0),
        );

        if (existingPrice) {
          existingPrice.finalPrice = finalPrice;
          existingPrice.isOverridden = false;
          await manager.save(existingPrice);
        } else {
          const newPrice = manager.create(ShowtimeSeatPrice, {
            showtimeId: showtimeId.toString(),
            seatTypeId: seatTypeIdStr,
            finalPrice,
            isOverridden: false,
          });
          await manager.save(newPrice);
        }
        processedCount++;
      }

      await this.redisService.del(`showtime_seat_prices:st=${showtimeId}`);
      await this.redisService.del(SHOWTIME_REDIS_KEYS.PRICES(showtimeId));

      return {
        showtimeId,
        appliedBasePrice: basePrice,
        totalSeatTypesProcessed: processedCount,
        generatedAt: new Date(),
      };
    });
  }

  // 9. PATCH api/v1/showtimes/:id/seat-prices/:seatTypeId
  async overrideSeatPrice(
    showtimeId: number,
    seatTypeId: number,
    overrideDto: OverrideSeatPriceDto,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      // Kiểm tra suất chiếu
      const showtimeCount = await manager.count(Showtime, {
        where: { id: showtimeId.toString() },
      });
      if (showtimeCount === 0) {
        throw new NotFoundException({
          errorCode: 'SHOWTIME_NOT_FOUND',
          message: 'Không tìm thấy suất chiếu',
        });
      }

      // Ràng buộc loại ghế đã bán
      const bookedTicketsCount = await manager
        .createQueryBuilder(Ticket, 't')
        .innerJoin('t.seat', 's')
        .where('t.showtimeId = :showtimeId', {
          showtimeId: showtimeId.toString(),
        })
        .andWhere('s.seatTypeId = :seatTypeId', {
          seatTypeId: seatTypeId.toString(),
        })
        .andWhere('t.status IN (:...statuses)', {
          statuses: [TicketStatus.VALID, TicketStatus.CHECKED_IN],
        })
        .getCount();

      if (bookedTicketsCount > 0) {
        throw new ConflictException({
          errorCode: 'SEAT_TYPE_HAS_BOOKED_TICKETS',
          message: 'Không thể thay đổi giá vì loại ghế này đã có vé được đặt',
        });
      }

      let seatPrice = await manager.findOne(ShowtimeSeatPrice, {
        where: {
          showtimeId: showtimeId.toString(),
          seatTypeId: seatTypeId.toString(),
        },
      });

      if (!seatPrice) {
        seatPrice = manager.create(ShowtimeSeatPrice, {
          showtimeId: showtimeId.toString(),
          seatTypeId: seatTypeId.toString(),
        });
      }

      seatPrice.finalPrice = overrideDto.finalPrice;
      seatPrice.isOverridden = true;
      const updatedSeatPrice = await manager.save(seatPrice);

      await this.redisService.del(`showtime_seat_prices:st=${showtimeId}`);
      await this.redisService.del(SHOWTIME_REDIS_KEYS.PRICES(showtimeId));

      return {
        showtimeId,
        seatTypeId,
        finalPrice: updatedSeatPrice.finalPrice,
        isOverridden: updatedSeatPrice.isOverridden,
        updatedAt: updatedSeatPrice.updatedAt,
      };
    });
  }

  // 10. PUT api/v1/showtimes/:id/seat-prices
  async batchOverrideSeatPrices(
    showtimeId: number,
    batchDto: BatchOverrideSeatPricesDto,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const showtimeCount = await manager.count(Showtime, {
        where: { id: showtimeId.toString() },
      });
      if (showtimeCount === 0) {
        throw new NotFoundException({
          errorCode: 'SHOWTIME_NOT_FOUND',
          message: 'Không tìm thấy suất chiếu',
        });
      }

      for (const item of batchDto.items) {
        const bookedTicketsCount = await manager
          .createQueryBuilder(Ticket, 't')
          .innerJoin('t.seat', 's')
          .where('t.showtimeId = :showtimeId', {
            showtimeId: showtimeId.toString(),
          })
          .andWhere('s.seatTypeId = :seatTypeId', {
            seatTypeId: item.seatTypeId.toString(),
          })
          .andWhere('t.status IN (:...statuses)', {
            statuses: [TicketStatus.VALID, TicketStatus.CHECKED_IN],
          })
          .getCount();

        if (bookedTicketsCount > 0) {
          throw new ConflictException({
            errorCode: 'SEAT_TYPE_HAS_BOOKED_TICKETS',
            message: `Không thể thay đổi giá vì loại ghế ID ${item.seatTypeId} đã có vé được đặt`,
          });
        }

        let seatPrice = await manager.findOne(ShowtimeSeatPrice, {
          where: {
            showtimeId: showtimeId.toString(),
            seatTypeId: item.seatTypeId.toString(),
          },
        });

        if (!seatPrice) {
          seatPrice = manager.create(ShowtimeSeatPrice, {
            showtimeId: showtimeId.toString(),
            seatTypeId: item.seatTypeId.toString(),
          });
        }

        seatPrice.finalPrice = item.finalPrice;
        seatPrice.isOverridden = true;
        await manager.save(seatPrice);
      }

      await this.redisService.del(`showtime_seat_prices:st=${showtimeId}`);
      await this.redisService.del(SHOWTIME_REDIS_KEYS.PRICES(showtimeId));

      return {
        showtimeId,
        updatedCount: batchDto.items.length,
        updatedAt: new Date(),
      };
    });
  }

  /**
   * Xác định DayType (WEEKDAY / WEEKEND) từ thời gian bắt đầu suất chiếu.
   * TODO: HOLIDAY cần bảng cấu hình ngày lễ riêng để xác định chính xác.
   */
  private resolveDayType(startTime: Date): DayType {
    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      weekday: 'short',
    });
    const dayOfWeekStr = dayFormatter.format(startTime);
    return dayOfWeekStr === 'Sun' || dayOfWeekStr === 'Sat'
      ? DayType.WEEKEND
      : DayType.WEEKDAY;
  }

  /**
   * Tra giá gốc (base price) của suất chiếu từ bảng price_rules.
   * Ưu tiên: Rule của Cineplex cụ thể > Rule toàn hệ thống (cineplex_id NULL).
   * Điều kiện khớp: projectionType, dayType và khung giờ [startTime, endTime) chứa giờ chiếu.
   */
  private async resolveBasePrice(showtime: Showtime): Promise<number> {
    // Lấy chuỗi HH:mm:ss từ thời điểm bắt đầu suất chiếu theo múi giờ VN (Asia/Ho_Chi_Minh)
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const showtimeStr = timeFormatter.format(showtime.startTime);
    const dayType = this.resolveDayType(showtime.startTime);

    const rule = await this.priceRuleRepository
      .createQueryBuilder('pr')
      .where('pr.projectionType = :projectionType', {
        projectionType: showtime.projectionType,
      })
      .andWhere('pr.dayType = :dayType', { dayType })
      .andWhere('(pr.cineplexId = :cineplexId OR pr.cineplexId IS NULL)', {
        cineplexId: showtime.auditorium?.cineplexId,
      })
      .andWhere('pr.startTime <= :showtimeStr AND pr.endTime > :showtimeStr', {
        showtimeStr,
      })
      .orderBy('pr.cineplexId IS NULL', 'ASC') // Rule theo Cineplex ưu tiên trước rule toàn hệ thống
      .addOrderBy('pr.basePrice', 'DESC')
      .getOne();

    if (!rule) {
      this.logger.warn(
        `Không tìm thấy PriceRule phù hợp cho suất chiếu ${showtime.id} ` +
          `(projection=${showtime.projectionType}, dayType=${dayType}, time=${showtimeStr}, ` +
          `cineplex=${showtime.auditorium?.cineplexId}). Dùng giá mặc định ${this.DEFAULT_BASE_PRICE}.`,
      );
      return this.DEFAULT_BASE_PRICE;
    }

    return rule.basePrice;
  }

  /**
   * Build bảng giá động cho toàn bộ loại ghế của suất chiếu (keyed theo seatTypeId), có Cache Redis.
   * Công thức: finalPrice = round(basePrice * priceMultiplier + surchargeAmount)
   * Nếu có bản ghi ShowtimeSeatPrice (override thủ công) thì ưu tiên finalPrice trong DB.
   */
  private async getSeatPriceMap(
    showtime: Showtime,
  ): Promise<Map<string, number>> {
    const cacheKey = SHOWTIME_REDIS_KEYS.PRICES(showtime.id);

    const priceRecord = await this.redisService.getOrSet(
      cacheKey,
      async () => {
        let seatPrices = await this.showtimeSeatPriceRepository.find({
          where: { showtimeId: showtime.id.toString() },
        });

        // Nếu chưa có bảng giá snapshot, tự động sinh (Lazy generation)
        if (seatPrices.length === 0) {
          try {
            await this.generateSeatPrices(Number(showtime.id), false);
            seatPrices = await this.showtimeSeatPriceRepository.find({
              where: { showtimeId: showtime.id.toString() },
            });
          } catch (e) {
            this.logger.error(
              `Lỗi khi tự động sinh giá vé cho suất chiếu ${showtime.id}`,
              e,
            );
          }
        }

        const prices: Record<string, number> = {};
        for (const sp of seatPrices) {
          prices[sp.seatTypeId] = Number(sp.finalPrice);
        }
        return prices;
      },
      SHOWTIME_REDIS_TTL.PRICES_SECONDS, // TTL = 30 phút
    );

    return new Map(Object.entries(priceRecord ?? {}));
  }

  /**
   * Kích hoạt luồng Hoàn tiền tự động (Auto-Refund) cho các vé đã mua thuộc suất chiếu bị hủy
   */
  private async triggerAutoRefundProcess(showtimeId: number): Promise<void> {
    // TODO: Phát sự kiện EventEmitter hoặc đẩy Message vào RabbitMQ/Kafka/BullMQ
    // để xử lý hoàn tiền bất đồng bộ (Async Auto-Refund) cho toàn bộ Booking liên quan
  }
}
