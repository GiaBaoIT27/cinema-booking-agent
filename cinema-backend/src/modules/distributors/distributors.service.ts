import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDistributorDto } from './dto/create-distributor.dto.js';
import { FilterDistributorDto } from './dto/filter-distributor.dto.js';
import { UpdateDistributorDto } from './dto/update-distributor.dto.js';
import { UpdateDistributorStatusDto } from './dto/update-status.dto.js';
import { Distributor } from './entities/distributor.entity.js';

@Injectable()
export class DistributorsService {
  constructor(
    @InjectRepository(Distributor)
    private readonly distributorRepository: Repository<Distributor>,
  ) {}

  async create(createDto: CreateDistributorDto): Promise<Distributor> {
    const existingTaxCode = await this.distributorRepository.findOne({
      where: { taxCode: createDto.taxCode },
    });

    if (existingTaxCode) {
      throw new ConflictException('Mã số thuế này đã tồn tại trên hệ thống!');
    }

    const distributor = this.distributorRepository.create(createDto);
    return await this.distributorRepository.save(distributor);
  }

  async findAll(filterDto: FilterDistributorDto) {
    const { page = 1, limit = 10, search, status } = filterDto;
    const skip = (page - 1) * limit;

    const query = this.distributorRepository.createQueryBuilder('distributor');

    query.select([
      'distributor.id',
      'distributor.name',
      'distributor.contactPerson',
      'distributor.contactPhone',
      'distributor.status',
      'distributor.createdAt',
    ]);

    if (status) {
      query.andWhere('distributor.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(LOWER(distributor.name) LIKE LOWER(:search) OR distributor.taxCode LIKE :search)',
        { search: `%${search}%` },
      );
    }

    query.orderBy('distributor.createdAt', 'DESC');
    query.skip(skip).take(limit);

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

  async findOne(id: string): Promise<Distributor> {
    const distributor = await this.distributorRepository.findOne({
      where: { id },
    });

    if (!distributor) {
      throw new NotFoundException(`Không tìm thấy nhà phát hành với ID: ${id}`);
    }

    return distributor;
  }

  async update(
    id: string,
    updateDto: UpdateDistributorDto,
  ): Promise<Distributor> {
    const distributor = await this.findOne(id);

    if (updateDto.taxCode !== distributor.taxCode) {
      const existingTaxCode = await this.distributorRepository.findOne({
        where: { taxCode: updateDto.taxCode },
      });
      if (existingTaxCode) {
        throw new ConflictException('Mã số thuế đã tồn tại!');
      }
    }

    Object.assign(distributor, updateDto);
    return await this.distributorRepository.save(distributor);
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateDistributorStatusDto,
  ): Promise<Distributor> {
    const distributor = await this.findOne(id);
    distributor.status = updateStatusDto.status;
    return await this.distributorRepository.save(distributor);
  }
}
