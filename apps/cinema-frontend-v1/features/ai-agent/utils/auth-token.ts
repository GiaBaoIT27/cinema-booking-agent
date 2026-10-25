/**
 * Lấy JWT hiện tại của người dùng để agent thay mặt họ giữ ghế / tạo đơn.
 * ⚠ Hãy sửa hàm này cho khớp nơi dự án đang lưu access token
 * (ví dụ dùng cùng hàm mà `@/lib/api-client` đang dùng để gắn Authorization).
 */
const CANDIDATE_KEYS = ["accessToken", "access_token", "token"];

export function getAgentAuthToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    for (const key of CANDIDATE_KEYS) {
      const v = window.localStorage.getItem(key);
      if (v) return v.replace(/^"|"$/g, "");
    }
  } catch {
    // Trình duyệt chặn storage: coi như chưa đăng nhập
  }
  return undefined;
}
