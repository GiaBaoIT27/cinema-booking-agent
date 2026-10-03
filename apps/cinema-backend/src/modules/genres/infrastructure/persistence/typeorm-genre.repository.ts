import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, QueryFailedError, Repository } from 'typeorm';
import { Genre } from '../../domain/entities/genre.entity.js';
import type {
  GenreSearchCriteria,
  IGenreRepository,
} from '../../domain/repositories/genre.repository.interface.js';
import { toUniqueViolation } from './unique-violation.parser.js';

/** Escape ký tự đặc biệt của LIKE/ILIKE (\, %, _) để tìm đúng chuỗi người dùng nhập. */
const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class TypeOrmGenreRepository implements IGenreRepository {
  constructor(
    @InjectRepository(Genre)
    private readonly repo: Repository<Genre>,
  ) {}

  async search(
    criteria: GenreSearchCriteria,
  ): Promise<{ items: Genre[]; total: number }> {
    const { keyword, page, limit } = criteria;
    const qb = this.repo.createQueryBuilder('genre');

    if (keyword) {
      qb.where('genre.code ILIKE :keyword OR genre.name ILIKE :keyword', {
        keyword: `%${escapeLike(keyword)}%`,
      });
    }

    qb.orderBy('genre.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  findAll(): Promise<Genre[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  findById(id: string): Promise<Genre | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIds(ids: string[]): Promise<Genre[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repo.find({ where: { id: In(ids) } });
  }

  exists(id: string): Promise<boolean> {
    return this.repo.exists({ where: { id } });
  }

  existsCode(code: string, excludeId?: string): Promise<boolean> {
    return this.repo.exists({
      where: excludeId ? { code, id: Not(excludeId) } : { code },
    });
  }

  existsName(name: string, excludeId?: string): Promise<boolean> {
    return this.repo.exists({
      where: excludeId ? { name, id: Not(excludeId) } : { name },
    });
  }

  create(data: Partial<Genre>): Genre {
    return this.repo.create(data);
  }

  async save(genre: Genre): Promise<Genre> {
    try {
      return await this.repo.save(genre);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const violation = toUniqueViolation(error);
        if (violation) throw violation;
      }
      throw error;
    }
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete({ id });
  }
}
