import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, Not } from 'typeorm';
import { User } from '../../domain/entities/user.entity.js';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface.js';

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findById(id: string, includePassword = false): Promise<User | null> {
    const qb = this.repo.createQueryBuilder('user').where('user.id = :id', { id });
    if (includePassword) {
      qb.addSelect('user.passwordHash');
    }
    return qb.getOne();
  }

  async findByEmail(email: string, includePassword = false): Promise<User | null> {
    const qb = this.repo.createQueryBuilder('user').where('user.email = :email', { email });
    if (includePassword) {
      qb.addSelect('user.passwordHash');
    }
    return qb.getOne();
  }

  async findByPhone(phoneNumber: string, includePassword = false): Promise<User | null> {
    const qb = this.repo.createQueryBuilder('user').where('user.phoneNumber = :phoneNumber', { phoneNumber });
    if (includePassword) {
      qb.addSelect('user.passwordHash');
    }
    return qb.getOne();
  }

  async findByEmailOrPhone(
    identifier: string,
    includePassword = false,
  ): Promise<User | null> {
    const qb = this.repo
      .createQueryBuilder('user')
      .where('user.email = :identifier OR user.phoneNumber = :identifier', {
        identifier,
      });

    if (includePassword) {
      qb.addSelect('user.passwordHash');
    }

    return qb.getOne();
  }

  async findExistingByEmailOrPhone(
    email: string,
    phoneNumber: string,
    excludeId?: string,
  ): Promise<User | null> {
    const qb = this.repo
      .createQueryBuilder('user')
      .where('(user.email = :email OR user.phoneNumber = :phoneNumber)', {
        email,
        phoneNumber,
      });

    if (excludeId) {
      qb.andWhere('user.id != :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  async findAll(options: {
    page: number;
    limit: number;
    membershipTier?: string;
    status?: string;
    keyword?: string;
  }): Promise<{ items: User[]; total: number }> {
    const { page, limit, membershipTier, status, keyword } = options;

    const qb = this.repo.createQueryBuilder('user');

    if (membershipTier) {
      qb.andWhere('user.membershipTier = :membershipTier', { membershipTier });
    }

    if (status) {
      qb.andWhere('user.status = :status', { status });
    }

    if (keyword) {
      const formattedKeyword = `%${keyword.trim()}%`;
      qb.andWhere(
        new Brackets((bracketQb) => {
          bracketQb
            .where('user.email ILIKE :keyword', { keyword: formattedKeyword })
            .orWhere('user.phoneNumber ILIKE :keyword', { keyword: formattedKeyword })
            .orWhere('user.fullName ILIKE :keyword', { keyword: formattedKeyword });
        }),
      );
    }

    qb.orderBy('user.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  create(data: Partial<User>): User {
    return this.repo.create(data);
  }

  async addPoints(userId: string, points: number): Promise<void> {
    await this.repo.increment({ id: userId }, 'loyaltyPoints', points);
  }
}
