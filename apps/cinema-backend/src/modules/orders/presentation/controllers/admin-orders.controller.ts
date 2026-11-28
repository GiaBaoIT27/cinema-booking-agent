import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';

import { ApiSuccessMessage } from '#src/common/decorators/api-message.decorator.js';
import { CurrentUser } from '#src/common/decorators/current-user.decorator.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';
import { AdminOrdersService } from '../../application/services/admin-orders.service.js';
import { QueryAdminOrdersDto } from '../../application/dto/query-admin-orders.dto.js';

type Caller = { roles?: string[]; cineplexId?: string | null };

/** Đơn hàng cho trang quản trị — quyền order:manage (SUPER_ADMIN, CINEMA_MANAGER). */
@Controller('/admin/orders')
export class AdminOrdersController {
  constructor(private readonly adminOrders: AdminOrdersService) {}

  // GET api/v1/admin/orders
  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('order:manage')
  @ApiSuccessMessage('Lấy danh sách đơn hàng thành công')
  list(@Query() query: QueryAdminOrdersDto, @CurrentUser() caller: Caller) {
    return this.adminOrders.list(query, caller);
  }

  // GET api/v1/admin/orders/:id
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('order:manage')
  @ApiSuccessMessage('Lấy chi tiết đơn hàng thành công')
  detail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() caller: Caller,
  ) {
    return this.adminOrders.detail(String(id), caller);
  }
}
