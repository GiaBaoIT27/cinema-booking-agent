import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PriceRule } from '../../domain/entities/price-rules.entity.js';
import { Cineplex } from '#modules/cinemas/entities/cineplex.entity.js';
import { GetPriceRulesQueryDto } from '../dto/get-price-rules-query.dto.js';
import { CreatePriceRuleDto } from '../dto/create-price-rule.dto.js';
import { UpdatePriceRuleDto } from '../dto/update-price-rule.dto.js';

import {
  PRICE_RULE_REDIS_KEYS,
  PRICE_RULE_REDIS_TTL,
} from '../../constants/price-rule-redis.constant.js';
import { SHOWTIME_REDIS_KEYS } from '../../constants/showtime-redis.constant.js';
import { RedisService } from '#src/core/redis/redis.service.js';

@Injectable()
export class PriceRuleService {
  private readonly logger = new Logger(PriceRuleService.name);
  constructor(
    @InjectRepository(PriceRule)
    private readonly priceRuleRepository: Repository<PriceRule>,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  // 1. GET api/v1/price-rules - Lấy danh sách quy tắc giá
  async findAll(
    queryDto: GetPriceRulesQueryDto,
  ): Promise<{ data: PriceRule[]; totalElements: number }> {
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
        const queryBuilder = this.priceRuleRepository
          .createQueryBuilder('pr')
          .leftJoinAndSelect('pr.cineplex', 'c');

        if (cineplex_id !== undefined && cineplex_id !== null) {
          queryBuilder.andWhere('pr.cineplexId = :cineplex_id', {
            cineplex_id,
          });
        }

        if (projection_type) {
          queryBuilder.andWhere('pr.projectionType = :projection_type', {
            projection_type,
          });
        }

        if (day_type) {
          queryBuilder.andWhere('pr.dayType = :day_type', { day_type });
        }

        // Sắp xếp theo ưu tiên: quy tắc toàn hệ thống trước (cineplex_id NULLS FIRST), projection_type, day_type, start_time
        queryBuilder
          .orderBy('pr.cineplexId', 'ASC', 'NULLS FIRST')
          .addOrderBy('pr.projectionType', 'ASC')
          .addOrderBy('pr.dayType', 'ASC')
          .addOrderBy('pr.startTime', 'ASC');

        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);

        const [items, totalElements] = await queryBuilder.getManyAndCount();

        return { data: items, totalElements };
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
        const priceRule = await this.priceRuleRepository
          .createQueryBuilder('pr')
          .leftJoinAndSelect('pr.cineplex', 'c')
          .where('pr.id = :id', { id: id.toString() })
          .getOne();

        if (!priceRule) {
          throw new NotFoundException({
            errorCode: 'PRICE_RULE_NOT_FOUND',
            message: `Quy tắc giá với ID ${id} không tồn tại trên hệ thống`,
          });
        }

        // Trả về Entity thô - việc format/transform là trách nhiệm của Controller
        return priceRule;
      },
      PRICE_RULE_REDIS_TTL.DETAIL_SECONDS, // TTL = 12 giờ (43.200s)
    );
  }

  // POST api/v1/price-rules - Tạo mới quy tắc giá
  async create(createDto: CreatePriceRuleDto): Promise<PriceRule> {
    const {
      cineplexId,
      projectionType,
      dayType,
      startTime,
      endTime,
      basePrice,
    } = createDto;

    // 1. Validate endTime > startTime
    if (startTime >= endTime) {
      throw new BadRequestException({
        errorCode: 'INVALID_TIME_RANGE',
        message:
          'Khung giờ kết thúc (endTime) phải lớn hơn khung giờ bắt đầu (startTime)',
      });
    }

    // 2. Validate basePrice > 0
    if (basePrice <= 0) {
      throw new BadRequestException({
        errorCode: 'INVALID_BASE_PRICE',
        message: 'Giá cơ sở (basePrice) phải lớn hơn 0',
      });
    }

    // Thực thi trong DB Transaction
    const createdRule = await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        // 3. Kiểm tra cụm rạp nếu truyền cineplexId
        if (cineplexId !== undefined && cineplexId !== null) {
          const cineplexExists = await transactionalEntityManager.findOne(
            Cineplex,
            {
              where: { id: cineplexId.toString() },
            },
          );

          if (!cineplexExists) {
            throw new NotFoundException({
              errorCode: 'CINEPLEX_NOT_FOUND',
              message: `Cụm rạp với ID ${cineplexId} không tồn tại trên hệ thống`,
            });
          }
        }

        // 4. Kiểm tra Khung giờ giao thoa/chồng lấp (Overlapping Time Check)
        const overlapQuery = transactionalEntityManager
          .createQueryBuilder(PriceRule, 'pr')
          .where('pr.projectionType = :projectionType', { projectionType })
          .andWhere('pr.dayType = :dayType', { dayType })
          .andWhere(
            'NOT (pr.endTime <= :startTime OR pr.startTime >= :endTime)',
            {
              startTime,
              endTime,
            },
          );

        if (cineplexId !== undefined && cineplexId !== null) {
          overlapQuery.andWhere('pr.cineplexId = :cineplexId', {
            cineplexId: cineplexId.toString(),
          });
        } else {
          overlapQuery.andWhere('pr.cineplexId IS NULL');
        }

        const overlappingCount = await overlapQuery.getCount();

        if (overlappingCount > 0) {
          throw new ConflictException({
            errorCode: 'PRICE_RULE_OVERLAP',
            message:
              'Khung thời gian của quy tắc giá bị trùng lấp với một quy tắc khác có cùng điều kiện áp dụng',
          });
        }

        // 5. Lưu bản ghi vào DB
        const priceRule = transactionalEntityManager.create(PriceRule, {
          cineplexId: cineplexId ? cineplexId.toString() : null,
          projectionType,
          dayType,
          startTime,
          endTime,
          basePrice,
        });

        return await transactionalEntityManager.save(PriceRule, priceRule);
      },
    );

    // 6. Evict Cache: quy tắc giá + bảng giá ghế phụ thuộc base price
    await Promise.all([
      this.redisService.delByPattern(PRICE_RULE_REDIS_KEYS.PATTERN_ALL),
      this.redisService.delByPattern(SHOWTIME_REDIS_KEYS.PATTERN_PRICES),
    ]);

    return createdRule;
  }

  // PUT api/v1/price-rules/:id - Cập nhật quy tắc giá
  async update(id: number, updateDto: UpdatePriceRuleDto): Promise<PriceRule> {
    const {
      cineplexId,
      projectionType,
      dayType,
      startTime,
      endTime,
      basePrice,
    } = updateDto;

    // 1. Validate endTime > startTime
    if (startTime >= endTime) {
      throw new BadRequestException({
        errorCode: 'INVALID_TIME_RANGE',
        message:
          'Khung giờ kết thúc (endTime) phải lớn hơn khung giờ bắt đầu (startTime)',
      });
    }

    // 2. Validate basePrice > 0
    if (basePrice <= 0) {
      throw new BadRequestException({
        errorCode: 'INVALID_BASE_PRICE',
        message: 'Giá cơ sở (basePrice) phải lớn hơn 0',
      });
    }

    // Thực thi trong DB Transaction
    const updatedRule = await this.dataSource.transaction(
      async (transactionalEntityManager) => {
        // 3. Tìm quy tắc giá theo ID (404 Not Found)
        const priceRule = await transactionalEntityManager.findOne(PriceRule, {
          where: { id: id.toString() },
        });

        if (!priceRule) {
          throw new NotFoundException({
            errorCode: 'PRICE_RULE_NOT_FOUND',
            message: `Quy tắc giá với ID ${id} không tồn tại trên hệ thống`,
          });
        }

        // 4. Kiểm tra cụm rạp nếu truyền cineplexId
        if (cineplexId !== undefined && cineplexId !== null) {
          const cineplexExists = await transactionalEntityManager.findOne(
            Cineplex,
            {
              where: { id: cineplexId.toString() },
            },
          );

          if (!cineplexExists) {
            throw new NotFoundException({
              errorCode: 'CINEPLEX_NOT_FOUND',
              message: `Cụm rạp với ID ${cineplexId} không tồn tại trên hệ thống`,
            });
          }
        }

        // 5. Kiểm tra Khung giờ giao thoa/chồng lấp (Loại trừ ID hiện tại: id != :id)
        const overlapQuery = transactionalEntityManager
          .createQueryBuilder(PriceRule, 'pr')
          .where('pr.id != :id', { id: id.toString() })
          .andWhere('pr.projectionType = :projectionType', { projectionType })
          .andWhere('pr.dayType = :dayType', { dayType })
          .andWhere(
            'NOT (pr.endTime <= :startTime OR pr.startTime >= :endTime)',
            {
              startTime,
              endTime,
            },
          );

        if (cineplexId !== undefined && cineplexId !== null) {
          overlapQuery.andWhere('pr.cineplexId = :cineplexId', {
            cineplexId: cineplexId.toString(),
          });
        } else {
          overlapQuery.andWhere('pr.cineplexId IS NULL');
        }

        const overlappingCount = await overlapQuery.getCount();

        if (overlappingCount > 0) {
          throw new ConflictException({
            errorCode: 'PRICE_RULE_OVERLAP',
            message:
              'Khung thời gian của quy tắc giá bị trùng lấp với một quy tắc khác có cùng điều kiện áp dụng',
          });
        }

        // 6. Cập nhật bản ghi trong DB
        Object.assign(priceRule, {
          cineplexId: cineplexId ? cineplexId.toString() : null,
          projectionType,
          dayType,
          startTime,
          endTime,
          basePrice,
        });

        return await transactionalEntityManager.save(PriceRule, priceRule);
      },
    );

    // 7. Evict Cache: quy tắc giá + bảng giá ghế phụ thuộc base price
    await Promise.all([
      this.redisService.delByPattern(PRICE_RULE_REDIS_KEYS.PATTERN_ALL),
      this.redisService.delByPattern(SHOWTIME_REDIS_KEYS.PATTERN_PRICES),
    ]);

    return updatedRule;
  }

  // 5. DELETE api/v1/price-rules/:id - Xóa quy tắc giá
  async remove(id: number): Promise<void> {
    // 1. Kiểm tra sự tồn tại của quy tắc giá
    const priceRule = await this.priceRuleRepository.findOne({
      where: { id: id.toString() },
    });

    if (!priceRule) {
      throw new NotFoundException({
        errorCode: 'PRICE_RULE_NOT_FOUND',
        message: `Quy tắc giá với ID ${id} không tồn tại trên hệ thống`,
      });
    }

    // 2. Thực thi xóa bản ghi khỏi CSDL
    // Lưu ý nghiệp vụ: PriceRule là bảng tra cứu giá cơ sở (lookup) áp dụng theo điều kiện
    // (cineplex + projectionType + dayType + khung giờ), KHÔNG có quan hệ FK trực tiếp tới
    // từng suất chiếu. Việc xóa rule không làm gãy suất chiếu nào:
    //  - Giá đã override trong showtime_seat_prices vẫn giữ nguyên.
    //  - Các suất chiếu chưa override sẽ lookup base price theo điều kiện; nếu không còn
    //    rule nào khớp, ShowtimeService.resolveBasePrice() tự fallback về DEFAULT_BASE_PRICE.
    await this.priceRuleRepository.delete(id);

    this.logger.warn(
      `Price Rule ID ${id} (cineplex=${priceRule.cineplexId ?? 'SYSTEM'}, ` +
        `projection=${priceRule.projectionType}, dayType=${priceRule.dayType}, ` +
        `${priceRule.startTime}-${priceRule.endTime}, basePrice=${priceRule.basePrice}) đã bị xóa. ` +
        `Các suất chiếu chưa override giá sẽ fallback về giá mặc định.`,
    );

    // 3. Evict Cache:
    //  - price_rules:*       -> cache danh sách/chi tiết quy tắc giá
    //  - showtimes:prices:*  -> cache bảng giá ghế đã tính từ base price của rule vừa xóa
    await Promise.all([
      this.redisService.delByPattern(PRICE_RULE_REDIS_KEYS.PATTERN_ALL),
      this.redisService.delByPattern(SHOWTIME_REDIS_KEYS.PATTERN_PRICES),
    ]);
  }
}
