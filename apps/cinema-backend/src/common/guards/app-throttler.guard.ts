import { timingSafeEqual } from 'node:crypto';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

export const INTERNAL_SERVICE_HEADER = 'x-internal-service-token';

/** So sánh hằng thời gian – không lộ token qua thời gian phản hồi. */
export function isValidInternalToken(
  provided: string | string[] | undefined,
  expected: string | undefined,
): boolean {
  if (!expected || typeof provided !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Rate limit theo IP client (cần `trust proxy` đúng khi đứng sau reverse proxy).
 *
 * Bỏ qua cho dịch vụ nội bộ có token hợp lệ (AI agent): agent gọi backend THAY cho mọi
 * người dùng từ cùng một IP, nếu giới hạn theo IP thì toàn bộ khách chat sẽ chung một hạn
 * mức. Agent đã tự rate limit theo từng người dùng.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    if (
      isValidInternalToken(
        req.headers?.[INTERNAL_SERVICE_HEADER],
        process.env.INTERNAL_SERVICE_TOKEN,
      )
    ) {
      return true;
    }
    return super.shouldSkip(context);
  }
}
