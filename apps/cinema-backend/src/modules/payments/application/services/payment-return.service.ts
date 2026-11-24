import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '#src/core/redis/redis.service.js';

/**
 * Sau khi VNPay đưa trình duyệt về backend (/payments/vnpay/return) và backend đã chốt
 * thanh toán, trình duyệt được chuyển tiếp tới địa chỉ mà client chọn lúc khởi tạo:
 *  - web: trang payment-result của web (mặc định, không cần gửi gì);
 *  - mobile không cấu hình deep link: trang /payments/vnpay/done của chính backend
 *    (điện thoại mở được, không trỏ về localhost của máy tính);
 *  - mobile có deep link (cinemamobile://, exp://): trình duyệt trong app tự đóng.
 *
 * VNPay LUÔN quay về backend trước – nếu đưa deep link thẳng cho VNPay thì bước chốt
 * thanh toán bị bỏ qua (môi trường local không nhận được IPN).
 */

export const CLIENT_RETURN_TTL_SECONDS = 24 * 60 * 60;
const KEY = (txnRef: string) => `payment:client-return:${txnRef}`;
const DEFAULT_APP_PREFIXES = ['cinemamobile://', 'exp://'];

export interface ReturnAllowlist {
  /** Các origin http(s) được phép, VD: origin của web và của chính backend */
  origins: string[];
  /** Tiền tố deep link được phép */
  appPrefixes: string[];
}

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Địa chỉ trả về của client có nằm trong danh sách cho phép không (chống open redirect). */
export function isAllowedClientReturnUrl(
  url: string,
  allow: ReturnAllowlist,
): boolean {
  if (!url || url.length > 500) return false;
  if (allow.appPrefixes.some((p) => url.startsWith(p))) return true;
  const origin = originOf(url);
  if (!origin || !/^https?:\/\//.test(url)) return false;
  return allow.origins.includes(origin);
}

export interface ReturnResult {
  status: 'success' | 'failed';
  txnRef: string;
  code: string;
}

/** Ghép kết quả thanh toán vào địa chỉ trả về của client. */
export function buildClientRedirect(
  target: string,
  result: ReturnResult,
): string {
  const params = new URLSearchParams({
    status: result.status,
    txnRef: result.txnRef,
    code: result.code,
  }).toString();
  return `${target}${target.includes('?') ? '&' : '?'}${params}`;
}

@Injectable()
export class PaymentReturnService {
  private readonly allow: ReturnAllowlist;
  private readonly webBaseUrl: string;

  constructor(
    private readonly redis: RedisService,
    @Optional() config?: ConfigService,
  ) {
    this.webBaseUrl =
      config?.get<string>('notification.webBaseUrl') ??
      process.env.WEB_BASE_URL ??
      'http://localhost:3001';
    const backendReturn =
      config?.get<string>('payment.vnpay.returnUrl') ??
      process.env.VNPAY_RETURN_URL;
    const prefixes = (process.env.PAYMENT_APP_RETURN_PREFIXES ?? '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    this.allow = {
      origins: [originOf(this.webBaseUrl), originOf(backendReturn)].filter(
        (o): o is string => Boolean(o),
      ),
      appPrefixes: prefixes.length ? prefixes : DEFAULT_APP_PREFIXES,
    };
  }

  isAllowed(url: string): boolean {
    return isAllowedClientReturnUrl(url, this.allow);
  }

  async remember(txnRef: string, url: string): Promise<void> {
    await this.redis.set(KEY(txnRef), url, CLIENT_RETURN_TTL_SECONDS);
  }

  /** Địa chỉ chuyển tiếp sau khi backend đã xử lý kết quả thanh toán. */
  async redirectFor(result: ReturnResult): Promise<string> {
    const stored = result.txnRef
      ? await this.redis.get(KEY(result.txnRef))
      : null;
    if (stored && this.isAllowed(stored))
      return buildClientRedirect(stored, result);
    return buildClientRedirect(`${this.webBaseUrl}/payment-result`, result);
  }
}
