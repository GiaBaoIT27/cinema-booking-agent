import { describe, it, expect } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { VnPayGateway } from './vnpay.gateway.js';

describe('VnPayGateway.refund', () => {
  it('chưa tích hợp API hoàn tiền => báo thất bại, không giả vờ đã hoàn tiền', async () => {
    const gateway = new VnPayGateway(new ConfigService({}));

    const result = await gateway.refund({
      orderId: 1,
      gatewayTxnRef: 'ORD-TEST-1',
      amount: 176000,
    });

    // RefundService chỉ chuyển REFUND_PENDING -> REFUNDED khi success = true,
    // nên giao dịch được giữ ở REFUND_PENDING cho tới khi hoàn tiền thủ công.
    expect(result.success).toBe(false);
    expect(result.responseCode).toBe('NOT_IMPLEMENTED');
  });
});
