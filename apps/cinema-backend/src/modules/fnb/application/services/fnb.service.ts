import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { FNB_REPOSITORY } from '../../domain/repositories/fnb.repository.interface.js';
import type { IFnbRepository } from '../../domain/repositories/fnb.repository.interface.js';
import { FnbItem } from '../../domain/entities/fnb-item.entities.js';

import { FnbItemType } from '../../domain/enums/fnb-item-type.enum.js';
import { FnbCategory } from '../../domain/enums/fnb-category.enum.js';

import { GetFnbItemsDto } from '../dto/query-fnb-items.dto.js';
import { CreateFnbItemDto } from '../dto/create-fnb-item.dto.js';
import { UpdateFnbItemDto } from '../dto/update-fnb-item.dto.js';
import { UpdateFnbItemStatusDto } from '../dto/update-fnb-item-status.dto.js';

import { RedisService } from '#src/core/redis/redis.service.js';
import {
  FNB_REDIS_KEYS,
  FNB_CACHE_TTL,
} from '../../infrastructure/constants/fnb-redis.constant.js';

import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';
import { FnbMediaService } from './fnb-media.service.js';

export interface FnbItemsPageResponse {
  items: FnbItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

@Injectable()
export class FnbService {
  constructor(
    @Inject(FNB_REPOSITORY)
    private readonly fnbRepository: IFnbRepository,
    private readonly mediaService: FnbMediaService,
    private readonly redisService: RedisService,
  ) {}

  /** Đọc thẳng từ DB (không qua cache) – dùng cho luồng ghi để tránh sửa trên dữ liệu cũ */
  private async findEntityOrThrow(id: string): Promise<FnbItem> {
    const fnbItem = await this.fnbRepository.findById(id);
    if (!fnbItem) {
      throw new BusinessException(
        ErrorCode.FNB_ITEM_NOT_FOUND,
        `Sản phẩm F&B với ID ${id} không tồn tại trên hệ thống`,
        HttpStatus.NOT_FOUND,
      );
    }
    return fnbItem;
  }

  /** Validate enum type/category + giá bán – dùng chung cho create và update */
  private assertValidProductInput(dto: {
    type: FnbItemType;
    category: FnbCategory;
    basePrice: number;
  }): void {
    if (!Object.values(FnbItemType).includes(dto.type)) {
      throw new BusinessException(
        ErrorCode.INVALID_FNB_TYPE,
        'Loại sản phẩm không hợp lệ (Phải là SINGLE hoặc COMBO)',
      );
    }

    if (!Object.values(FnbCategory).includes(dto.category)) {
      throw new BusinessException(
        ErrorCode.INVALID_FNB_CATEGORY,
        'Nhóm món không hợp lệ (Phải thuộc POPCORN, BEVERAGE, SNACK, COMBO)',
      );
    }

    if (dto.basePrice < 0) {
      throw new BusinessException(
        ErrorCode.INVALID_PRICE_VALUE,
        'Giá bán niêm yết không được nhỏ hơn 0.00',
      );
    }
  }

  // GET api/v1/fnb-items
  async findAll(queryDto: GetFnbItemsDto): Promise<FnbItemsPageResponse> {
    const { category, type, isActive, keyword, page, limit } = queryDto;

    const queryStr = `cat=${category ?? 'all'}:type=${type ?? 'all'}:act=${isActive ?? 'all'}:kw=${keyword ?? 'none'}:p=${page}:l=${limit}`;
    const cacheKey = FNB_REDIS_KEYS.LIST(queryStr);

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const { items, totalItems } = await this.fnbRepository.findMany({
          category,
          type,
          isActive,
          keyword,
          page,
          limit,
        });

        return {
          items,
          pagination: {
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
          },
        };
      },
      FNB_CACHE_TTL,
    );
  }

  // GET api/v1/fnb-items/:id
  async findOne(id: number): Promise<FnbItem> {
    const cacheKey = FNB_REDIS_KEYS.DETAIL(id);

    const item = await this.redisService.getOrSet(
      cacheKey,
      () => this.fnbRepository.findById(id.toString()),
      FNB_CACHE_TTL,
    );

    if (!item) {
      throw new BusinessException(
        ErrorCode.FNB_ITEM_NOT_FOUND,
        `Sản phẩm F&B với ID ${id} không tồn tại trên hệ thống`,
        HttpStatus.NOT_FOUND,
      );
    }

    return item;
  }

  // POST api/v1/fnb-items
  async create(
    createDto: CreateFnbItemDto,
    file?: Express.Multer.File,
  ): Promise<FnbItem> {
    // 1. Validation đầu vào (422 Unprocessable Entity)
    this.assertValidProductInput(createDto);

    // 2. Uniqueness Checks (409 Conflict)
    if (await this.fnbRepository.existsBySku(createDto.sku)) {
      throw new BusinessException(
        ErrorCode.FNB_SKU_ALREADY_EXISTS,
        `Mã SKU '${createDto.sku}' đã tồn tại trên hệ thống`,
        HttpStatus.CONFLICT,
      );
    }

    if (await this.fnbRepository.existsByName(createDto.name)) {
      throw new BusinessException(
        ErrorCode.FNB_NAME_ALREADY_EXISTS,
        `Tên sản phẩm '${createDto.name}' đã tồn tại trên hệ thống`,
        HttpStatus.CONFLICT,
      );
    }

    // 3. Upload media (nếu có), fallback sang URL trong DTO
    const media = await this.mediaService.resolve(
      createDto.imageUrl,
      null,
      file,
    );

    // 4. Khởi tạo & Lưu Entity vào DB; lỗi → dọn asset vừa upload
    let savedItem: FnbItem;
    try {
      const newItem = this.fnbRepository.create({
        ...createDto,
        imageUrl: media.imageUrl,
      });

      savedItem = await this.fnbRepository.save(newItem);
    } catch (error) {
      await this.mediaService.discardUploaded(media);
      throw error;
    }

    // Xóa toàn bộ Cache liên quan đến F&B
    await this.redisService.delByPattern(FNB_REDIS_KEYS.PATTERN_ALL);

    return savedItem;
  }

  // PUT api/v1/fnb-items/:id
  async update(
    id: number,
    updateDto: UpdateFnbItemDto,
    file?: Express.Multer.File,
  ): Promise<FnbItem> {
    // 1. Kiểm tra tồn tại sản phẩm (404 Not Found) – đọc thẳng DB
    const existingItem = await this.findEntityOrThrow(id.toString());

    // 2. Validation Dữ liệu đầu vào (422 Unprocessable Entity)
    this.assertValidProductInput(updateDto);

    // 3. Kiểm tra Trùng lặp SKU & Name loại trừ ID hiện tại (409 Conflict)
    if (await this.fnbRepository.existsBySku(updateDto.sku, existingItem.id)) {
      throw new BusinessException(
        ErrorCode.FNB_SKU_ALREADY_EXISTS,
        `Mã SKU '${updateDto.sku}' đã được sử dụng bởi sản phẩm khác`,
        HttpStatus.CONFLICT,
      );
    }

    if (
      await this.fnbRepository.existsByName(updateDto.name, existingItem.id)
    ) {
      throw new BusinessException(
        ErrorCode.FNB_NAME_ALREADY_EXISTS,
        `Tên sản phẩm '${updateDto.name}' đã được sử dụng bởi sản phẩm khác`,
        HttpStatus.CONFLICT,
      );
    }

    // 4. Xử lý Upload Ảnh (Nếu có file mới đính kèm)
    const media = await this.mediaService.resolve(
      updateDto.imageUrl,
      existingItem,
      file,
    );

    // 5. Cập nhật Entity & Lưu DB; lỗi → dọn asset vừa upload
    Object.assign(existingItem, {
      ...updateDto,
      imageUrl: media.imageUrl,
    });

    let updatedItem: FnbItem;
    try {
      updatedItem = await this.fnbRepository.save(existingItem);
    } catch (error) {
      await this.mediaService.discardUploaded(media);
      throw error;
    }

    // 6. Dọn asset cũ (best-effort) sau khi lưu thành công
    await this.mediaService.cleanupReplaced(media);

    // 7. Xóa toàn bộ Cache danh sách và chi tiết F&B
    await this.redisService.delByPattern(FNB_REDIS_KEYS.PATTERN_ALL);

    return updatedItem;
  }

  // PATCH api/v1/fnb-items/:id/status
  async updateStatus(id: number, updateStatusDto: UpdateFnbItemStatusDto) {
    // 1. Kiểm tra tồn tại sản phẩm (404 Not Found) – đọc thẳng DB
    const existingItem = await this.findEntityOrThrow(id.toString());

    // 2. Cập nhật trạng thái kinh doanh
    existingItem.isActive = updateStatusDto.isActive;
    const updatedItem = await this.fnbRepository.save(existingItem);

    // 3. Xóa toàn bộ Cache danh sách và chi tiết F&B
    await this.redisService.delByPattern(FNB_REDIS_KEYS.PATTERN_ALL);

    // 4. Trả về đúng Data Schema đặc tả yêu cầu
    return {
      id: updatedItem.id,
      sku: updatedItem.sku,
      name: updatedItem.name,
      isActive: updatedItem.isActive,
      updatedAt: updatedItem.updatedAt,
    };
  }
}
