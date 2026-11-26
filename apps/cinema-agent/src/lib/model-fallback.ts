import type { Runnable } from "@langchain/core/runnables";

/**
 * Model dự phòng: khi model chính lỗi (hết quota 429, quá tải 503, luồng hỏng "Failed to
 * parse stream"...), lời gọi được chạy lại trên model dự phòng – khách không thấy lỗi.
 *
 * Ở gói miễn phí, hạn mức được tính RIÊNG cho từng model, nên dùng một model Gemini khác
 * (cùng thư viện, cùng cách gọi tool) vừa có thêm quota vừa tránh được sự cố chỉ xảy ra với
 * một model. Không cấu hình model dự phòng => trả về đúng model chính.
 */
export function withModelFallback<I, O>(
  primary: Runnable<I, O>,
  fallback?: Runnable<I, O>,
): Runnable<I, O> {
  return fallback ? primary.withFallbacks({ fallbacks: [fallback] }) : primary;
}
