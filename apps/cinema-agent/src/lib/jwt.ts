import { createHmac, timingSafeEqual } from "node:crypto";

export interface AuthInfo {
  userId: string;
}

function b64urlToBuffer(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Lấy token từ header "Authorization: Bearer <jwt>" */
export function extractBearer(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m?.[1];
}

/**
 * Đọc thông tin người dùng từ JWT.
 * - Có `secret`: kiểm tra chữ ký HS256.
 * - Không có `secret`: chỉ giải mã (backend vẫn xác thực thật ở mọi lệnh gọi tool).
 * Luôn kiểm tra hạn `exp`. Trả null nếu token không dùng được.
 */
export function readAuth(token: string | undefined, secret?: string, nowMs = Date.now()): AuthInfo | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    if (secret) {
      const header = JSON.parse(b64urlToBuffer(parts[0]).toString("utf8")) as { alg?: string };
      if (header.alg !== "HS256") return null;
      const expected = createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest();
      const actual = b64urlToBuffer(parts[2]);
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    }
    const payload = JSON.parse(b64urlToBuffer(parts[1]).toString("utf8")) as Record<string, unknown>;
    if (typeof payload.exp === "number" && payload.exp * 1000 <= nowMs) return null;
    const id = payload.userId ?? payload.sub ?? payload.id;
    if (id === undefined || id === null || String(id) === "") return null;
    return { userId: String(id) };
  } catch {
    return null;
  }
}
