import { describe, expect, it } from 'vitest';

import { collectEnvErrors, validateEnv } from './env.validation.js';

const CLOUDINARY = {
  CLOUDINARY_CLOUD_NAME: 'demo',
  CLOUDINARY_API_KEY: 'key',
  CLOUDINARY_API_SECRET: 'secret-value',
};

const STRONG = 'x'.repeat(40);
const PROD_OK = {
  ...CLOUDINARY,
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: `a${STRONG}`,
  JWT_REFRESH_SECRET: `r${STRONG}`,
  VNPAY_TMN_CODE: 'REALTMN1',
  VNPAY_HASH_SECRET: `h${STRONG}`,
  VNPAY_RETURN_URL: 'https://api.example.com/api/v1/payments/vnpay/return',
  VNPAY_IPN_URL: 'https://api.example.com/api/v1/payments/vnpay/ipn',
  DB_PASSWORD: 'a-real-db-password',
  CORS_ORIGINS: 'https://cinema.example.com',
};

describe('validateEnv', () => {
  it('development: chỉ cần Cloudinary, mặc định NODE_ENV=development', () => {
    expect(collectEnvErrors(CLOUDINARY)).toEqual([]);
    expect(validateEnv(CLOUDINARY).NODE_ENV).toBe('development');
  });

  it('production đủ cấu hình hợp lệ => không lỗi', () => {
    expect(collectEnvErrors(PROD_OK)).toEqual([]);
  });

  it('production: chặn VNPAY_HASH_SECRET mặc định công khai (ai cũng ký được IPN giả)', () => {
    const errors = collectEnvErrors({ ...PROD_OK, VNPAY_HASH_SECRET: 'DEMO_HASH_SECRET' });
    expect(errors.some((e) => e.includes('VNPAY_HASH_SECRET') && e.includes('mặc định công khai'))).toBe(true);
  });

  it('production: chặn JWT secret yếu, placeholder, hoặc access = refresh', () => {
    expect(collectEnvErrors({ ...PROD_OK, JWT_ACCESS_SECRET: 'change-me' })).toEqual([
      expect.stringContaining('JWT_ACCESS_SECRET đang dùng giá trị mặc định công khai'),
    ]);
    expect(collectEnvErrors({ ...PROD_OK, JWT_REFRESH_SECRET: 'short' })[0]).toContain('tối thiểu 32');
    expect(
      collectEnvErrors({ ...PROD_OK, JWT_REFRESH_SECRET: PROD_OK.JWT_ACCESS_SECRET }),
    ).toEqual([expect.stringContaining('phải khác nhau')]);
  });

  it('production: CORS bắt buộc và không được là *', () => {
    const { CORS_ORIGINS: _omit, ...noCors } = PROD_OK;
    expect(collectEnvErrors(noCors)[0]).toContain('CORS_ORIGINS là bắt buộc');
    expect(collectEnvErrors({ ...PROD_OK, CORS_ORIGINS: 'https://a.com, *' })[0]).toContain('"*"');
  });

  it('production: URL VNPay phải https, mật khẩu DB không được là mặc định', () => {
    const errors = collectEnvErrors({
      ...PROD_OK,
      VNPAY_IPN_URL: 'http://api.example.com/ipn',
      DB_PASSWORD: 'cinema_password',
    });
    expect(errors).toHaveLength(2);
  });

  it('production: token nội bộ là tùy chọn, nhưng nếu đặt thì phải mạnh', () => {
    expect(collectEnvErrors({ ...PROD_OK, INTERNAL_SERVICE_TOKEN: `i${STRONG}` })).toEqual([]);
    expect(
      collectEnvErrors({ ...PROD_OK, INTERNAL_SERVICE_TOKEN: 'dev-internal-token-change-me' })[0],
    ).toContain('INTERNAL_SERVICE_TOKEN');
  });

  it('port sai định dạng, NODE_ENV lạ => báo lỗi; liệt kê mọi lỗi cùng lúc', () => {
    expect(() =>
      validateEnv({ ...CLOUDINARY, NODE_ENV: 'prod', PORT: 'abc', DB_PORT: '99999' }),
    ).toThrow(/NODE_ENV[\s\S]*PORT[\s\S]*DB_PORT/);
  });
});
