import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from '../../application/services/payments.service.js';
import { InitiatePaymentDto } from '../../application/dto/initiate-payment.dto.js';
import { ApiSuccessMessage } from '#src/common/decorators/api-message.decorator.js';
import { CurrentUser } from '#src/common/decorators/current-user.decorator.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /api/v1/payments/initiate
   * Tạo phiên thanh toán cho đơn hàng
   */
  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  @ApiSuccessMessage('Khởi tạo giao dịch thanh toán thành công')
  async initiate(
    @CurrentUser('userId') userId: string,
    @Body() dto: InitiatePaymentDto,
    @Req() req: Request,
  ) {
    const rawIp =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const ipAddress =
      rawIp === '::1' || rawIp.includes('::ffff:') ? '127.0.0.1' : rawIp;

    return this.paymentsService.initiate(userId, dto, ipAddress);
  }

  /**
   * GET /api/v1/payments/:orderId
   * Lấy lịch sử và thông tin thanh toán của đơn hàng
   */
  @Get(':orderId')
  @HttpCode(HttpStatus.OK)
  @ApiSuccessMessage('Lấy thông tin thanh toán thành công')
  async getPaymentByOrderId(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentByOrderId(orderId);
  }
}
