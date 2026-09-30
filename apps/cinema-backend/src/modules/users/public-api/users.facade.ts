import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY } from '../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../domain/repositories/user.repository.interface.js';
import { User } from '../domain/entities/user.entity.js';
import { UsersService } from '../application/services/users.service.js';

@Injectable()
export class UsersFacade {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly usersService: UsersService,
  ) {}

  async existsById(id: string): Promise<boolean> {
    const user = await this.userRepository.findById(id);
    return !!user;
  }

  async findByEmail(email: string, includePassword = false): Promise<User | null> {
    return this.userRepository.findByEmail(email, includePassword);
  }

  async findByPhone(phone: string, includePassword = false): Promise<User | null> {
    return this.userRepository.findByPhone(phone, includePassword); // Update this in IUserRepository too
  }

  async findById(id: string, includePassword = false): Promise<User | null> {
    return this.userRepository.findById(id, includePassword);
  }
  
  async registerCustomer(data: any): Promise<any> {
    return this.usersService.registerCustomer(data);
  }
}
