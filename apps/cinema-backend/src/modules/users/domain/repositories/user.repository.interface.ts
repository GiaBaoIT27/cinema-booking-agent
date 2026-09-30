import { User } from '../entities/user.entity.js';

export interface IUserRepository {
  findById(id: string, includePassword?: boolean): Promise<User | null>;

  findByEmail(email: string, includePassword?: boolean): Promise<User | null>;

  findByPhone(phoneNumber: string, includePassword?: boolean): Promise<User | null>;

  /** Tìm theo email hoặc số điện thoại (dành cho xác thực đăng nhập) */
  findByEmailOrPhone(
    identifier: string,
    includePassword?: boolean,
  ): Promise<User | null>;

  /** Kiểm tra trùng lặp email hoặc phoneNumber khi đăng ký hoặc cập nhật profile */
  findExistingByEmailOrPhone(
    email: string,
    phoneNumber: string,
    excludeId?: string,
  ): Promise<User | null>;

  findAll(options: {
    page: number;
    limit: number;
    membershipTier?: string;
    status?: string;
    keyword?: string;
  }): Promise<{ items: User[]; total: number }>;

  save(user: User): Promise<User>;

  create(data: Partial<User>): User;

  addPoints(userId: string, points: number): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
