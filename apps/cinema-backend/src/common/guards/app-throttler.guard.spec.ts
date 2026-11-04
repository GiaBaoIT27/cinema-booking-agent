import { describe, expect, it } from 'vitest';

import { isValidInternalToken } from './app-throttler.guard.js';

describe('isValidInternalToken', () => {
  it('chỉ chấp nhận đúng token đã cấu hình', () => {
    expect(isValidInternalToken('s3cret-token', 's3cret-token')).toBe(true);
    expect(isValidInternalToken('s3cret-tokeX', 's3cret-token')).toBe(false);
    expect(isValidInternalToken('short', 's3cret-token')).toBe(false);
  });

  it('chưa cấu hình token trên server => không ai được bỏ qua rate limit', () => {
    expect(isValidInternalToken('', undefined)).toBe(false);
    expect(isValidInternalToken('anything', '')).toBe(false);
  });

  it('header lặp (mảng) hoặc thiếu header => từ chối', () => {
    expect(isValidInternalToken(['a', 'b'], 'a')).toBe(false);
    expect(isValidInternalToken(undefined, 'a')).toBe(false);
  });
});
