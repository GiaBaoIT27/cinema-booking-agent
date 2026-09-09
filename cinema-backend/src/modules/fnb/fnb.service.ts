import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
// import { CACHE_MANAGER } from '@nestjs/cache-manager';
// import { Cache } from 'cache-manager';
import { UploadService } from '../upload/upload.service.js';
import { FnbItemType } from './enums/fnb-item-type.enum.js';
import { FnbCategory } from './enums/fnb-category.enum.js';
import { FnbItem } from './entities/fnb-item.entities.js';
import { GetFnbItemsDto } from './dto/query-fnb-items.dto.js';
import { CreateFnbItemDto } from './dto/create-fnb-item.dto.js';
import { UpdateFnbItemDto } from './dto/update-fnb-item.dto.js';
import { UpdateFnbItemStatusDto } from './dto/update-fnb-item-status.dto.js';

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
  private readonly CACHE_TTL = 12 * 60 * 60 * 1000; // 12h

  constructor(
    @InjectRepository(FnbItem)
    private readonly fnbRepository: Repository<FnbItem>,
    // @Inject(CACHE_MANAGER)
    // private readonly cacheManager: Cache,
    private readonly uploadService: UploadService,
  ) {}

  // GET api/v1/fnb-items
  async findAll(queryDto: GetFnbItemsDto): Promise<PaginatedFnbResponse> {
    const { category, type, isActive, keyword, page, limit } = queryDto;

    // const cacheKey = `fnb_items:category=${category ?? 'all'}:type=${type ?? 'all'}:active=${isActive ?? 'all'}:kw=${keyword ?? 'none'}:p=${page}:l=${limit}`;

    // try {
    //   const cachedData =
    //     await this.cacheManager.get<PaginatedFnbResponse>(cacheKey);
    //   if (cachedData) {
    //     return cachedData;
    //   }
    // } catch (error) {
    //   this.logger.error(`[Redis Error] Read fail: ${cacheKey}`, error.stack);
    // }

    const query = this.fnbRepository.createQueryBuilder('fnb');

    if (category) query.andWhere('fnb.category = :category', { category });
    if (type) query.andWhere('fnb.type = :type', { type });
    if (isActive !== undefined)
      query.andWhere('fnb.is_active = :isActive', { isActive });
    if (keyword) {
      query.andWhere('(fnb.sku ILIKE :keyword OR fnb.name ILIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    query
      .orderBy('fnb.category', 'ASC')
      .addOrderBy('fnb.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, totalElements] = await query.getManyAndCount();

    const result: PaginatedFnbResponse = {
      items,
      pagination: {
        page,
        limit,
        totalElements,
        totalPages: Math.ceil(totalElements / limit),
      },
    };

    // try {
    //   await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
    // } catch (error) {
    //   this.logger.error(`[Redis Error] Write fail: ${cacheKey}`, error.stack);
    // }

    return result;
  }

  // GET api/v1/fnb-items/:id
  async findOne(id: number): Promise<FnbItem> {
    const item = await this.fnbRepository.findOne({
      where: { id: id.toString() },
    });

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

    // 5. Invalidate toàn bộ Cache dạng fnb_items:*
    // await this.clearFnbCachePattern();

    return savedItem;
  }

  /**
   * Helper xóa toàn bộ cache khớp pattern 'fnb_items:*'
   */
  //   private async clearFnbCachePattern(): Promise<void> {
  //     try {
  //       const store = this.cacheManager.store as any;
  //       if (typeof store.keys === 'function') {
  //         const keys: string[] = await store.keys('fnb_items:*');
  //         if (keys && keys.length > 0) {
  //           if (typeof store.mdel === 'function') {
  //             await store.mdel(...keys);
  //           } else {
  //             await Promise.all(keys.map((key) => this.cacheManager.del(key)));
  //           }
  //         }
  //       }
  //     } catch (error) {
  //       this.logger.error(
  //         '[Redis Invalidation Error] Không thể xóa cache pattern fnb_items:*',
  //         error.stack,
  //       );
  //     }
  //   }

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

    // 6. Invalidate toàn bộ Cache dạng fnb_items:*
    // await this.clearFnbCachePattern();

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

    // 3. Invalidate toàn bộ Cache dạng fnb_items:*
    // await this.clearFnbCachePattern();

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
