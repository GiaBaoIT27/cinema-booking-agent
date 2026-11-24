import { describe, it, expect, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';

import {
  PaymentReturnService,
  buildClientRedirect,
  isAllowedClientReturnUrl,
} from './payment-return.service.js';
import type { RedisService } from '#src/core/redis/redis.service.js';

const allow = {
  origins: ['http://localhost:3001', 'http://192.168.1.6:3000'],
  appPrefixes: ['cinemamobile://', 'exp://'],
};

describe('isAllowedClientReturnUrl', () => {
  it('cho phép web, chính backend và deep link của app', () => {
    expect(isAllowedClientReturnUrl('http://localhost:3001/payment-result', allow)).toBe(true);
    expect(isAllowedClientReturnUrl('http://192.168.1.6:3000/api/v1/payments/vnpay/done', allow)).toBe(true);
    expect(isAllowedClientReturnUrl('cinemamobile://booking/result', allow)).toBe(true);
    expect(isAllowedClientReturnUrl('exp://192.168.1.6:8081/--/booking/result', allow)).toBe(true);
  });

  it('từ chối địa chỉ lạ (chống open redirect)', () => {
    expect(isAllowedClientReturnUrl('https://evil.example/x', allow)).toBe(false);
    expect(isAllowedClientReturnUrl('http://localhost:3001.evil.example/x', allow)).toBe(false);
    expect(isAllowedClientReturnUrl('javascript:alert(1)', allow)).toBe(false);
    expect(isAllowedClientReturnUrl('', allow)).toBe(false);
  });
});

describe('buildClientRedirect', () => {
  it('ghép kết quả vào query, giữ query sẵn có', () => {
    const r = { status: 'success' as const, txnRef: 'ORD-1_1', code: '00' };
    expect(buildClientRedirect('cinemamobile://booking/result', r)).toBe(
      'cinemamobile://booking/result?status=success&txnRef=ORD-1_1&code=00',
    );
    expect(buildClientRedirect('http://x/done?a=1', r)).toBe('http://x/done?a=1&status=success&txnRef=ORD-1_1&code=00');
  });
});

describe('PaymentReturnService.redirectFor', () => {
  const config = {
    get: (key: string) =>
      ({
        'notification.webBaseUrl': 'http://localhost:3001',
        'payment.vnpay.returnUrl': 'http://192.168.1.6:3000/api/v1/payments/vnpay/return',
      })[key],
  } as unknown as ConfigService;

  it('có địa chỉ đã lưu => chuyển tới đó; không có => trang payment-result của web', async () => {
    const store = new Map<string, string>();
    const redis = {
      set: vi.fn(async (k: string, v: string) => void store.set(k, v)),
      get: vi.fn(async (k: string) => store.get(k) ?? null),
    } as unknown as RedisService;
    const service = new PaymentReturnService(redis, config);

    await service.remember('ORD-1_1', 'http://192.168.1.6:3000/api/v1/payments/vnpay/done');
    expect(await service.redirectFor({ status: 'success', txnRef: 'ORD-1_1', code: '00' })).toBe(
      'http://192.168.1.6:3000/api/v1/payments/vnpay/done?status=success&txnRef=ORD-1_1&code=00',
    );
    expect(await service.redirectFor({ status: 'failed', txnRef: 'ORD-2_1', code: '24' })).toBe(
      'http://localhost:3001/payment-result?status=failed&txnRef=ORD-2_1&code=24',
    );
  });
});
