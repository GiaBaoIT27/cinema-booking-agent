import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { UploadService } from '../upload/upload.service.js';
import { FnbItemType } from './enums/fnb-item-type.enum.js';
import { FnbCategory } from './enums/fnb-category.enum.js';
import { FnbItem } from './entities/fnb-item.entities.js';
import { GetFnbItemsDto } from './dto/query-fnb-items.dto.js';
import { CreateFnbItemDto } from './dto/create-fnb-item.dto.js';
import { UpdateFnbItemDto } from './dto/update-fnb-item.dto.js';
import { UpdateFnbItemStatusDto } from './dto/update-fnb-item-status.dto.js';
import { RedisService } from '#src/core/redis/redis.service.js';
import {
  FNB_REDIS_KEYS,
  FNB_CACHE_TTL,
} from './constants/fnb-redis.constant.js';

export interface PaginatedFnbResponse {
  items: FnbItem[];
  pagination: {
    page: number;
    limit: number;
    totalElements: number;
    totalPages: number;
  };
}

@Injectable()
export class FnbService {
  private readonly logger = new Logger(FnbService.name);

  constructor(
    @InjectRepository(FnbItem)
    private readonly fnbRepository: Repository<FnbItem>,
    private readonly uploadService: UploadService,
    private readonly redisService: RedisService,
  ) {}

  // GET api/v1/fnb-items
  async findAll(queryDto: GetFnbItemsDto): Promise<PaginatedFnbResponse> {
    const { category, type, isActive, keyword, page, limit } = queryDto;

    const queryStr = `cat=${category ?? 'all'}:type=${type ?? 'all'}:act=${isActive ?? 'all'}:kw=${keyword ?? 'none'}:p=${page}:l=${limit}`;
    const cacheKey = FNB_REDIS_KEYS.LIST(queryStr);

    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        const query = this.fnbRepository.createQueryBuilder('fnb');

        if (category) query.andWhere('fnb.category = :category', { category });
        if (type) query.andWhere('fnb.type = :type', { type });
        if (isActive !== undefined)
          query.andWhere('fnb.is_active = :isActive', { isActive });
        if (keyword) {
          query.andWhere(
            '(fnb.sku ILIKE :keyword OR fnb.name ILIKE :keyword)',
            {
              keyword: `%${keyword}%`,
            },
          );
        }

        query
          .orderBy('fnb.category', 'ASC')
          .addOrderBy('fnb.name', 'ASC')
          .skip((page - 1) * limit)
          .take(limit);

        const [items, totalElements] = await query.getManyAndCount();

        return {
          items,
          pagination: {
            page,
            limit,
            totalElements,
            totalPages: Math.ceil(totalElements / limit),
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
      () => this.fnbRepository.findOne({ where: { id: id.toString() } }),
      FNB_CACHE_TTL,
    );

    if (!item) {
      throw new NotFoundException({
        errorCode: 'FNB_ITEM_NOT_FOUND',
        message: `Sản phẩm F&B với ID ${id} không tồn tại trên hệ thống`,
      });
    }

    return item;
  }

  // POST api/v1/fnb-items
  async create(
    createDto: CreateFnbItemDto,
    file?: Express.Multer.File,
  ): Promise<FnbItem> {
    // 1. Explicit Validation Checks (422 Unprocessable Entity)
    if (!Object.values(FnbItemType).includes(createDto.type)) {
      throw new UnprocessableEntityException({
        errorCode: 'INVALID_FNB_TYPE',
        message: 'Loại sản phẩm không hợp lệ (Phải là SINGLE hoặc COMBO)',
      });
    }

    if (!Object.values(FnbCategory).includes(createDto.category)) {
      throw new UnprocessableEntityException({
        errorCode: 'INVALID_FNB_CATEGORY',
        message:
          'Nhóm món không hợp lệ (Phải thuộc POPCORN, BEVERAGE, SNACK, COMBO)',
      });
    }

    if (createDto.basePrice < 0) {
      throw new UnprocessableEntityException({
        errorCode: 'INVALID_PRICE_VALUE',
        message: 'Giá bán niêm yết không được nhỏ hơn 0.00',
      });
    }

    // 2. Uniqueness Checks (409 Conflict)
    const existingSku = await this.fnbRepository.findOne({
      where: { sku: createDto.sku },
      select: {
        id: true,
        sku: true,
      },
    });
    if (existingSku) {
      throw new ConflictException({
        errorCode: 'FNB_SKU_ALREADY_EXISTS',
        message: `Mã SKU '${createDto.sku}' đã tồn tại trên hệ thống`,
      });
    }

    const existingName = await this.fnbRepository.findOne({
      where: { name: createDto.name },
      select: {
        id: true,
        name: true,
      },
    });
    if (existingName) {
      throw new ConflictException({
        errorCode: 'FNB_NAME_ALREADY_EXISTS',
        message: `Tên sản phẩm '${createDto.name}' đã tồn tại trên hệ thống`,
      });
    }

    // 3. Xử lý Upload Ảnh qua Cloudinary (Nếu client đính kèm file)
    let finalImageUrl = createDto.imageUrl || null;
    if (file) {
      const uploadResult = await this.uploadService.uploadFile(
        file,
        'fnb-items',
      );
      finalImageUrl = uploadResult.secure_url;
    }

    // 4. Khởi tạo & Lưu Entity vào DB
    const newItem = this.fnbRepository.create({
      ...createDto,
      imageUrl: finalImageUrl,
    });

    const savedItem = await this.fnbRepository.save(newItem);

    // Xóa toàn bộ Cache liên quan đến F&B
    await this.redisService.delByPattern(FNB_REDIS_KEYS.PATTERN_ALL);

    return savedItem;
  }

  // PUT api/v1/fnb-items
  async update(
    id: number,
    updateDto: UpdateFnbItemDto,
    file?: Express.Multer.File,
  ): Promise<FnbItem> {
    // 1. Kiểm tra tồn tại sản phẩm (404 Not Found)
    const existingItem = await this.fnbRepository.findOne({
      where: { id: id.toString() },
    });
    if (!existingItem) {
      throw new NotFoundException({
        errorCode: 'FNB_ITEM_NOT_FOUND',
        message: `Sản phẩm F&B với ID ${id} không tồn tại trên hệ thống`,
      });
    }

    // 2. Validation Dữ liệu đầu vào (422 Unprocessable Entity)
    if (!Object.values(FnbItemType).includes(updateDto.type)) {
      throw new UnprocessableEntityException({
        errorCode: 'INVALID_FNB_TYPE',
        message: 'Loại sản phẩm không hợp lệ (Phải là SINGLE hoặc COMBO)',
      });
    }

    if (!Object.values(FnbCategory).includes(updateDto.category)) {
      throw new UnprocessableEntityException({
        errorCode: 'INVALID_FNB_CATEGORY',
        message:
          'Nhóm món không hợp lệ (Phải thuộc POPCORN, BEVERAGE, SNACK, COMBO)',
      });
    }

    if (updateDto.basePrice < 0) {
      throw new UnprocessableEntityException({
        errorCode: 'INVALID_PRICE_VALUE',
        message: 'Giá bán niêm yết không được nhỏ hơn 0.00',
      });
    }

    // 3. Kiểm tra Trùng lặp SKU & Name loại trừ ID hiện tại (409 Conflict)
    const skuConflict = await this.fnbRepository.findOne({
      where: { sku: updateDto.sku, id: Not(id.toString()) },
      select: {
        id: true,
        sku: true,
      },
    });
    if (skuConflict) {
      throw new ConflictException({
        errorCode: 'FNB_SKU_ALREADY_EXISTS',
        message: `Mã SKU '${updateDto.sku}' đã được sử dụng bởi sản phẩm khác`,
      });
    }

    const nameConflict = await this.fnbRepository.findOne({
      where: { name: updateDto.name, id: Not(id.toString()) },
      select: {
        id: true,
        sku: true,
      },
    });
    if (nameConflict) {
      throw new ConflictException({
        errorCode: 'FNB_NAME_ALREADY_EXISTS',
        message: `Tên sản phẩm '${updateDto.name}' đã được sử dụng bởi sản phẩm khác`,
      });
    }

    // 4. Xử lý Upload Ảnh (Nếu có file mới đính kèm)
    let finalImageUrl = updateDto.imageUrl ?? existingItem.imageUrl;
    if (file) {
      const uploadResult = await this.uploadService.uploadFile(
        file,
        'fnb-items',
      );
      finalImageUrl = uploadResult.secure_url;
    }

    // 5. Cập nhật Entity & Lưu DB
    Object.assign(existingItem, {
      ...updateDto,
      imageUrl: finalImageUrl,
    });

    const updatedItem = await this.fnbRepository.save(existingItem);

    // 6. Xóa toàn bộ Cache danh sách và chi tiết F&B
    await this.redisService.delByPattern(FNB_REDIS_KEYS.PATTERN_ALL);

    return updatedItem;
  }

  // PATCH api/v1/fnb-items/:id/status
  async updateStatus(id: number, updateStatusDto: UpdateFnbItemStatusDto) {
    // 1. Kiểm tra tồn tại sản phẩm (404 Not Found)
    const existingItem = await this.fnbRepository.findOne({
      where: { id: id.toString() },
    });
    if (!existingItem) {
      throw new NotFoundException({
        errorCode: 'FNB_ITEM_NOT_FOUND',
        message: `Sản phẩm F&B với ID ${id} không tồn tại trên hệ thống`,
      });
    }

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
