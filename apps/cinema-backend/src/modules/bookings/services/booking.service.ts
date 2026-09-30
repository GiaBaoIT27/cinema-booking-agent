import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Showtime } from '#modules/showtimes/domain/entities/showtime.entity.js';
import { ShowtimeSeat } from '#modules/showtimes/domain/entities/showtime-seat.entity.js';
import { ShowtimeSeatPrice } from '#modules/showtimes/domain/entities/showtime-seat-price.entity.js';
import { Seat } from '#modules/cinemas/entities/seat.entity.js';
import { SeatStatus } from '#modules/cinemas/enums/seat-status.enum.js';
import { ShowtimeStatus } from '#src/modules/showtimes/domain/enums/showtime-status.enum.js';
import { ShowtimeSeatStatus } from '#src/modules/showtimes/domain/enums/showtime-seat-status.js';
import { SeatLockService } from './seat-lock.service.js';
import { RedisService } from '#src/core/redis/redis.service.js';
import { HoldSeatsDto } from '../dto/hold-seats.dto.js';
import { ReleaseSeatsDto } from '../dto/release-seats.dto.js';
import {
  BOOKING_REDIS_KEYS,
  DEFAULT_SEAT_LOCK_TTL_MS,
} from '../constants/booking-redis.constant.js';

// DTO nội bộ cho OrderService gọi vào BookingService
export interface ValidateHoldingSeatsInput {
  userId: string;
  showtimeId: string;
  seatIds: string[];
}

export interface ValidateHoldingSeatsResult {
  isValid: boolean;
  subtotalTickets: number;
  seats: Array<{
    seatId: string;
    seatTypeId: string;
    price: number;
    ticketCode: string;
  }>;
}

export interface ReleaseSeatsForOrderInput {
  showtimeId: string;
  seatIds: string[];
  userId?: string;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(Showtime)
    private readonly showtimeRepository: Repository<Showtime>,
    @InjectRepository(ShowtimeSeat)
    private readonly showtimeSeatRepository: Repository<ShowtimeSeat>,
    @InjectRepository(ShowtimeSeatPrice)
    private readonly showtimeSeatPriceRepository: Repository<ShowtimeSeatPrice>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
    private readonly seatLockService: SeatLockService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * =====================================================================
   * 1. POST /api/v1/bookings/hold - Giữ ghế (Hold Seats)
   * =====================================================================
   * Luồng xử lý:
   *  1. Validate suất chiếu (tồn tại & status = OPEN)
   *  2. Validate danh sách ghế (tồn tại, thuộc phòng chiếu, status = ACTIVE)
   *  3. Kiểm tra trạng thái ghế trong DB (showtime_seats): không bị BOOKED
   *  4. Acquire Redis Lock cho từng ghế (atomic, rollback nếu 1 ghế thất bại)
   *  5. Ghi trạng thái HOLDING vào Redis Hash để endpoint /seats đọc realtime
   *  6. Upsert trạng thái HOLDING vào bảng showtime_seats (backup DB)
   *  7. Trả về thông tin ghế đã giữ + thời gian hết hạn
   */
  async holdSeats(userId: string, dto: HoldSeatsDto) {
    const { showtimeId, seatIds } = dto;

    // 1. Validate suất chiếu
    const showtime = await this.showtimeRepository.findOne({
      where: { id: showtimeId.toString() },
      relations: { auditorium: true },
    });

    if (!showtime) {
      throw new NotFoundException({
        errorCode: 'SHOWTIME_NOT_FOUND',
        message: `Suất chiếu với ID ${showtimeId} không tồn tại`,
      });
    }

    if (
      showtime.status !== ShowtimeStatus.OPEN &&
      showtime.status !== ShowtimeStatus.SCHEDULED
    ) {
      throw new BadRequestException({
        errorCode: 'SHOWTIME_NOT_OPEN',
        message: 'Suất chiếu chưa mở bán hoặc đã đóng, không thể giữ ghế',
      });
    }

    // 2. Validate danh sách ghế
    const uniqueSeatIds = Array.from(new Set(seatIds));
    const seatIdStrings = uniqueSeatIds.map(String);
    const seats = await this.seatRepository.find({
      where: {
        id: In(seatIdStrings),
        auditoriumId: showtime.auditoriumId,
      },
    });

    if (seats.length !== seatIdStrings.length) {
      const foundIds = seats.map((s) => Number(s.id));
      const invalidIds = seatIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException({
        errorCode: 'INVALID_SEAT_IDS',
        message: `Ghế không hợp lệ hoặc không thuộc phòng chiếu: [${invalidIds.join(', ')}]`,
      });
    }

    // Kiểm tra ghế ACTIVE (không bảo trì / hỏng)
    const disabledSeats = seats.filter((s) => s.status !== SeatStatus.ACTIVE);
    if (disabledSeats.length > 0) {
      throw new BadRequestException({
        errorCode: 'SEATS_NOT_AVAILABLE',
        message: `Ghế [${disabledSeats.map((s) => s.seatNumber).join(', ')}] đang bảo trì hoặc vô hiệu hóa`,
      });
    }

    // 3. Kiểm tra trạng thái ghế trong DB (đã bán dứt điểm chưa)
    const bookedSeats = await this.showtimeSeatRepository.find({
      where: {
        showtimeId: showtimeId.toString(),
        seatId: In(seatIdStrings),
        status: ShowtimeSeatStatus.BOOKED,
      },
    });

    if (bookedSeats.length > 0) {
      throw new ConflictException({
        errorCode: 'SEATS_ALREADY_BOOKED',
        message: `Ghế [${bookedSeats.map((s) => s.seatId).join(', ')}] đã được đặt`,
      });
    }

    // 4. Acquire Redis Lock (atomic lock với rollback tự động)
    const lockAcquired = await this.seatLockService.lockSeats(
      showtimeId.toString(),
      seatIdStrings,
      userId,
      DEFAULT_SEAT_LOCK_TTL_MS,
    );

    if (!lockAcquired) {
      throw new ConflictException({
        errorCode: 'SEATS_BEING_HELD',
        message:
          'Một hoặc nhiều ghế đang được người khác giữ, vui lòng chọn ghế khác',
      });
    }

    // 5. Ghi trạng thái HOLDING vào Redis Hash (cho endpoint GET /showtimes/:id/seats đọc realtime)
    const holdExpiresAt = new Date(Date.now() + DEFAULT_SEAT_LOCK_TTL_MS);
    const redisHoldKey = `showtime:${showtimeId}:holds`;

    for (const seatId of seatIdStrings) {
      await this.redisService
        .getClient()
        .hset(
          redisHoldKey,
          seatId,
          JSON.stringify({ userId, expiresAt: holdExpiresAt.toISOString() }),
        );
    }
    // Set TTL cho cả hash key (tự xóa sau khi hết hạn giữ ghế + buffer 1 phút)
    await this.redisService
      .getClient()
      .expire(redisHoldKey, Math.ceil(DEFAULT_SEAT_LOCK_TTL_MS / 1000) + 60);

    // 6. Upsert trạng thái HOLDING vào bảng showtime_seats (backup DB)
    for (const seatId of seatIdStrings) {
      const existing = await this.showtimeSeatRepository.findOne({
        where: { showtimeId: showtimeId.toString(), seatId },
      });

      if (existing) {
        existing.status = ShowtimeSeatStatus.HOLDING;
        existing.userId = userId;
        existing.holdExpiresAt = holdExpiresAt;
        await this.showtimeSeatRepository.save(existing);
      } else {
        const newSeat = this.showtimeSeatRepository.create({
          showtimeId: showtimeId.toString(),
          seatId,
          status: ShowtimeSeatStatus.HOLDING,
          userId,
          holdExpiresAt,
        });
        await this.showtimeSeatRepository.save(newSeat);
      }
    }

    // 7. Trả về kết quả
    const heldSeats = seats.map((s) => ({
      seatId: Number(s.id),
      rowLabel: s.rowLabel,
      seatNumber: s.seatNumber,
    }));

    return {
      showtimeId,
      heldSeats,
      holdExpiresAt,
      holdDurationMs: DEFAULT_SEAT_LOCK_TTL_MS,
      message: `Giữ ghế thành công. Bạn có ${DEFAULT_SEAT_LOCK_TTL_MS / 60000} phút để hoàn tất đặt vé.`,
    };
  }

  /**
   * =====================================================================
   * 2. POST /api/v1/bookings/release - Giải phóng ghế (Release Seats)
   * =====================================================================
   * Cho phép user chủ động trả ghế trước khi hết hạn giữ.
   * LƯU Ý: Chỉ giải phóng ghế đang HOLDING, không thể trả ghế đã BOOKED
   * (khi ghế đã BOOKED thuộc về một đơn hàng thì phải hủy đơn qua POST /orders/:id/cancel).
   */
  async releaseSeats(userId: string, dto: ReleaseSeatsDto) {
    const { showtimeId, seatIds } = dto;
    const uniqueSeatIds = Array.from(new Set(seatIds));
    const seatIdStrings = uniqueSeatIds.map(String);

    // Kiểm tra ghế có đang ở trạng thái HOLDING của chính user này không
    const holdingSeats = await this.showtimeSeatRepository.find({
      where: {
        showtimeId: showtimeId.toString(),
        seatId: In(seatIdStrings),
        userId,
        status: ShowtimeSeatStatus.HOLDING,
      },
    });

    // Lọc bỏ ghế đã hết hạn hold
    const now = new Date();
    const validHolds = holdingSeats.filter(
      (s) => s.holdExpiresAt && new Date(s.holdExpiresAt) > now,
    );

    // Chỉ giải phóng những ghế đang HOLDING hợp lệ của user (bỏ qua ghế BOOKED/AVAILABLE)
    const validSeatIds = validHolds.map((s) => s.seatId);

    if (validSeatIds.length === 0) {
      return {
        showtimeId,
        releasedSeatIds: [],
        message: 'Không có ghế nào đang được giữ bởi bạn để giải phóng',
      };
    }

    // 1. Giải phóng Redis Lock
    await this.seatLockService.unlockSeats(
      showtimeId.toString(),
      validSeatIds,
      userId,
    );

    // 2. Xóa trạng thái trong Redis Hash
    const redisHoldKey = `showtime:${showtimeId}:holds`;
    for (const seatId of validSeatIds) {
      await this.redisService.getClient().hdel(redisHoldKey, seatId);
    }

    // 3. Cập nhật DB: Chỉ giải phóng ghế đang ở trạng thái HOLDING và thuộc về userId này
    await this.showtimeSeatRepository
      .createQueryBuilder()
      .update(ShowtimeSeat)
      .set({
        status: ShowtimeSeatStatus.AVAILABLE,
        userId: null,
        holdExpiresAt: null,
      })
      .where('showtimeId = :showtimeId', { showtimeId: showtimeId.toString() })
      .andWhere('seatId IN (:...seatIds)', { seatIds: validSeatIds })
      .andWhere('userId = :userId', { userId })
      .andWhere('status = :status', { status: ShowtimeSeatStatus.HOLDING })
      .execute();

    return {
      showtimeId,
      releasedSeatIds: validSeatIds.map(Number),
      message: 'Đã giải phóng ghế thành công',
    };
  }

  /**
   * =====================================================================
   * 3. GET /api/v1/bookings/my-holds - Xem ghế đang giữ
   * =====================================================================
   * Trả về danh sách ghế mà user đang giữ (HOLDING) trong hệ thống.
   */
  async getMyHolds(userId: string) {
    const holds = await this.showtimeSeatRepository.find({
      where: {
        userId,
        status: ShowtimeSeatStatus.HOLDING,
      },
      relations: { seat: true },
      order: { createdAt: 'DESC' },
    });

    const now = new Date();

    // Lọc bỏ các hold đã hết hạn
    const activeHolds = holds.filter(
      (h) => h.holdExpiresAt && new Date(h.holdExpiresAt) > now,
    );

    // Nhóm theo showtimeId
    const groupedByShowtime = new Map<string, any[]>();
    for (const hold of activeHolds) {
      const key = hold.showtimeId;
      if (!groupedByShowtime.has(key)) {
        groupedByShowtime.set(key, []);
      }
      groupedByShowtime.get(key)!.push({
        seatId: Number(hold.seatId),
        rowLabel: hold.seat?.rowLabel ?? null,
        seatNumber: hold.seat?.seatNumber ?? null,
        holdExpiresAt: hold.holdExpiresAt,
      });
    }

    const result = Array.from(groupedByShowtime.entries()).map(
      ([showtimeId, seats]) => ({
        showtimeId: Number(showtimeId),
        seats,
      }),
    );

    return {
      totalHolds: activeHolds.length,
      showtimes: result,
    };
  }

  /**
   * =====================================================================
   * [INTERNAL API] Validate ghế đang HOLDING và tính giá snapshot vé
   * =====================================================================
   * Được gọi bởi OrderService.createOrder() — không expose qua HTTP.
   * Trả về { isValid, subtotalTickets, seats[] } để OrderService tạo đơn.
   */
  async validateHoldingSeats(
    input: ValidateHoldingSeatsInput,
  ): Promise<ValidateHoldingSeatsResult> {
    const { userId, showtimeId, seatIds } = input;
    const now = new Date();

    // Lấy tất cả ghế đang HOLDING của user trong suất chiếu này
    const holdingSeats = await this.showtimeSeatRepository.find({
      where: {
        showtimeId,
        seatId: In(seatIds),
        userId,
        status: ShowtimeSeatStatus.HOLDING,
      },
    });

    // Kiểm tra đủ ghế và chưa hết hạn hold
    const validHolds = holdingSeats.filter(
      (s) => s.holdExpiresAt && new Date(s.holdExpiresAt) > now,
    );

    if (validHolds.length !== seatIds.length) {
      return { isValid: false, subtotalTickets: 0, seats: [] };
    }

    // Lấy thông tin ghế (seat_type_id) để lookup giá
    const seatEntities = await this.seatRepository.find({
      where: { id: In(seatIds) },
      select: { id: true, seatTypeId: true },
    });

    const seatTypeMap = new Map(seatEntities.map((s) => [s.id, s.seatTypeId]));

    // Lấy giá vé theo seat_type của suất chiếu
    const seatTypeIds = [...new Set(seatEntities.map((s) => s.seatTypeId))];
    const prices = await this.showtimeSeatPriceRepository.find({
      where: {
        showtimeId,
        seatTypeId: In(seatTypeIds),
      },
    });

    const priceMap = new Map(prices.map((p) => [p.seatTypeId, p.finalPrice]));

    // Kiểm tra đủ bảng giá cho tất cả seat type
    for (const seatTypeId of seatTypeIds) {
      if (!priceMap.has(seatTypeId)) {
        this.logger.warn(
          `[validateHoldingSeats] Không tìm thấy giá vé cho seatTypeId=${seatTypeId} showtimeId=${showtimeId}`,
        );
        return { isValid: false, subtotalTickets: 0, seats: [] };
      }
    }

    // Build kết quả với snapshot giá và ticketCode
    let subtotalTickets = 0;
    const seatsResult: ValidateHoldingSeatsResult['seats'] = [];

    for (const seatId of seatIds) {
      const seatTypeId = seatTypeMap.get(seatId);
      if (!seatTypeId) {
        return { isValid: false, subtotalTickets: 0, seats: [] };
      }
      const price = priceMap.get(seatTypeId) ?? 0;
      subtotalTickets += price;

      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const ticketCode = `TKT-${dateStr}-${random}`;

      seatsResult.push({ seatId, seatTypeId, price, ticketCode });
    }

    return { isValid: true, subtotalTickets, seats: seatsResult };
  }

  /**
   * =====================================================================
   * [INTERNAL API] Chuyển ghế từ HOLDING -> BOOKED
   * =====================================================================
   * Được gọi bởi PaymentService sau khi thanh toán thành công,
   * hoặc BookingService.confirmBooking() cho luồng đặt vé trực tiếp.
   *
   * Đồng thời dọn trạng thái giữ ghế tạm thời trên Redis (Hash + Lock),
   * nếu không dọn thì GET /showtimes/:id/seats vẫn đọc được bản ghi HOLDING
   * cũ (TTL tới ~11 phút) và trả sai trạng thái cho ghế đã bán.
   *
   * @returns Số ghế thực sự được chuyển sang BOOKED (affected rows).
   */
  async markSeatsAsBooked(
    showtimeId: string,
    seatIdStrings: string[],
    userId?: string,
  ): Promise<number> {
    // 1. Chốt ghế trong DB: HOLDING -> BOOKED
    const updateResult = await this.showtimeSeatRepository
      .createQueryBuilder()
      .update(ShowtimeSeat)
      .set({
        status: ShowtimeSeatStatus.BOOKED,
        holdExpiresAt: null,
      })
      .where('showtimeId = :showtimeId', { showtimeId })
      .andWhere('seatId IN (:...seatIds)', { seatIds: seatIdStrings })
      .andWhere('status = :holdingStatus', {
        holdingStatus: ShowtimeSeatStatus.HOLDING,
      })
      .execute();

    if (!updateResult.affected) {
      this.logger.warn(
        `[markSeatsAsBooked] Không có ghế nào chuyển sang BOOKED (showtime=${showtimeId}, seats=[${seatIdStrings.join(', ')}]). ` +
          'Kiểm tra lại trạng thái HOLDING của các ghế trong bảng showtime_seats.',
      );
    }

    // 2. Xóa bản ghi giữ ghế tạm thời trong Redis Hash (luôn thực thi để tự phục hồi
    //    cả khi bước 1 không match dòng nào do trạng thái DB đã lệch).
    const redisHoldKey = `showtime:${showtimeId}:holds`;
    for (const seatId of seatIdStrings) {
      await this.redisService.getClient().hdel(redisHoldKey, seatId);
    }

    // 3. Giải phóng Redis Lock của người mua (ghế đã BOOKED thì lock không còn ý nghĩa)
    if (userId) {
      await this.seatLockService.unlockSeats(showtimeId, seatIdStrings, userId);
    }

    return updateResult.affected ?? 0;
  }

  /**
   * =====================================================================
   * [INTERNAL API] Giải phóng ghế về AVAILABLE (được gọi khi hủy/expire đơn)
   * =====================================================================
   * Được gọi bởi OrderService.cancelOrder() và OrderService.cleanupExpiredOrders().
   * Giải phóng cả trạng thái DB (BOOKED/HOLDING → AVAILABLE) và Redis lock/hash.
   */
  async releaseSeatsForOrder(input: ReleaseSeatsForOrderInput): Promise<void> {
    const { showtimeId, seatIds, userId } = input;

    if (seatIds.length === 0) return;

    // Giải phóng DB: BOOKED hoặc HOLDING (của user này) -> AVAILABLE
    const qb = this.showtimeSeatRepository
      .createQueryBuilder()
      .update(ShowtimeSeat)
      .set({
        status: ShowtimeSeatStatus.AVAILABLE,
        userId: null,
        holdExpiresAt: null,
      })
      .where('showtimeId = :showtimeId', { showtimeId })
      .andWhere('seatId IN (:...seatIds)', { seatIds });

    if (userId) {
      qb.andWhere(
        '(status = :bookedStatus OR (status = :holdingStatus AND userId = :ownerUserId))',
        {
          bookedStatus: ShowtimeSeatStatus.BOOKED,
          holdingStatus: ShowtimeSeatStatus.HOLDING,
          ownerUserId: userId,
        },
      );
    } else {
      qb.andWhere('status IN (:...statuses)', {
        statuses: [ShowtimeSeatStatus.BOOKED, ShowtimeSeatStatus.HOLDING],
      });
    }

    await qb.execute();

    // Giải phóng Redis Lock + Hash
    if (userId) {
      await this.seatLockService.unlockSeats(showtimeId, seatIds, userId);
    }
    const redisHoldKey = `showtime:${showtimeId}:holds`;
    for (const seatId of seatIds) {
      await this.redisService.getClient().hdel(redisHoldKey, seatId);
    }
  }

  /**
   * =====================================================================
   * Hàm dọn dẹp ghế hết hạn giữ (Expired Hold Cleanup)
   * =====================================================================
   * Được gọi bởi Cron Job hoặc bất kỳ trigger nào.
   * Quét bảng showtime_seats, giải phóng các ghế HOLDING đã quá hạn.
   */
  async cleanupExpiredHolds(): Promise<number> {
    const now = new Date();

    const expiredHolds = await this.showtimeSeatRepository
      .createQueryBuilder('ss')
      .where('ss.status = :status', { status: ShowtimeSeatStatus.HOLDING })
      .andWhere('ss.holdExpiresAt IS NOT NULL')
      .andWhere('ss.holdExpiresAt < :now', { now })
      .getMany();

    if (expiredHolds.length === 0) return 0;

    for (const hold of expiredHolds) {
      // Giải phóng Redis Lock (nếu còn tồn tại)
      if (hold.userId) {
        await this.seatLockService.unlockSeats(
          hold.showtimeId,
          [hold.seatId],
          hold.userId,
        );
      }

      // Xóa khỏi Redis Hash
      const redisHoldKey = `showtime:${hold.showtimeId}:holds`;
      await this.redisService.getClient().hdel(redisHoldKey, hold.seatId);
    }

    // Cập nhật DB hàng loạt: HOLDING -> AVAILABLE
    await this.showtimeSeatRepository
      .createQueryBuilder()
      .update(ShowtimeSeat)
      .set({
        status: ShowtimeSeatStatus.AVAILABLE,
        userId: null,
        holdExpiresAt: null,
      })
      .where('status = :status', { status: ShowtimeSeatStatus.HOLDING })
      .andWhere('holdExpiresAt IS NOT NULL')
      .andWhere('holdExpiresAt < :now', { now })
      .execute();

    this.logger.log(
      `[Cleanup] Đã giải phóng ${expiredHolds.length} ghế hết hạn giữ`,
    );

    return expiredHolds.length;
  }
}
