import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { OrderService } from '../services/order.service.js';
import { CreateOrderDto } from '../dto/create-order.dto.js';
import { OrderCreatedResponseDto } from '../dto/create-order-response.dto.js';

import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { ApiSuccessMessage } from '#src/common/decorators/api-message.decorator.js';
import { CurrentUser } from '#src/common/decorators/current-user.decorator.js';

@Controller('/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // 1. POST api/v1/orders - Khởi tạo đơn hàng từ ghế đang giữ
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiSuccessMessage('Khởi tạo đơn hàng thành công')
  async create(
    // JwtStrategy trả về { userId, email, roles, permissions } - KHÔNG có 'id'
    @CurrentUser('userId') userId: string,
    @Body() createDto: CreateOrderDto,
  ): Promise<OrderCreatedResponseDto> {
    const result = await this.orderService.createOrder(userId, createDto);

    return plainToInstance(OrderCreatedResponseDto, result, {
      excludeExtraneousValues: true,
    });
  }

  // 2. GET api/v1/orders/my - Danh sách đơn hàng của user hiện tại
  @Get('my')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiSuccessMessage('Lấy danh sách đơn hàng của tôi thành công')
  getMyOrders(@CurrentUser('userId') userId: string) {
    return this.orderService.getMyOrders(userId);
  }

  // 3. POST api/v1/orders/:id/cancel - Hủy đơn PENDING của tôi
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiSuccessMessage('Hủy đơn hàng thành công')
  cancelOrder(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.cancelOrder(userId, id);
  }

  // 4. GET api/v1/orders/:id - Chi tiết đơn hàng (chỉ chủ sở hữu đơn)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiSuccessMessage('Lấy chi tiết đơn hàng thành công')
  getOrderById(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderService.getOrderById(userId, id);
  }
}
