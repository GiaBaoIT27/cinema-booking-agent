import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Hash mật khẩu bằng bcrypt với cost factor 12.
 * Dùng trong auth.service khi register hoặc đổi mật khẩu.
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

/**
 * So sánh mật khẩu plain text với hash đã lưu trong DB.
 * Trả về true nếu khớp, false nếu sai.
 */
export async function comparePassword(
  plainText: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}
