/** Tính giảm giá theo mã voucher – nghiệp vụ thuộc module `promotions`. */
export interface IVoucherCalculator {
  /** Trả về số tiền được giảm; ném lỗi nếu voucher không hợp lệ. */
  calculateDiscount(voucherCode: string, orderAmount: number): Promise<number>;
}

export const VOUCHER_CALCULATOR = Symbol('VOUCHER_CALCULATOR');
