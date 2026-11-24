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
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentsService } from '../../application/services/payments.service.js';
import { PaymentReturnService } from '../../application/services/payment-return.service.js';
import { VnPayIpnQueryDto } from '../../application/dto/vnpay-ipn-query.dto.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import { Public } from '#src/common/decorators/public.decorator.js';

// Server VNPay gọi IPN (có thể gọi lặp nhiều lần) – không được chặn vì rate limit
@SkipThrottle()
@Controller('payments/vnpay')
export class VnPayIpnController {
  private readonly logger = new Logger(VnPayIpnController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentReturn: PaymentReturnService,
  ) {}

  /**
   * GET /api/v1/payments/vnpay/ipn
   * VNPay Server gọi Webhook (IPN) ngầm sang đây để cập nhật trạng thái thanh toán.
   * Endpoint bắt buộc phải @Public() và trả về định dạng { RspCode, Message } theo tài liệu VNPay.
   */
  @Public()
  @Get('ipn')
  @HttpCode(HttpStatus.OK)
  async handleIpn(@Query() query: VnPayIpnQueryDto) {
    this.logger.log(
      `[VNPay IPN] Nhận callback từ server VNPay: ${JSON.stringify(query)}`,
    );
    return this.paymentsService.handleIpn(PaymentMethod.VNPAY, query);
  }

  /**
   * GET /api/v1/payments/vnpay/return
   * User hoàn tất thanh toán trên cổng VNPay và được redirect về trình duyệt.
   */
  @Public()
  @Get('return')
  async handleReturn(@Query() query: VnPayIpnQueryDto, @Res() res: Response) {
    this.logger.log(
      `[VNPay Return] User redirect về từ VNPay: ${JSON.stringify(query)}`,
    );

    // Cũng đảm bảo cập nhật trạng thái thanh toán nếu IPN chưa kịp gọi tới
    await this.paymentsService.handleIpn(PaymentMethod.VNPAY, query);

    const isSuccess = query.vnp_ResponseCode === '00';
    const redirectUrl = await this.paymentReturn.redirectFor({
      status: isSuccess ? 'success' : 'failed',
      txnRef: query.vnp_TxnRef || '',
      code: query.vnp_ResponseCode || '',
    });

    // Chuyển hướng tới nơi client đã chọn khi khởi tạo (web, trang /done, hoặc deep link)
    return res.redirect(redirectUrl);
  }

  /**
   * GET /api/v1/payments/vnpay/done
   * Trang kết quả tối giản cho trình duyệt trên điện thoại (app mobile không cấu hình
   * deep link). Kết quả thật app đọc từ trạng thái đơn trên server, trang này chỉ báo
   * người dùng đóng trình duyệt để quay lại ứng dụng.
   */
  @Public()
  @Get('done')
  paymentDone(@Query('status') status: string, @Res() res: Response) {
    const ok = status === 'success';
    const title = ok ? 'Thanh toán thành công' : 'Thanh toán chưa thành công';
    const detail = ok
      ? 'Vé của bạn đã được ghi nhận. Hãy đóng trình duyệt để quay lại ứng dụng.'
      : 'Giao dịch chưa hoàn tất. Hãy đóng trình duyệt và thử lại trong ứng dụng.';
    res
      .status(HttpStatus.OK)
      .type('html')
      .send(
        `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>` +
          `<body style="margin:0;font-family:system-ui,sans-serif;background:#0b0f19;color:#f3f4f6;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px">` +
          `<main><div style="font-size:56px">${ok ? '✅' : '⚠️'}</div><h1 style="font-size:22px">${title}</h1><p style="color:#9ca3af;max-width:320px">${detail}</p></main></body></html>`,
      );
  }
}
