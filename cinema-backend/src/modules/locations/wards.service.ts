import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWardDto } from './dto/create-ward.dto.js';
import { FilterWardDto } from './dto/filter-ward.dto.js';
import { Province } from './entities/province.entity.js';
import { Ward } from './entities/ward.entity.js';

@Injectable()
export class WardsService {
  constructor(
    @InjectRepository(Ward)
    private readonly wardRepository: Repository<Ward>,
    @InjectRepository(Province)
    private readonly provinceRepository: Repository<Province>,
  ) {}

  async create(createDto: CreateWardDto): Promise<Ward> {
    const province = await this.provinceRepository.findOne({
      where: { id: createDto.provinceId },
    });

    if (!province) {
      throw new NotFoundException('Không tìm thấy Tỉnh/Thành phố tương ứng');
    }

    const existingCode = await this.wardRepository.findOne({
      where: { code: createDto.code },
    });

    if (existingCode) {
      throw new ConflictException('Mã Xã/Phường này đã tồn tại');
    }

    const ward = this.wardRepository.create(createDto);
    return await this.wardRepository.save(ward);
  }

  async findByProvince(
    provinceId: string,
    filterDto: Omit<FilterWardDto, 'provinceId'>,
  ): Promise<Ward[]> {
    const { type, search } = filterDto;
    const query = this.wardRepository
      .createQueryBuilder('ward')
      .where('ward.provinceId = :provinceId', { provinceId });

    if (type) {
      query.andWhere('ward.type = :type', { type });
    }

    if (search) {
      query.andWhere(
        '(LOWER(ward.name) LIKE LOWER(:search) OR ward.code LIKE :search)',
        { search: `%${search}%` },
      );
    }

    query.orderBy('ward.name', 'ASC');
    return await query.getMany();
  }

  async findAll(filterDto: FilterWardDto) {
    const { page = 1, limit = 10, provinceId, type, search } = filterDto;
    const skip = (page - 1) * limit;

    const query = this.wardRepository
      .createQueryBuilder('ward')
      .leftJoinAndSelect('ward.province', 'province');

    if (provinceId) {
      query.andWhere('ward.provinceId = :provinceId', { provinceId });
    }

    if (type) {
      query.andWhere('ward.type = :type', { type });
    }

    if (search) {
      query.andWhere(
        '(LOWER(ward.name) LIKE LOWER(:search) OR ward.code LIKE :search)',
        { search: `%${search}%` },
      );
    }

    query.orderBy('ward.id', 'ASC').skip(skip).take(limit);

    const [items, total] = await query.getManyAndCount();

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
