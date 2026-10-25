/** Body kiểm tra voucher (khớp PromotionsService.validateAndCalculate ở backend). */
export interface ValidateVoucherPayload {
  code: string;
  orderAmount: number;
}

export interface VoucherValidation {
  discountAmount: number;
}
