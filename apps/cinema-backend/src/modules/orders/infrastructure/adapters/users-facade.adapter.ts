import { Injectable } from '@nestjs/common';

import { UsersFacade } from '#modules/users/public-api/index.js';
import type {
  CustomerRef,
  ICustomerLookup,
} from '../../application/ports/customer-lookup.port.js';

/** Adapter đọc thông tin liên hệ của khách qua public API của module users. */
@Injectable()
export class UsersFacadeAdapter implements ICustomerLookup {
  constructor(private readonly usersFacade: UsersFacade) {}

  async findById(userId: string): Promise<CustomerRef | null> {
    const user = await this.usersFacade.findById(userId);
    if (!user) return null;
    return {
      id: String(user.id),
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber ?? null,
    };
  }
}
