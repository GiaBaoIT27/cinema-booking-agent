import { apiClient } from "@/lib/api-client";
import type { ValidateVoucherPayload, VoucherValidation } from "../types/promotion.types";

/** ⚠ Giữ giống web: chỉ sửa hằng số này nếu route thật của backend khác. */
export const VALIDATE_VOUCHER_PATH = "/promotions/validate";

export const promotionService = {
  /** Backend kiểm tra mã và trả số tiền được giảm; ném lỗi nếu mã không hợp lệ. */
  validateVoucher(payload: ValidateVoucherPayload): Promise<VoucherValidation> {
    return apiClient.post<VoucherValidation>(VALIDATE_VOUCHER_PATH, payload);
  },
};
