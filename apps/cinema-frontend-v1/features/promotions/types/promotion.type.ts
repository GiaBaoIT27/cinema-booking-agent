/** Body kiểm tra voucher (khớp PromotionsService.validateAndCalculate ở backend) */
export interface ValidateVoucherPayload {
  code: string;
  orderAmount: number;
}

/** Kết quả kiểm tra voucher */
export interface VoucherValidation {
  discountAmount: number;
}
