import { Inject, Injectable } from '@nestjs/common';

import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';
import {
  ADMIN_ORDER_QUERY,
  type AdminOrderQueryPort,
} from '../ports/admin-order-query.port.js';
import { QueryAdminOrdersDto } from '../dto/query-admin-orders.dto.js';
import { canViewOrderOf, resolveOrderScope } from './admin-order-scope.js';

type Caller = { roles?: string[]; cineplexId?: string | null };

/** Xem đơn hàng cho trang quản trị (chỉ đọc). */
@Injectable()
export class AdminOrdersService {
  constructor(
    @Inject(ADMIN_ORDER_QUERY)
    private readonly query: AdminOrderQueryPort,
  ) {}

  async list(dto: QueryAdminOrdersDto, caller: Caller) {
    const scope = resolveOrderScope(caller, dto.cineplexId);
    if (!scope) throw this.noScope();

    const page = await this.query.search({
      status: dto.status,
      keyword: dto.keyword,
      date: dto.date,
      cineplexId: scope.cineplexId,
      page: dto.page,
      limit: dto.limit,
    });

    // Không dùng khóa `pagination` ở cấp ngoài: TransformInterceptor sẽ tách nó ra và bỏ mất `summary`
    return {
      items: page.items,
      summary: page.summary,
      page: {
        page: dto.page,
        limit: dto.limit,
        totalItems: page.total,
        totalPages: Math.max(1, Math.ceil(page.total / dto.limit)),
      },
    };
  }

  async detail(orderId: string, caller: Caller) {
    const scope = resolveOrderScope(caller);
    if (!scope) throw this.noScope();

    const order = await this.query.findDetail(orderId);
    // Đơn ngoài phạm vi trả NOT_FOUND để không lộ sự tồn tại
    if (!order || !canViewOrderOf(scope, order.showtime.cineplexId)) {
      throw new BusinessException(
        ErrorCode.ORDER_NOT_FOUND,
        `Không tìm thấy đơn hàng #${orderId}`,
      );
    }
    return order;
  }

  private noScope() {
    return new BusinessException(
      ErrorCode.CINEPLEX_SCOPE_REQUIRED,
      'Tài khoản chưa được gán cụm rạp nên không xem được đơn hàng',
    );
  }
}
