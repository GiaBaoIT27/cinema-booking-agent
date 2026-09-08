import {
  BadRequestException,
  ConflictException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, QueryFailedError, Repository } from 'typeorm';
// import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Province } from './entities/province.entity.js';
import { Ward } from './entities/ward.entity.js';
import { ProvinceType } from './enums/province-type.enum.js';
import { GetProvincesQueryDto } from './dto/query-province.dto.js';
import { GetProvinceWardsQueryDto } from './dto/query-province-wards.dto.js';
import { CreateProvinceDto } from './dto/create-province.dto.js';

@Injectable()
export class ProvincesService {
  // private readonly PROVINCE_CACHE_TTL = 86400 * 1000; // 24 giờ (ms)

  constructor(
    @InjectRepository(Province)
    private readonly provinceRepository: Repository<Province>,
    @InjectRepository(Ward)
    private readonly wardRepository: Repository<Ward>,
    // @Inject(CACHE_MANAGER)
    // private readonly cacheManager: Cache,
  ) {}

  /**
   * Helper xóa tất cả Redis Keys thuộc Pattern provinces:*
   */
  // private async clearProvinceCache(): Promise<void> {
  //   const store = this.cacheManager.store as any;
  //   if (typeof store.keys === 'function') {
  //     const keys: string[] = await store.keys('provinces:*');
  //     if (keys.length > 0) {
  //       await Promise.all(keys.map((key) => this.cacheManager.del(key)));
  //     }
  //   } else {
  //     await this.cacheManager.reset();
  //   }
  // }

  // 1. GET api/v1/provinces
  async findAll(queryDto: GetProvincesQueryDto) {
    const { type, keyword, page, limit } = queryDto;
    const skip = (page - 1) * limit;

    // 1. Tạo Cache Key
    const cacheKey = `provinces:type=${type || 'null'}:kw=${keyword || 'null'}:p=${page}:l=${limit}`;

    // // 2. Kiểm tra Redis Cache
    // const cachedData = await this.cacheManager.get<any>(cacheKey);
    // if (cachedData) {
    //   return cachedData;
    // }

    // 3. Query Database (Cache Miss)
    const qb = this.provinceRepository.createQueryBuilder('p');

    if (type) {
      qb.andWhere('p.type = :type', { type });
    }

    if (keyword) {
      const safeKeyword = `%${keyword.trim().replace(/[%_\\]/g, '\\$&')}%`;
      qb.andWhere('(p.code ILIKE :safeKeyword OR p.name ILIKE :safeKeyword)', {
        safeKeyword,
      });
    }

    const [provinces, totalElements] = await qb
      .orderBy('p.code', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // 4. Transform response
    const result = {
      data: provinces.map((p) => ({
        id: Number(p.id),
        code: p.code,
        name: p.name,
        type: p.type,
        createdAt: p.createdAt,
      })),
      meta: {
        pagination: {
          page,
          limit,
          totalElements,
          totalPages: Math.ceil(totalElements / limit) || 1,
        },
      },
    };

    // 5. Ghi Cache Redis với TTL 24 tiếng
    // await this.cacheManager.set(cacheKey, result, this.PROVINCE_CACHE_TTL);

    return result;
  }

  // 2. POST api/v1/provinces
  async create(createDto: CreateProvinceDto) {
    const { code, name, type } = createDto;

    // 1. Kiểm tra Validate Type Enum (nếu có truyền)
    if (type && !Object.values(ProvinceType).includes(type)) {
      throw new UnprocessableEntityException({
        errorCode: 'INVALID_PROVINCE_TYPE',
        message: 'Loại đơn vị hành chính phải là CITY hoặc PROVINCE',
      });
    }

    // 2. Check trùng Code
    const existingCode = await this.provinceRepository.findOne({
      where: { code },
      select: {
        id: true,
      },
    });

    if (existingCode) {
      throw new ConflictException({
        errorCode: 'PROVINCE_CODE_ALREADY_EXISTS',
        message: `Mã Tỉnh/Thành phố '${code}' đã tồn tại trên hệ thống`,
      });
    }

    // 3. Check trùng Name
    const existingName = await this.provinceRepository.findOne({
      where: { name },
      select: {
        id: true,
      },
    });

    if (existingName) {
      throw new ConflictException({
        errorCode: 'PROVINCE_NAME_ALREADY_EXISTS',
        message: `Tên Tỉnh/Thành phố '${name}' đã tồn tại trên hệ thống`,
      });
    }

    // 4. Lưu vào DB
    try {
      const province = this.provinceRepository.create({
        code,
        name,
        type: type || ProvinceType.PROVINCE,
      });

      const saved = await this.provinceRepository.save(province);

      // 5. Cache Eviction (Xóa toàn bộ Cache liên quan đến provinces)
      // await this.clearProvinceCache();

      return {
        id: Number(saved.id),
        code: saved.code,
        name: saved.name,
        type: saved.type,
        createdAt: saved.createdAt,
      };
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as any).code === '23505'
      ) {
        const detail = (error as any).detail || '';
        if (detail.includes('code')) {
          throw new ConflictException({
            errorCode: 'PROVINCE_CODE_ALREADY_EXISTS',
            message: `Mã Tỉnh/Thành phố '${code}' đã tồn tại`,
          });
        }
        if (detail.includes('name')) {
          throw new ConflictException({
            errorCode: 'PROVINCE_NAME_ALREADY_EXISTS',
            message: `Tên Tỉnh/Thành phố '${name}' đã tồn tại`,
          });
        }
      }
      throw error;
    }
  }

  // 3. GET api/v1/provinces/:id/wards
  async getProvinceWards(
    provinceId: number,
    queryDto: GetProvinceWardsQueryDto,
  ) {
    const { type, keyword, page, limit } = queryDto;
    const skip = (page - 1) * limit;

    // 1. Kiểm tra sự tồn tại của Tỉnh/Thành phố
    const province = await this.provinceRepository.findOne({
      where: { id: provinceId.toString() },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    if (!province) {
      throw new NotFoundException({
        errorCode: 'PROVINCE_NOT_FOUND',
        message: `Không tìm thấy Tỉnh/Thành phố với ID ${provinceId}`,
      });
    }

    // 2. QueryBuilder danh sách Xã/Phường
    const qb = this.wardRepository
      .createQueryBuilder('w')
      .where('w.provinceId = :provinceId', { provinceId });

    if (type) {
      qb.andWhere('w.type = :type', { type });
    }

    if (keyword) {
      const safeKeyword = `%${keyword.trim().replace(/[%_\\]/g, '\\$&')}%`;
      qb.andWhere('(w.code ILIKE :safeKeyword OR w.name ILIKE :safeKeyword)', {
        safeKeyword,
      });
    }

    const [wards, totalElements] = await qb
      .orderBy('w.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // 3. Format Response Schema
    return {
      data: wards.map((w) => ({
        id: Number(w.id),
        provinceId: Number(w.provinceId),
        code: w.code,
        name: w.name,
        type: w.type,
        createdAt: w.createdAt,
      })),
      meta: {
        provinceInfo: {
          id: Number(province.id),
          code: province.code,
          name: province.name,
        },
        pagination: {
          page,
          limit,
          totalElements,
          totalPages: Math.ceil(totalElements / limit) || 1,
        },
      },
    };
  }
}
