import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { OrdersService } from '../../application/services/orders.service.js';
import { CreateOrderDto } from '../../application/dto/create-order.dto.js';

import { ApiSuccessMessage } from '#src/common/decorators/api-message.decorator.js';
import { CurrentUser } from '#src/common/decorators/current-user.decorator.js';

@Controller('/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // 1. POST api/v1/orders - Khởi tạo đơn hàng từ ghế đang giữ
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiSuccessMessage('Khởi tạo đơn hàng thành công')
  async create(
    // JwtStrategy trả về { userId, email, roles, permissions } - KHÔNG có 'id'
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(userId, dto);
  }

  // 2. GET api/v1/orders/my - Danh sách đơn hàng của user hiện tại
  @Get('my')
  @HttpCode(HttpStatus.OK)
  @ApiSuccessMessage('Lấy danh sách đơn hàng của tôi thành công')
  getMyOrders(@CurrentUser('userId') userId: string) {
    return this.ordersService.getMyOrders(userId);
  }

  // 3. POST api/v1/orders/:id/cancel - Hủy đơn PENDING của tôi
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiSuccessMessage('Hủy đơn hàng thành công')
  cancelOrder(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.cancelOrder(userId, String(id));
  }

  // 4. GET api/v1/orders/:id - Chi tiết đơn hàng (chỉ chủ sở hữu đơn)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiSuccessMessage('Lấy chi tiết đơn hàng thành công')
  getOrderById(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.getOrderById(userId, String(id));
  }
}
