import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
// import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Ward } from './entities/ward.entity.js';
import { Province } from './entities/province.entity.js';
import { GetWardsQueryDto } from './dto/query-wards.dto.js';
import { CreateWardDto } from './dto/create-ward.dto.js';

@Injectable()
export class WardsService {
  constructor(
    @InjectRepository(Ward)
    private readonly wardRepository: Repository<Ward>,
    @InjectRepository(Province)
    private readonly provinceRepository: Repository<Province>,
    // @Inject(CACHE_MANAGER)
    // private readonly cacheManager: Cache,
  ) {}

  // 1. GET api/v1/wards
  async findAll(queryDto: GetWardsQueryDto) {
    const { provinceId, type, keyword, page, limit } = queryDto;
    const skip = (page - 1) * limit;

    // QueryBuilder join với bảng provinces
    const qb = this.wardRepository
      .createQueryBuilder('w')
      .innerJoinAndSelect('w.province', 'p');

    if (provinceId) {
      qb.andWhere('w.provinceId = :provinceId', { provinceId });
    }

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
      .orderBy('w.id', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Mapping đúng chuẩn Response Schema
    return {
      data: wards.map((w) => ({
        id: Number(w.id),
        provinceId: Number(w.provinceId),
        provinceName: w.province?.name,
        code: w.code,
        name: w.name,
        type: w.type,
        createdAt: w.createdAt,
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
  }

  // 2. POST api/v1/wards
  async create(createDto: CreateWardDto) {
    const { provinceId, code, name, type } = createDto;

    // 1. Kiểm tra tồn tại Tỉnh/Thành phố (Foreign Key Validation)
    const provinceExists = await this.provinceRepository.findOne({
      where: { id: provinceId.toString() },
      select: {
        id: true,
      },
    });

    if (!provinceExists) {
      throw new NotFoundException({
        errorCode: 'PROVINCE_NOT_FOUND',
        message: `Không tìm thấy Tỉnh/Thành phố với ID ${provinceId}`,
      });
    }

    // 2. Kiểm tra duy nhất code Xã/Phường
    const existingCode = await this.wardRepository.findOne({
      where: { code },
      select: {
        id: true,
      },
    });

    if (existingCode) {
      throw new ConflictException({
        errorCode: 'WARD_CODE_ALREADY_EXISTS',
        message: `Mã Xã/Phường '${code}' đã tồn tại trên hệ thống`,
      });
    }

    // 3. Thực thi Ghi DB
    try {
      const ward = this.wardRepository.create({
        provinceId: provinceId.toString(),
        code,
        name,
        type,
      });

      const saved = await this.wardRepository.save(ward);

      // 4. Clear Cache Redis liên quan đến Xã/Phường
      // await this.clearWardCache();

      return {
        id: Number(saved.id),
        provinceId: Number(saved.provinceId),
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
        throw new ConflictException({
          errorCode: 'WARD_CODE_ALREADY_EXISTS',
          message: `Mã Xã/Phường '${code}' đã tồn tại trên hệ thống`,
        });
      }
      throw error;
    }
  }
}
