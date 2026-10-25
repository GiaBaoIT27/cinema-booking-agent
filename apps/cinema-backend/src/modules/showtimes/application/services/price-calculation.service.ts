import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, In } from 'typeorm';

import { Showtime } from '../../domain/entities/showtime.entity.js';
import { ShowtimeSeatPrice } from '../../domain/entities/showtime-seat-price.entity.js';
import { DayType } from '../../domain/enums/day-type.enum.js';
import { Ticket } from '#modules/orders/domain/entities/ticket.entity.js';
import { TicketStatus } from '#modules/orders/domain/enums/ticket-status.enum.js';
import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';
import { RedisService } from '#src/core/redis/redis.service.js';
import {
  SHOWTIME_REDIS_KEYS,
  SHOWTIME_REDIS_TTL,
} from '../../infrastructure/constants/showtime-redis.constant.js';
import {
  PRICE_RULE_REPOSITORY,
  type IPriceRuleRepository,
} from '../../domain/repositories/price-rule.repository.interface.js';
import {
  SHOWTIME_SEAT_PRICE_REPOSITORY,
  type IShowtimeSeatPriceRepository,
} from '../../domain/repositories/showtime-seat-price.repository.interface.js';
import { OverrideSeatPriceDto } from '../dto/override-seat-price.dto.js';
import { BatchOverrideSeatPricesDto } from '../dto/batch-override-seat-prices.dto.js';

/** Hình dạng tối thiểu của SeatType cần cho công thức giá vé */
type SeatTypePriceInput = {
  priceMultiplier?: number | string | null;
  surchargeAmount?: number | string | null;
};

/**
 * Application service tập trung TOÀN BỘ nghiệp vụ tính giá vé:
 * - Tra base price từ PriceRule (WEEKDAY/WEEKEND + projectionType + khung giờ)
 * - Sinh/đọc bảng giá ShowtimeSeatPrice (finalPrice = basePrice × multiplier + surcharge)
 * - Override giá thủ công (đơn lẻ / hàng loạt) – chặn khi loại ghế đã có vé
 *
 * ShowtimeService chỉ delegate các endpoint giá sang service này.
 */
@Injectable()
export class PriceCalculationService {
  private readonly logger = new Logger(PriceCalculationService.name);
  /** Giá mặc định áp dụng khi không tìm thấy PriceRule nào khớp (fallback an toàn) */
  private readonly DEFAULT_BASE_PRICE = 100000;

  constructor(
    @Inject(PRICE_RULE_REPOSITORY)
    private readonly priceRuleRepository: IPriceRuleRepository,
    @Inject(SHOWTIME_SEAT_PRICE_REPOSITORY)
    private readonly showtimeSeatPriceRepository: IShowtimeSeatPriceRepository,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Xác định DayType (WEEKDAY / WEEKEND) theo múi giờ VN (Asia/Ho_Chi_Minh)
   */
  resolveDayType(startTime: Date): DayType {
    const dayOfWeekStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      weekday: 'short',
    }).format(startTime);
    return dayOfWeekStr === 'Sun' || dayOfWeekStr === 'Sat'
      ? DayType.WEEKEND
      : DayType.WEEKDAY;
  }

  /**
   * Tra giá gốc (base price) từ bảng price_rules
   */
  async resolveBasePrice(showtime: Showtime): Promise<number> {
    // Lấy chuỗi HH:mm:ss theo múi giờ VN để so với khung giờ (time) của PriceRule
    const showtimeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(showtime.startTime);

    const dayType = this.resolveDayType(showtime.startTime);

    const rule = await this.priceRuleRepository.findMatchingBasePrice({
      projectionType: showtime.projectionType,
      dayType,
      cineplexId: showtime.auditorium?.cineplexId ?? null,
      showtimeClock: showtimeStr,
    });

    if (!rule) {
      this.logger.warn(
        `Không tìm thấy PriceRule phù hợp cho suất chiếu ${showtime.id} ` +
          `(projection=${showtime.projectionType}, dayType=${dayType}, time=${showtimeStr}). ` +
          `Dùng giá mặc định ${this.DEFAULT_BASE_PRICE}.`,
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
  async getSeatPriceMap(showtime: Showtime): Promise<Map<string, number>> {
    const cacheKey = SHOWTIME_REDIS_KEYS.PRICES(showtime.id);

    const priceRecord = await this.redisService.getOrSet(
      cacheKey,
      async () => {
        let seatPrices =
          await this.showtimeSeatPriceRepository.findByShowtimeId(showtime.id);

        // Nếu chưa có bảng giá snapshot, tự động sinh (Lazy generation)
        if (seatPrices.length === 0) {
          try {
            await this.generateSeatPrices(Number(showtime.id), false);
            seatPrices =
              await this.showtimeSeatPriceRepository.findByShowtimeId(
                showtime.id,
              );
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
   * GET api/v1/showtimes/:id/seat-prices – danh sách giá chi tiết từng loại ghế
   */
  async getSeatPrices(showtimeId: number) {
    const cacheKey = SHOWTIME_REDIS_KEYS.SEAT_PRICES(showtimeId);

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const result =
          await this.showtimeSeatPriceRepository.findByShowtimeIdWithSeatType(
            showtimeId.toString(),
          );

        if (!result || result.length === 0) {
          throw new BusinessException(
            ErrorCode.SEAT_PRICES_NOT_GENERATED,
            'Bảng giá cho suất chiếu này chưa được tạo',
          );
        }

        const seatPrices = result.map((ssp) => ({
          seatTypeId: Number(ssp.seatTypeId),
          seatTypeCode: ssp.seatType.code,
          seatTypeName: ssp.seatType.name,
          priceMultiplier: Number(ssp.seatType.priceMultiplier),
          surchargeAmount: Number(ssp.seatType.surchargeAmount),
          finalPrice: Number(ssp.finalPrice),
          isOverridden: ssp.isOverridden,
          updatedAt: ssp.updatedAt,
        }));

        return { showtimeId, seatPrices };
      },
      43200, // 12 giờ
    );
  }

  /**
   * POST api/v1/showtimes/:id/seat-prices/generate
   * Sinh lại bảng giá theo PriceRule hiện tại (bỏ qua bản override trừ khi isForce).
   */
  async generateSeatPrices(showtimeId: number, isForce: boolean) {
    return await this.dataSource.transaction(async (manager) => {
      // Kiểm tra suất chiếu (kèm toàn bộ ghế phòng chiếu + loại ghế)
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
        throw new BusinessException(
          ErrorCode.SHOWTIME_NOT_FOUND,
          'Không tìm thấy suất chiếu',
        );
      }

      // Không cho tính lại giá khi đã có vé hợp lệ / đã check-in
      const bookedTicketsCount = await manager.count(Ticket, {
        where: {
          showtimeId: showtimeId.toString(),
          status: In([TicketStatus.VALID, TicketStatus.CHECKED_IN]),
        },
      });

      if (bookedTicketsCount > 0) {
        throw new BusinessException(
          ErrorCode.SHOWTIME_HAS_BOOKED_TICKETS,
          'Không thể tính lại bảng giá vì đã có vé được đặt hoặc thanh toán',
        );
      }

      const basePrice = await this.resolveBasePrice(showtime);

      // Gom danh sách loại ghế duy nhất từ sơ đồ ghế vật lý
      const seatTypes = new Map<string, SeatTypePriceInput>();
      for (const seat of showtime.auditorium?.seats ?? []) {
        if (seat.seatType && !seatTypes.has(String(seat.seatTypeId))) {
          seatTypes.set(String(seat.seatTypeId), seat.seatType);
        }
      }

      // Tính toán & Upsert
      let processedCount = 0;
      for (const [seatTypeIdStr, seatType] of seatTypes) {
        const existingPrice = await manager.findOne(ShowtimeSeatPrice, {
          where: {
            showtimeId: showtimeId.toString(),
            seatTypeId: seatTypeIdStr,
          },
        });

        // Giữ nguyên giá đã override thủ công (trừ khi ép sinh lại toàn bộ)
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

      await Promise.all([
        this.redisService.del(SHOWTIME_REDIS_KEYS.SEAT_PRICES(showtimeId)),
        this.redisService.del(SHOWTIME_REDIS_KEYS.PRICES(showtimeId)),
      ]);

      return {
        showtimeId,
        appliedBasePrice: basePrice,
        totalSeatTypesProcessed: processedCount,
        generatedAt: new Date(),
      };
    });
  }

  /**
   * PATCH api/v1/showtimes/:id/seat-prices/:seatTypeId
   * Override giá thủ công cho 1 loại ghế của suất chiếu.
   */
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
        throw new BusinessException(
          ErrorCode.SHOWTIME_NOT_FOUND,
          'Không tìm thấy suất chiếu',
        );
      }

      // Chặn đổi giá khi loại ghế này đã có vé hợp lệ / đã check-in
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

      await Promise.all([
        this.redisService.del(SHOWTIME_REDIS_KEYS.SEAT_PRICES(showtimeId)),
        this.redisService.del(SHOWTIME_REDIS_KEYS.PRICES(showtimeId)),
      ]);

      return {
        showtimeId,
        seatTypeId,
        finalPrice: updatedSeatPrice.finalPrice,
        isOverridden: updatedSeatPrice.isOverridden,
        updatedAt: updatedSeatPrice.updatedAt,
      };
    });
  }

  /**
   * PUT api/v1/showtimes/:id/seat-prices
   * Override giá thủ công hàng loạt cho nhiều loại ghế của suất chiếu.
   */
  async batchOverrideSeatPrices(
    showtimeId: number,
    batchDto: BatchOverrideSeatPricesDto,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const showtimeCount = await manager.count(Showtime, {
        where: { id: showtimeId.toString() },
      });
      if (showtimeCount === 0) {
        throw new BusinessException(
          ErrorCode.SHOWTIME_NOT_FOUND,
          'Không tìm thấy suất chiếu',
        );
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

      await Promise.all([
        this.redisService.del(SHOWTIME_REDIS_KEYS.SEAT_PRICES(showtimeId)),
        this.redisService.del(SHOWTIME_REDIS_KEYS.PRICES(showtimeId)),
      ]);

      return {
        showtimeId,
        updatedCount: batchDto.items.length,
        updatedAt: new Date(),
      };
    });
  }
}
