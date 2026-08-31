import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProvinceDto } from './dto/create-province.dto.js';
import { FilterProvinceDto } from './dto/filter-province.dto.js';
import { Province } from './entities/province.entity.js';

@Injectable()
export class ProvincesService {
  constructor(
    @InjectRepository(Province)
    private readonly provinceRepository: Repository<Province>,
  ) {}

  async create(createDto: CreateProvinceDto): Promise<Province> {
    const existingCode = await this.provinceRepository.findOne({
      where: [{ code: createDto.code }, { name: createDto.name }],
    });

    if (existingCode) {
      throw new ConflictException('Mã hoặc tên Tỉnh/Thành phố đã tồn tại');
    }

    const province = this.provinceRepository.create(createDto);
    return await this.provinceRepository.save(province);
  }

  async findAll(filterDto: FilterProvinceDto): Promise<Province[]> {
    const { type, search } = filterDto;
    const query = this.provinceRepository.createQueryBuilder('province');

    if (type) {
      query.andWhere('province.type = :type', { type });
    }

    if (search) {
      query.andWhere(
        '(LOWER(province.name) LIKE LOWER(:search) OR province.code LIKE :search)',
        { search: `%${search}%` },
      );
    }

    query.orderBy('province.name', 'ASC');
    return await query.getMany();
  }
}
