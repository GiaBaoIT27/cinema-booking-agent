import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, QueryFailedError, Repository } from 'typeorm';
import { PromotionEntity } from './entities/promotion.entity.js';
import { GetPromotionsQueryDto } from './dto/query-promotions.dto.js';
import { GetPublicPromotionsQueryDto } from './dto/query-promotions-public.dto.js';
import { DiscountType } from './enums/promotion.enum.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { UpdatePromotionDto } from './dto/update-promotion.dto.js';
import { UpdatePromotionStatusDto } from './dto/update-promotion-status.dto.js';
import { ValidatePromotionDto } from './dto/validate-promotion.dto.js';

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    @InjectRepository(PromotionEntity)
    private readonly promotionRepository: Repository<PromotionEntity>,
  ) {}

  private escapeLikeString(str: string): string {
    return str.replace(/[%_]/g, '\\$&');
  }

  // 1. GET /api/v1/promotions
  async findAllForAdmin(queryDto: GetPromotionsQueryDto) {
    const { code, discountType, isActive, page, limit } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.promotionRepository.createQueryBuilder('promotion');

    if (code) {
      const safeCode = code.replace(/[%_]/g, '\\$&');
      queryBuilder.andWhere('promotion.code ILIKE :code', {
        code: `%${safeCode}%`,
      });
    }
    if (discountType) {
      queryBuilder.andWhere('promotion.discountType = :discountType', {
        discountType,
      });
    }
    if (isActive !== undefined) {
      queryBuilder.andWhere('promotion.isActive = :isActive', { isActive });
    }

    queryBuilder.orderBy('promotion.createdAt', 'DESC').skip(skip).take(limit);

    const [items, totalElements] = await queryBuilder.getManyAndCount();

    return {
      data: items,
      pagination: {
        page,
        limit,
        totalElements,
        totalPages: Math.ceil(totalElements / limit) || 1,
      },
    };
  }

  // 2. GET /api/v1/promotions/public
  async findPublicActive(queryDto: GetPublicPromotionsQueryDto) {
    const { page, limit } = queryDto;
    const skip = (page - 1) * limit;
    const now = new Date();

    const queryBuilder = this.promotionRepository
      .createQueryBuilder('promotion')
      .select([
        'promotion.id',
        'promotion.code',
        'promotion.discountType',
        'promotion.discountValue',
        'promotion.maxDiscountAmount',
        'promotion.minOrderAmount',
        'promotion.startDate',
        'promotion.endDate',
      ])
      .where('promotion.isActive = :isActive', { isActive: true })
      .andWhere('promotion.startDate <= :now', { now })
      .andWhere('promotion.endDate >= :now', { now })
      .andWhere(
        '(promotion.usageLimit IS NULL OR promotion.usedCount < promotion.usageLimit)',
      )
      .orderBy('promotion.endDate', 'ASC')
      .skip(skip)
      .take(limit);

    const [items, totalElements] = await queryBuilder.getManyAndCount();

    const formattedData = items.map((item) => ({
      ...item,
      id: Number(item.id),
    }));

    return {
      data: formattedData,
      pagination: {
        page,
        limit,
        totalElements,
        totalPages: Math.ceil(totalElements / limit) || 1,
      },
    };
  }

  // 3. GET /api/v1/promotions/:id
  async findOne(id: number) {
    const promotion = await this.promotionRepository.findOne({
      where: { id: id.toString() },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        maxDiscountAmount: true,
        minOrderAmount: true,
        usageLimit: true,
        usedCount: true,
        startDate: true,
        endDate: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!promotion) {
      throw new NotFoundException(
        `Không tìm thấy chương trình khuyến mãi với ID ${id}`,
      );
    }

    // Tính toán số lượt còn lại (remainingUsage)
    const remainingUsage =
      promotion.usageLimit !== null
        ? Math.max(0, promotion.usageLimit - promotion.usedCount)
        : null;

    return {
      id: Number(promotion.id),
      code: promotion.code,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      maxDiscountAmount: promotion.maxDiscountAmount,
      minOrderAmount: promotion.minOrderAmount,
      usageLimit: promotion.usageLimit,
      usedCount: promotion.usedCount,
      remainingUsage,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      isActive: promotion.isActive,
      createdAt: promotion.createdAt,
    };
  }

  // 4. POST /api/v1/promotions
  async create(createDto: CreatePromotionDto) {
    const {
      code,
      discountType = DiscountType.FIXED_AMOUNT,
      discountValue,
      maxDiscountAmount,
      minOrderAmount = 0,
      usageLimit,
      startDate,
      endDate,
      isActive = true,
    } = createDto;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Validation: endDate > startDate
    if (end <= start) {
      throw new UnprocessableEntityException({
        errorCode: 'INVALID_DATE_RANGE',
        message:
          'Thời gian kết thúc (endDate) phải lớn hơn thời gian bắt đầu (startDate)',
      });
    }

    // 2. Validation: PERCENTAGE logic constraints
    if (discountType === DiscountType.PERCENTAGE) {
      if (discountValue > 100) {
        throw new UnprocessableEntityException({
          errorCode: 'INVALID_DISCOUNT_PERCENTAGE_VALUE',
          message: 'Giá trị phần trăm giảm giá không được vượt quá 100%',
        });
      }

      if (maxDiscountAmount === undefined || maxDiscountAmount === null) {
        throw new UnprocessableEntityException({
          errorCode: 'MISSING_MAX_DISCOUNT_AMOUNT',
          message:
            'Loại giảm giá PERCENTAGE bắt buộc phải có giá trị giảm tối đa (maxDiscountAmount)',
        });
      }
    }

    // 3. Validation: Unique Code check
    const existingCode = await this.promotionRepository.findOne({
      where: { code },
      select: {
        id: true,
      },
    });

    if (existingCode) {
      throw new ConflictException({
        errorCode: 'PROMOTION_CODE_ALREADY_EXISTS',
        message: `Mã khuyến mãi '${code}' đã tồn tại trên hệ thống`,
      });
    }

    // 4. Persistence into DB
    try {
      const promotion = this.promotionRepository.create({
        code,
        discountType,
        discountValue,
        maxDiscountAmount:
          discountType === DiscountType.PERCENTAGE ? maxDiscountAmount : null,
        minOrderAmount,
        usageLimit: usageLimit ?? null,
        usedCount: 0,
        startDate: start,
        endDate: end,
        isActive,
      });

      const saved = await this.promotionRepository.save(promotion);

      return {
        id: Number(saved.id),
        code: saved.code,
        discountType: saved.discountType,
        discountValue: saved.discountValue,
        maxDiscountAmount: saved.maxDiscountAmount,
        minOrderAmount: saved.minOrderAmount,
        usageLimit: saved.usageLimit,
        usedCount: saved.usedCount,
        startDate: saved.startDate,
        endDate: saved.endDate,
        isActive: saved.isActive,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      };
    } catch (error) {
      // Postgres unique constraint error handling
      if (
        error instanceof QueryFailedError &&
        (error as any).code === '23505'
      ) {
        throw new ConflictException({
          errorCode: 'PROMOTION_CODE_ALREADY_EXISTS',
          message: `Mã khuyến mãi '${code}' đã tồn tại trên hệ thống`,
        });
      }
      throw error;
    }
  }

  // 5. PUT /api/v1/promotions/:id
  async update(id: number, updateDto: UpdatePromotionDto) {
    // 1. Kiểm tra tồn tại
    const promotion = await this.promotionRepository.findOne({
      where: { id: id.toString() },
    });

    if (!promotion) {
      throw new NotFoundException({
        errorCode: 'PROMOTION_NOT_FOUND',
        message: `Không tìm thấy chương trình khuyến mãi với ID ${id}`,
      });
    }

    const {
      code,
      discountType = DiscountType.FIXED_AMOUNT,
      discountValue,
      maxDiscountAmount,
      minOrderAmount = 0,
      usageLimit,
      startDate,
      endDate,
      isActive = true,
    } = updateDto;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 2. Validation: endDate > startDate
    if (end <= start) {
      throw new UnprocessableEntityException({
        errorCode: 'INVALID_DATE_RANGE',
        message:
          'Thời gian kết thúc (endDate) phải lớn hơn thời gian bắt đầu (startDate)',
      });
    }

    // 3. Validation: PERCENTAGE logic constraints
    if (discountType === DiscountType.PERCENTAGE) {
      if (discountValue > 100) {
        throw new UnprocessableEntityException({
          errorCode: 'INVALID_DISCOUNT_PERCENTAGE_VALUE',
          message: 'Giá trị phần trăm giảm giá không được vượt quá 100%',
        });
      }

      if (maxDiscountAmount === undefined || maxDiscountAmount === null) {
        throw new UnprocessableEntityException({
          errorCode: 'MISSING_MAX_DISCOUNT_AMOUNT',
          message:
            'Loại giảm giá PERCENTAGE bắt buộc phải có giá trị giảm tối đa (maxDiscountAmount)',
        });
      }
    }

    // 4. Validation: Unique Code check (Loại trừ chính bản ghi đang update)
    if (code !== promotion.code) {
      const existingCode = await this.promotionRepository.findOne({
        where: { code, id: Not(id.toString()) },
        select: {
          id: true,
        },
      });

      if (existingCode) {
        throw new ConflictException({
          errorCode: 'PROMOTION_CODE_ALREADY_EXISTS',
          message: `Mã khuyến mãi '${code}' đã tồn tại trên hệ thống`,
        });
      }
    }

    // 5. Cập nhật dữ liệu (Giữ nguyên usedCount cũ)
    promotion.code = code;
    promotion.discountType = discountType;
    promotion.discountValue = discountValue;
    promotion.maxDiscountAmount =
      discountType === DiscountType.PERCENTAGE
        ? (maxDiscountAmount ?? null)
        : null;
    promotion.minOrderAmount = minOrderAmount;
    promotion.usageLimit = usageLimit ?? null;
    promotion.startDate = start;
    promotion.endDate = end;
    promotion.isActive = isActive;

    try {
      const saved = await this.promotionRepository.save(promotion);

      return {
        id: Number(saved.id),
        code: saved.code,
        discountType: saved.discountType,
        discountValue: saved.discountValue,
        maxDiscountAmount: saved.maxDiscountAmount,
        minOrderAmount: saved.minOrderAmount,
        usageLimit: saved.usageLimit,
        usedCount: saved.usedCount,
        startDate: saved.startDate,
        endDate: saved.endDate,
        isActive: saved.isActive,
        updatedAt: saved.updatedAt,
      };
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as any).code === '23505'
      ) {
        throw new ConflictException({
          errorCode: 'PROMOTION_CODE_ALREADY_EXISTS',
          message: `Mã khuyến mãi '${code}' đã tồn tại trên hệ thống`,
        });
      }
      throw error;
    }
  }

  // 6. PATCH /api/v1/promotions/:id/status
  async updateStatus(id: number, updateStatusDto: UpdatePromotionStatusDto) {
    const promotion = await this.promotionRepository.findOne({
      where: { id: id.toString() },
      select: {
        id: true,
        code: true,
        isActive: true,
      },
    });

    if (!promotion) {
      throw new NotFoundException({
        errorCode: 'PROMOTION_NOT_FOUND',
        message: `Không tìm thấy chương trình khuyến mãi với ID ${id}`,
      });
    }

    promotion.isActive = updateStatusDto.isActive;
    const saved = await this.promotionRepository.save(promotion);

    const statusText = saved.isActive ? 'Kích hoạt' : 'Tạm dừng';

    return {
      message: `${statusText} chương trình khuyến mãi thành công`,
      data: {
        id: Number(saved.id),
        code: saved.code,
        isActive: saved.isActive,
        updatedAt: saved.updatedAt,
      },
    };
  }

  // 7. POST /api/v1/promotions/validate
  async validateAndCalculate(validateDto: ValidatePromotionDto) {
    const { code, orderAmount } = validateDto;
    const now = new Date();

    // 1. Truy vấn thông tin khuyến mãi
    const promotion = await this.promotionRepository.findOne({
      where: { code },
    });

    if (!promotion) {
      throw new NotFoundException({
        errorCode: 'PROMOTION_NOT_FOUND',
        message: `Mã khuyến mãi '${code}' không tồn tại`,
      });
    }

    // 2. Validation Pipeline
    if (!promotion.isActive) {
      throw new BadRequestException({
        errorCode: 'PROMOTION_INACTIVE',
        message: 'Mã khuyến mãi hiện đang bị tạm dừng',
      });
    }

    if (now < promotion.startDate) {
      throw new BadRequestException({
        errorCode: 'PROMOTION_NOT_STARTED',
        message: 'Mã khuyến mãi chưa đến thời gian áp dụng',
      });
    }

    if (now > promotion.endDate) {
      throw new BadRequestException({
        errorCode: 'PROMOTION_EXPIRED',
        message: 'Mã khuyến mãi đã hết hạn sử dụng',
      });
    }

    if (
      promotion.usageLimit !== null &&
      promotion.usedCount >= promotion.usageLimit
    ) {
      throw new BadRequestException({
        errorCode: 'PROMOTION_USAGE_LIMIT_REACHED',
        message: 'Mã khuyến mãi đã hết lượt sử dụng trên hệ thống',
      });
    }

    if (orderAmount < promotion.minOrderAmount) {
      throw new BadRequestException({
        errorCode: 'ORDER_AMOUNT_BELOW_MINIMUM',
        message: `Đơn hàng chưa đạt giá trị tối thiểu (${promotion.minOrderAmount.toLocaleString('vi-VN')} VND) để áp dụng mã`,
      });
    }

    // 3. Tính toán giá trị giảm giá
    let discountAmount = 0;

    if (promotion.discountType === DiscountType.PERCENTAGE) {
      const calculatedDiscount = (orderAmount * promotion.discountValue) / 100;
      if (
        promotion.maxDiscountAmount !== null &&
        promotion.maxDiscountAmount !== undefined
      ) {
        discountAmount = Math.min(
          calculatedDiscount,
          promotion.maxDiscountAmount,
        );
      } else {
        discountAmount = calculatedDiscount;
      }
    } else if (promotion.discountType === DiscountType.FIXED_AMOUNT) {
      discountAmount = promotion.discountValue;
    }

    // Đảm bảo số tiền giảm không vượt quá tổng giá trị đơn hàng
    discountAmount = Math.min(discountAmount, orderAmount);
    const finalOrderAmount = Math.max(0, orderAmount - discountAmount);

    return {
      promotionId: Number(promotion.id),
      code: promotion.code,
      discountType: promotion.discountType,
      originalOrderAmount: orderAmount,
      discountAmount,
      finalOrderAmount,
      appliedRules: {
        minOrderAmount: promotion.minOrderAmount,
        maxDiscountAmount: promotion.maxDiscountAmount,
        discountValue: promotion.discountValue,
      },
    };
  }

  // 8. GET /api/v1/promotions/:id/usage-stats
  //   async getUsageStats(id: number) {
  //     // 1. Kiểm tra sự tồn tại của chương trình khuyến mãi
  //     const promotion = await this.promotionRepository.findOne({
  //       where: { id: id.toString() },
  //       select: {
  //         id: true,
  //         code: true,
  //         usageLimit: true,
  //         usedCount: true,
  //       },
  //     });

  //     if (!promotion) {
  //       throw new NotFoundException({
  //         errorCode: 'PROMOTION_NOT_FOUND',
  //         message: `Không tìm thấy chương trình khuyến mãi với ID ${id}`,
  //       });
  //     }

  //     // 2. Tính toán các chỉ số lượt sử dụng
  //     const remainingUsage =
  //       promotion.usageLimit !== null
  //         ? Math.max(0, promotion.usageLimit - promotion.usedCount)
  //         : null;

  //     const usagePercentage =
  //       promotion.usageLimit && promotion.usageLimit > 0
  //         ? Number(
  //             ((promotion.usedCount / promotion.usageLimit) * 100).toFixed(2),
  //           )
  //         : null;

  //     // 3. Aggregate tổng tiền giảm và doanh thu tạo ra từ bảng orders
  //     const financialStats = await this.promotionRepository.manager
  //       .createQueryBuilder()
  //       .select('COALESCE(SUM(o.discount_amount), 0)', 'totalDiscountGranted')
  //       .addSelect('COALESCE(SUM(o.final_amount), 0)', 'totalRevenueGenerated')
  //       .from('orders', 'o')
  //       .where('o.promotion_id = :id', { id })
  //       .andWhere("o.status IN ('PAID', 'COMPLETED')") // Chỉ tính các đơn đã thanh toán thành công
  //       .getRawOne();

  //     return {
  //       promotionId: Number(promotion.id),
  //       code: promotion.code,
  //       totalUsageLimit: promotion.usageLimit,
  //       usedCount: promotion.usedCount,
  //       remainingUsage,
  //       usagePercentage,
  //       totalDiscountGranted: Number(financialStats?.totalDiscountGranted || 0),
  //       totalRevenueGenerated: Number(financialStats?.totalRevenueGenerated || 0),
  //     };
  //   }
}
