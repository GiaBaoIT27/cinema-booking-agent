import { Injectable } from '@nestjs/common';

// ⚠ Import sâu vào service của module `promotions` (module này chưa có public-api).
// Cô lập tại đây; khi promotions có PromotionsFacade, chỉ cần thay file này.
import { PromotionsService } from '#modules/promotions/promotions.service.js';
import type { IVoucherCalculator } from '../../application/ports/voucher-calculator.port.js';

@Injectable()
export class PromotionsServiceAdapter implements IVoucherCalculator {
  constructor(private readonly promotionsService: PromotionsService) {}

  async calculateDiscount(
    voucherCode: string,
    orderAmount: number,
  ): Promise<number> {
    const result = await this.promotionsService.validateAndCalculate({
      code: voucherCode,
      orderAmount,
    });
    return result.discountAmount;
  }
}
