import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';

import { PriceRule } from '../../domain/entities/price-rules.entity.js';
import {
  PRICE_RULE_REPOSITORY,
  type IPriceRuleRepository,
} from '../../domain/repositories/price-rule.repository.interface.js';
import { GetPriceRulesQueryDto } from '../dto/get-price-rules-query.dto.js';
import { CreatePriceRuleDto } from '../dto/create-price-rule.dto.js';
import { UpdatePriceRuleDto } from '../dto/update-price-rule.dto.js';
import {
  PRICE_RULE_REDIS_KEYS,
  PRICE_RULE_REDIS_TTL,
} from '../../infrastructure/constants/price-rule-redis.constant.js';
import { SHOWTIME_REDIS_KEYS } from '../../infrastructure/constants/showtime-redis.constant.js';
import { RedisService } from '#src/core/redis/redis.service.js';
import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';
import { CinemasFacade } from '#modules/cinemas/public-api/cinemas.facade.js';

/**
 * Application service quản lý quy tắc giá gốc (price_rules).
 * Đọc/ghi qua port IPriceRuleRepository; kiểm tra cụm rạp qua CinemasFacade.
 */
@Injectable()
export class PriceRuleService {
  private readonly logger = new Logger(PriceRuleService.name);

  constructor(
    @Inject(PRICE_RULE_REPOSITORY)
    private readonly priceRuleRepository: IPriceRuleRepository,
    private readonly cinemasFacade: CinemasFacade,
    private readonly redisService: RedisService,
  ) {}

  // 1. GET api/v1/price-rules - Lấy danh sách quy tắc giá
  async findAll(
    queryDto: GetPriceRulesQueryDto,
  ): Promise<{ data: PriceRule[]; totalItems: number }> {
    const {
      cineplex_id,
      projection_type,
      day_type,
      page = 1,
      limit = 20,
    } = queryDto;

    // Định dạng Redis Key chuẩn theo bản đặc tả
    const cacheKey = PRICE_RULE_REDIS_KEYS.LIST(
      cineplex_id ?? 'all',
      projection_type ?? 'all',
      day_type ?? 'all',
      page,
      limit,
    );

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const { data, totalItems } =
          await this.priceRuleRepository.findPaginated({
            cineplexId: cineplex_id,
            projectionType: projection_type,
            dayType: day_type,
            page,
            limit,
          });

        return { data, totalItems };
      },
      PRICE_RULE_REDIS_TTL.LIST_SECONDS, // TTL = 12 giờ (43.200s)
    );
  }

  // 2. GET api/v1/price-rules/:id - Xem chi tiết 1 quy tắc giá
  async findOne(id: number): Promise<PriceRule> {
    const cacheKey = PRICE_RULE_REDIS_KEYS.DETAIL(id);

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const priceRule = await this.priceRuleRepository.findByIdWithCineplex(
          id.toString(),
        );

        if (!priceRule) {
          throw new BusinessException(
            ErrorCode.PRICE_RULE_NOT_FOUND,
            `Quy tắc giá với ID ${id} không tồn tại trên hệ thống`,
            HttpStatus.NOT_FOUND,
          );
        }
        return priceRule;
      },
      PRICE_RULE_REDIS_TTL.DETAIL_SECONDS, // TTL = 12 giờ (43.200s)
    );
  }

  // 3. POST api/v1/price-rules - Tạo mới quy tắc giá
  async create(createDto: CreatePriceRuleDto): Promise<PriceRule> {
    const {
      cineplexId,
      projectionType,
      dayType,
      startTime,
      endTime,
      basePrice,
    } = createDto;

    // 1. Validate endTime > startTime và basePrice > 0
    this.assertValidTimeAndPrice(startTime, endTime, basePrice);

    // 2. Kiểm tra cụm rạp nếu truyền cineplexId (qua CinemasFacade)
    await this.assertCineplexExists(cineplexId);

    // 3. Kiểm tra Khung giờ giao thoa/chồng lấp (Overlapping Time Check)
    const overlappingCount = await this.priceRuleRepository.findOverlapping({
      projectionType,
      dayType,
      startTime,
      endTime,
      cineplexId: cineplexId ?? null,
    });

    if (overlappingCount > 0) {
      throw new BusinessException(
        ErrorCode.PRICE_RULE_OVERLAP,
        'Khung thời gian của quy tắc giá bị trùng lấp với một quy tắc khác có cùng điều kiện áp dụng',
        HttpStatus.CONFLICT,
      );
    }

    // 4. Lưu bản ghi vào DB
    const priceRule = this.priceRuleRepository.create({
      cineplexId: cineplexId ? cineplexId.toString() : null,
      projectionType,
      dayType,
      startTime,
      endTime,
      basePrice,
    });
    const createdRule = await this.priceRuleRepository.save(priceRule);

    // 5. Evict Cache: quy tắc giá + bảng giá ghế phụ thuộc base price
    await this.evictPriceCaches();

    return createdRule;
  }

  // 4. PUT api/v1/price-rules/:id - Cập nhật quy tắc giá
  async update(id: number, updateDto: UpdatePriceRuleDto): Promise<PriceRule> {
    const {
      cineplexId,
      projectionType,
      dayType,
      startTime,
      endTime,
      basePrice,
    } = updateDto;

    // 1. Validate endTime > startTime và basePrice > 0
    this.assertValidTimeAndPrice(startTime, endTime, basePrice);

    // 2. Tìm quy tắc giá theo ID (404 Not Found)
    const priceRule = await this.priceRuleRepository.findById(id.toString());

    if (!priceRule) {
      throw new BusinessException(
        ErrorCode.PRICE_RULE_NOT_FOUND,
        `Quy tắc giá với ID ${id} không tồn tại trên hệ thống`,
        HttpStatus.NOT_FOUND,
      );
    }

    // 3. Kiểm tra cụm rạp nếu truyền cineplexId (qua CinemasFacade)
    await this.assertCineplexExists(cineplexId);

    // 4. Kiểm tra Khung giờ giao thoa/chồng lấp (Loại trừ ID hiện tại)
    const overlappingCount = await this.priceRuleRepository.findOverlapping({
      projectionType,
      dayType,
      startTime,
      endTime,
      cineplexId: cineplexId ?? null,
      excludeId: id.toString(),
    });

    if (overlappingCount > 0) {
      throw new BusinessException(
        ErrorCode.PRICE_RULE_OVERLAP,
        'Khung thời gian của quy tắc giá bị trùng lấp với một quy tắc khác có cùng điều kiện áp dụng',
        HttpStatus.CONFLICT,
      );
    }

    // 5. Cập nhật bản ghi trong DB
    Object.assign(priceRule, {
      cineplexId: cineplexId ? cineplexId.toString() : null,
      projectionType,
      dayType,
      startTime,
      endTime,
      basePrice,
    });
    const updatedRule = await this.priceRuleRepository.save(priceRule);

    // 6. Evict Cache: quy tắc giá + bảng giá ghế phụ thuộc base price
    await this.evictPriceCaches();

    return updatedRule;
  }

  // 5. DELETE api/v1/price-rules/:id - Xóa quy tắc giá
  async remove(id: number): Promise<void> {
    // 1. Kiểm tra sự tồn tại của quy tắc giá
    const priceRule = await this.priceRuleRepository.findById(id.toString());

    if (!priceRule) {
      throw new BusinessException(
        ErrorCode.PRICE_RULE_NOT_FOUND,
        `Quy tắc giá với ID ${id} không tồn tại trên hệ thống`,
        HttpStatus.NOT_FOUND,
      );
    }

    // 2. Thực thi xóa bản ghi khỏi CSDL
    // Lưu ý nghiệp vụ: PriceRule là bảng tra cứu giá cơ sở (lookup) áp dụng theo điều kiện
    // (cineplex + projectionType + dayType + khung giờ), KHÔNG có quan hệ FK trực tiếp tới
    // từng suất chiếu. Việc xóa rule không làm gãy suất chiếu nào:
    //  - Giá đã override trong showtime_seat_prices vẫn giữ nguyên.
    //  - Các suất chiếu chưa override sẽ lookup base price theo điều kiện; nếu không còn
    //    rule nào khớp, PriceCalculationService.resolveBasePrice() tự fallback về DEFAULT_BASE_PRICE.
    await this.priceRuleRepository.delete(id.toString());

    // 3. Evict Cache:
    //  - price_rules:*       -> cache danh sách/chi tiết quy tắc giá
    //  - showtimes:prices:*  -> cache bảng giá ghế đã tính từ base price của rule vừa xóa
    await this.evictPriceCaches();
  }

  /** Validate khung giờ và giá cơ sở – dùng chung cho create/update */
  private assertValidTimeAndPrice(
    startTime: string,
    endTime: string,
    basePrice: number,
  ): void {
    if (startTime >= endTime) {
      throw new BusinessException(
        ErrorCode.INVALID_TIME_RANGE,
        'Khung giờ kết thúc (endTime) phải lớn hơn khung giờ bắt đầu (startTime)',
      );
    }

    if (basePrice <= 0) {
      throw new BusinessException(
        ErrorCode.INVALID_BASE_PRICE,
        'Giá cơ sở (basePrice) phải lớn hơn 0',
      );
    }
  }

  /** Kiểm tra cụm rạp có tồn tại không (bỏ qua khi là rule toàn hệ thống) */
  private async assertCineplexExists(cineplexId?: number): Promise<void> {
    if (cineplexId === undefined || cineplexId === null) return;

    const exists = await this.cinemasFacade.assertCineplexExists(cineplexId);
    if (!exists) {
      throw new BusinessException(
        ErrorCode.CINEMA_CINEPLEX_NOT_FOUND,
        `Cụm rạp với ID ${cineplexId} không tồn tại trên hệ thống`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /** Evict cache quy tắc giá + bảng giá ghế (phụ thuộc base price) */
  private async evictPriceCaches(): Promise<void> {
    await Promise.all([
      this.redisService.delByPattern(PRICE_RULE_REDIS_KEYS.PATTERN_ALL),
      this.redisService.delByPattern(SHOWTIME_REDIS_KEYS.PATTERN_PRICES),
    ]);
  }
}
