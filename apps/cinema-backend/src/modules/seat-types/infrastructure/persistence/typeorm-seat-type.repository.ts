import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';

import { SeatType } from '../../domain/entities/seat-type.entity.js';
import type { ISeatTypeRepository } from '../../domain/repositories/seat-types.repository.interface.js';

@Injectable()
export class TypeOrmSeatTypeRepository implements ISeatTypeRepository {
  constructor(
    @InjectRepository(SeatType)
    private readonly repo: Repository<SeatType>,
  ) {}

  findAll(): Promise<SeatType[]> {
    return this.repo.find({ order: { displayOrder: 'ASC', id: 'ASC' } });
  }

  findById(id: string): Promise<SeatType | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIds(ids: string[]): Promise<SeatType[]> {
    if (!ids.length) return [];
    return this.repo.find({ where: { id: In(ids) } });
  }

  async existsById(id: string): Promise<boolean> {
    return (await this.repo.count({ where: { id } })) > 0;
  }

  async countByIds(ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    return this.repo.count({ where: { id: In(ids) } });
  }

  async existsByCode(code: string, excludeId?: string): Promise<boolean> {
    const count = await this.repo.count({
      where: excludeId ? { code, id: Not(excludeId) } : { code },
    });
    return count > 0;
  }

  create(data: Partial<SeatType>): SeatType {
    return this.repo.create(data);
  }

  save(seatType: SeatType): Promise<SeatType> {
    return this.repo.save(seatType);
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
