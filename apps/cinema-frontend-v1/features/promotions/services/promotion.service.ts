import { apiClient } from "@/lib/api-client";
import type {
  ValidateVoucherPayload,
  VoucherValidation,
} from "../types/promotion.type";

/**
 * ⚠ Đường dẫn endpoint cần khớp controller của module promotions ở backend.
 * Chỉ sửa hằng số này nếu route thật khác.
 */
export const VALIDATE_VOUCHER_PATH = "/promotions/validate";

export const promotionService = {
  /** Backend kiểm tra mã và trả số tiền được giảm; ném lỗi nếu mã không hợp lệ */
  async validateVoucher(
    payload: ValidateVoucherPayload,
  ): Promise<VoucherValidation> {
    return apiClient.post<VoucherValidation>(VALIDATE_VOUCHER_PATH, payload);
  },
};

export type PromotionApi = Pick<typeof promotionService, "validateVoucher">;
