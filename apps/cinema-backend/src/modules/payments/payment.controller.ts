import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service.js';
import { PaymentGateway } from './enums/payment-gateway.enum.js';
import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { ApiSuccessMessage } from '#src/common/decorators/api-message.decorator.js';
import { CurrentUser } from '#src/common/decorators/current-user.decorator.js';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * POST /api/v1/payments/create-url
   * User bấm thanh toán -> Tạo phiên giao dịch -> Trả về URL để redirect tới cổng thanh toán
   */
  @Post('create-url')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiSuccessMessage('Tạo URL thanh toán thành công')
  createPaymentUrl(
    @CurrentUser('userId') userId: string,
    @Body('orderId') orderId: number,
    @Body('gateway') gateway?: PaymentGateway,
  ) {
    return this.paymentService.createPaymentUrl(userId, orderId, gateway);
  }

  /**
   * GET /api/v1/payments/mock/callback
   * Đường dẫn nhận callback mô phỏng từ cổng thanh toán giả lập.
   * Cổng thanh toán gọi về đây (Webhook) khi user thanh toán xong.
   */
  @Get('mock/callback')
  @HttpCode(HttpStatus.OK)
  @ApiSuccessMessage('Xử lý callback thanh toán thành công')
  async mockCallback(
    @Query('txnRef') txnRef: string,
    @Query('status') status: string,
  ) {
    return this.paymentService.processMockCallback(txnRef, status);
  }
}
