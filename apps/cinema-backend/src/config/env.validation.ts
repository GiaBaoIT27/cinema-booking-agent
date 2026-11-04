/**
 * Kiểm tra biến môi trường lúc khởi động – sai cấu hình thì crash NGAY với thông báo rõ ràng,
 * thay vì chạy với giá trị mặc định nguy hiểm.
 *
 * Production chặn các giá trị mặc định công khai (nằm trong repo/.env.example): ai biết
 * VNPAY_HASH_SECRET mặc định có thể tự ký IPN "thanh toán thành công"; ai biết JWT secret
 * mặc định có thể tự cấp token admin.
 */

const NODE_ENVS = ['development', 'production', 'test'] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];

const MIN_SECRET_LENGTH = 32;

/** Giá trị mặc định/placeholder đã lộ trong mã nguồn – cấm dùng ở production. */
const PUBLIC_DEFAULTS = new Set([
  'change-me',
  'changeme',
  'secret',
  'default_access_secret_key_dev',
  'default_refresh_secret_key_dev',
  'DEMO_HASH_SECRET',
  'DEMO_TMN',
  'cinema_password',
  'dev-internal-token-change-me',
]);

const PORT_VARS = ['PORT', 'DB_PORT', 'REDIS_PORT', 'MAIL_PORT'] as const;

/** Luôn bắt buộc (mọi môi trường) – giữ nguyên hành vi trước đây. */
const ALWAYS_REQUIRED = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

type Env = Record<string, unknown>;

function str(env: Env, key: string): string | undefined {
  const value = env[key];
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === '' ? undefined : s;
}

function requireStrongSecret(env: Env, key: string, errors: string[]): void {
  const value = str(env, key);
  if (!value) {
    errors.push(`${key} là bắt buộc ở production`);
  } else if (PUBLIC_DEFAULTS.has(value)) {
    errors.push(`${key} đang dùng giá trị mặc định công khai – phải thay bằng secret riêng`);
  } else if (value.length < MIN_SECRET_LENGTH) {
    errors.push(`${key} phải dài tối thiểu ${MIN_SECRET_LENGTH} ký tự (hiện ${value.length})`);
  }
}

function requireNonDefault(env: Env, key: string, errors: string[]): void {
  const value = str(env, key);
  if (!value) errors.push(`${key} là bắt buộc ở production`);
  else if (PUBLIC_DEFAULTS.has(value)) {
    errors.push(`${key} đang dùng giá trị mặc định công khai`);
  }
}

/** Danh sách lỗi cấu hình (rỗng = hợp lệ). Tách riêng để kiểm thử. */
export function collectEnvErrors(env: Env): string[] {
  const errors: string[] = [];

  const nodeEnv = str(env, 'NODE_ENV') ?? 'development';
  if (!(NODE_ENVS as readonly string[]).includes(nodeEnv)) {
    errors.push(`NODE_ENV phải là một trong: ${NODE_ENVS.join(', ')} (hiện: "${nodeEnv}")`);
  }

  for (const key of PORT_VARS) {
    const value = str(env, key);
    if (value === undefined) continue;
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      errors.push(`${key} phải là số nguyên 1-65535 (hiện: "${value}")`);
    }
  }

  for (const key of ALWAYS_REQUIRED) {
    if (!str(env, key)) errors.push(`${key} là bắt buộc`);
  }

  if (nodeEnv === 'production') {
    requireStrongSecret(env, 'JWT_ACCESS_SECRET', errors);
    requireStrongSecret(env, 'JWT_REFRESH_SECRET', errors);
    const access = str(env, 'JWT_ACCESS_SECRET');
    if (access && access === str(env, 'JWT_REFRESH_SECRET')) {
      errors.push('JWT_ACCESS_SECRET và JWT_REFRESH_SECRET phải khác nhau');
    }

    requireStrongSecret(env, 'VNPAY_HASH_SECRET', errors);
    requireNonDefault(env, 'VNPAY_TMN_CODE', errors);
    for (const key of ['VNPAY_RETURN_URL', 'VNPAY_IPN_URL'] as const) {
      const url = str(env, key);
      if (!url) errors.push(`${key} là bắt buộc ở production`);
      else if (!url.startsWith('https://')) errors.push(`${key} phải dùng https:// ở production`);
    }

    requireNonDefault(env, 'DB_PASSWORD', errors);

    // Token dịch vụ nội bộ (agent -> backend, bỏ qua rate limit): không bắt buộc, nhưng nếu
    // đặt thì phải mạnh – lộ token = vượt rate limit.
    if (str(env, 'INTERNAL_SERVICE_TOKEN')) {
      requireStrongSecret(env, 'INTERNAL_SERVICE_TOKEN', errors);
    }

    const cors = str(env, 'CORS_ORIGINS');
    if (!cors) {
      errors.push('CORS_ORIGINS là bắt buộc ở production (danh sách origin, phân cách bằng dấu phẩy)');
    } else if (cors.split(',').some((o) => o.trim() === '*')) {
      errors.push('CORS_ORIGINS không được chứa "*" ở production');
    }
  }

  return errors;
}

/** Dùng cho ConfigModule.forRoot({ validate }). Ném lỗi liệt kê MỌI vấn đề cùng lúc. */
export function validateEnv(config: Env): Env {
  const errors = collectEnvErrors(config);
  if (errors.length > 0) {
    throw new Error(
      `[Env Config Error] Cấu hình môi trường không hợp lệ:\n${errors
        .map((e) => `  - ${e}`)
        .join('\n')}`,
    );
  }
  return { ...config, NODE_ENV: str(config, 'NODE_ENV') ?? 'development' };
}
