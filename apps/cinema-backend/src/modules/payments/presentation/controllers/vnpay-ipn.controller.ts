import {
  Controller,
  Get,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { PaymentsService } from '../../application/services/payments.service.js';
import { VnPayIpnQueryDto } from '../../application/dto/vnpay-ipn-query.dto.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import { Public } from '#src/common/decorators/public.decorator.js';

@Controller('payments/vnpay')
export class VnPayIpnController {
  private readonly logger = new Logger(VnPayIpnController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * GET /api/v1/payments/vnpay/ipn
   * VNPay Server gọi Webhook (IPN) ngầm sang đây để cập nhật trạng thái thanh toán.
   * Endpoint bắt buộc phải @Public() và trả về định dạng { RspCode, Message } theo tài liệu VNPay.
   */
  @Public()
  @Get('ipn')
  @HttpCode(HttpStatus.OK)
  async handleIpn(@Query() query: VnPayIpnQueryDto) {
    this.logger.log(`[VNPay IPN] Nhận callback từ server VNPay: ${JSON.stringify(query)}`);
    return this.paymentsService.handleIpn(PaymentMethod.VNPAY, query);
  }

  /**
   * GET /api/v1/payments/vnpay/return
   * User hoàn tất thanh toán trên cổng VNPay và được redirect về trình duyệt.
   */
  @Public()
  @Get('return')
  async handleReturn(@Query() query: VnPayIpnQueryDto, @Res() res: Response) {
    this.logger.log(`[VNPay Return] User redirect về từ VNPay: ${JSON.stringify(query)}`);

    // Cũng đảm bảo cập nhật trạng thái thanh toán nếu IPN chưa kịp gọi tới
    await this.paymentsService.handleIpn(PaymentMethod.VNPAY, query);

    const isSuccess = query.vnp_ResponseCode === '00';
    const txnRef = query.vnp_TxnRef || '';
    const frontendUrl = process.env.WEB_BASE_URL || 'http://localhost:3001';

    // Chuyển hướng người dùng về trang thông báo kết quả của Frontend
    return res.redirect(
      `${frontendUrl}/payment-result?status=${isSuccess ? 'success' : 'failed'}&txnRef=${txnRef}&code=${query.vnp_ResponseCode || ''}`,
    );
  }
}

