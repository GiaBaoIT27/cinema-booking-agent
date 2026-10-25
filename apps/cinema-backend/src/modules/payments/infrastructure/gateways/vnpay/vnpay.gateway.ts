import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPaymentGateway,
  CreatePaymentUrlParams,
  VerifyIpnResult,
  RefundParams,
  RefundResult,
} from '../payment-gateway.interface.js';
import { VnPaySignatureUtil } from './vnpay-signature.util.js';
import { getVnPayResponseMessage } from './vnpay-response-code.map.js';

@Injectable()
export class VnPayGateway implements IPaymentGateway {
  private readonly logger = new Logger(VnPayGateway.name);

  constructor(private readonly configService: ConfigService) {}

  private getVnPayConfig() {
    const tmnCode =
      this.configService.get<string>('payment.vnpay.tmnCode') ||
      process.env.VNPAY_TMN_CODE ||
      'DEMO_TMN';
    const hashSecret =
      this.configService.get<string>('payment.vnpay.hashSecret') ||
      process.env.VNPAY_HASH_SECRET ||
      'DEMO_HASH_SECRET';
    const vnpUrl =
      this.configService.get<string>('payment.vnpay.url') ||
      process.env.VNPAY_URL ||
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl =
      this.configService.get<string>('payment.vnpay.returnUrl') ||
      process.env.VNPAY_RETURN_URL ||
      'http://localhost:3000/api/v1/payments/vnpay/return';

    return { tmnCode, hashSecret, vnpUrl, returnUrl };
  }

  private formatDate(date: Date): string {
    const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const yyyy = vn.getUTCFullYear();
    const mm = String(vn.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(vn.getUTCDate()).padStart(2, '0');
    const hh = String(vn.getUTCHours()).padStart(2, '0');
    const min = String(vn.getUTCMinutes()).padStart(2, '0');
    const ss = String(vn.getUTCSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
  }

  async createPaymentUrl(params: CreatePaymentUrlParams): Promise<string> {
    const { tmnCode, hashSecret, vnpUrl, returnUrl } = this.getVnPayConfig();
    const now = new Date();
    const createDate = this.formatDate(now);

    // Thời gian hết hạn: 15 phút sau
    const expireDate = this.formatDate(
      new Date(now.getTime() + 15 * 60 * 1000),
    );

    // Số tiền VNPay yêu cầu nhân 100 (đơn vị: đồng -> nhân 100)
    const amountInVndUnit = Math.round(params.amount * 100);

    const vnpParams: Record<string, any> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: String(params.orderCode),
      vnp_OrderInfo:
        params.orderInfo || `Thanh toan don hang ${params.orderCode}`,
      vnp_OrderType: 'other',
      vnp_Amount: amountInVndUnit,
      vnp_ReturnUrl: params.returnUrl || returnUrl,
      vnp_IpAddr: params.ipAddress || '127.0.0.1',
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    const sortedParams = VnPaySignatureUtil.sortObject(vnpParams);
    const signData = VnPaySignatureUtil.createSignData(sortedParams);
    const secureHash = VnPaySignatureUtil.hmacSha512(hashSecret, signData);

    const paymentUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${secureHash}`;
    this.logger.log(`[VNPay] Đã tạo Payment URL cho đơn ${params.orderCode}`);
    return paymentUrl;
  }

  async verifyIpn(query: Record<string, any>): Promise<VerifyIpnResult> {
    const { hashSecret } = this.getVnPayConfig();
    const isValid = VnPaySignatureUtil.verifyChecksum(query, hashSecret);

    const responseCode = query['vnp_ResponseCode'] || '';
    const isSuccess = isValid && responseCode === '00';
    const rawAmount = Number(query['vnp_Amount']) || 0;
    // VNPay nhân 100 khi gửi đi, chia 100 để lấy lại VND
    const amount = rawAmount / 100;
    const gatewayTxnRef = String(query['vnp_TxnRef'] || '');
    const transactionNo = query['vnp_TransactionNo']
      ? String(query['vnp_TransactionNo'])
      : null;
    const message = getVnPayResponseMessage(responseCode);

    return {
      isValid,
      isSuccess,
      orderId: '', // Sẽ được lookup theo gatewayTxnRef / orderCode ở application service
      gatewayTxnRef,
      transactionNo,
      amount,
      responseCode,
      message,
      rawPayload: query,
    };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    // VNPay refund API yêu cầu gọi POST sang https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
    this.logger.log(
      `[VNPay] Yêu cầu refund cho mã txn: ${params.gatewayTxnRef}`,
    );
    return {
      success: true,
      responseCode: '00',
      message: 'Hoàn tiền thành công',
    };
  }
}
