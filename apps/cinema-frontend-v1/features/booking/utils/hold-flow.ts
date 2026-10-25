import type { BookingHoldApi } from "../services/booking.service";
import type { HoldSeatsResponse, SeatHoldResult } from "../types/booking.type";

/**
 * Đổi thời hạn giữ ghế của server sang mốc giờ của trình duyệt.
 * Dùng `holdDurationMs` tính từ lúc gửi request nên không bị lệch nếu đồng hồ
 * máy người dùng chạy sai so với server; luôn nghiêng về phía an toàn
 * (không bao giờ hiển thị nhiều thời gian hơn thực tế).
 */
export function toClientExpiry(
  res: Pick<HoldSeatsResponse, "holdDurationMs" | "holdExpiresAt">,
  requestStartedAt: number,
): number {
  if (typeof res.holdDurationMs === "number" && res.holdDurationMs > 0) {
    return requestStartedAt + res.holdDurationMs;
  }
  const serverExpiry = Date.parse(res.holdExpiresAt);
  return isNaN(serverExpiry) ? requestStartedAt : serverExpiry;
}

/**
 * Giữ ghế và kiểm tra server giữ đủ toàn bộ ghế đã yêu cầu.
 * Nếu chỉ giữ được một phần thì trả lại số ghế đã giữ rồi báo thất bại.
 */
export async function holdSeatsFlow(
  api: BookingHoldApi,
  showtimeId: number,
  seatIds: number[],
  now: () => number = Date.now,
): Promise<SeatHoldResult> {
  const startedAt = now();

  try {
    const res = await api.holdSeats({ showtimeId, seatIds });

    const held = new Set((res.heldSeats ?? []).map((s) => s.seatId));
    const missing = seatIds.filter((id) => !held.has(id));

    if (missing.length > 0) {
      if (held.size > 0) {
        await api
          .releaseSeats({ showtimeId, seatIds: Array.from(held) })
          .catch(() => undefined);
      }
      return {
        ok: false,
        message: "Không giữ được ghế đã chọn. Vui lòng chọn ghế khác.",
      };
    }

    return { ok: true, expiresAt: toClientExpiry(res, startedAt) };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error && err.message
          ? err.message
          : "Không thể giữ ghế. Vui lòng thử lại.",
    };
  }
}

/** Giải phóng ghế; lỗi (vd ghế đã hết hạn) được bỏ qua và trả về false */
export async function releaseSeatsFlow(
  api: BookingHoldApi,
  showtimeId: number,
  seatIds: number[],
): Promise<boolean> {
  try {
    await api.releaseSeats({ showtimeId, seatIds });
    return true;
  } catch {
    return false;
  }
}

export type ToggleOutcome =
  | { kind: "held"; expiresAt: number }
  | { kind: "released" }
  | { kind: "hold-failed"; message: string }
  | { kind: "release-failed" };

interface ToggleInput {
  showtimeId: number;
  seatId: number;
  /** Ghế đang được chọn (đã giữ) hay chưa */
  isSelected: boolean;
  /** Mốc hết hạn đã lưu của ghế này (epoch ms), nếu có */
  expiresAt?: number;
}

/**
 * Một lần bấm vào ghế: chưa chọn thì giữ ghế ngay, đang chọn thì trả ghế ngay.
 * Ghế đã hết hạn phía client thì server đã tự nhả, nên bỏ chọn không cần gọi API.
 */
export async function toggleSeatFlow(
  api: BookingHoldApi,
  input: ToggleInput,
  now: () => number = Date.now,
): Promise<ToggleOutcome> {
  if (!input.isSelected) {
    const result = await holdSeatsFlow(
      api,
      input.showtimeId,
      [input.seatId],
      now,
    );
    return result.ok
      ? { kind: "held", expiresAt: result.expiresAt }
      : { kind: "hold-failed", message: result.message };
  }

  if (input.expiresAt !== undefined && input.expiresAt <= now()) {
    return { kind: "released" };
  }

  const released = await releaseSeatsFlow(api, input.showtimeId, [
    input.seatId,
  ]);
  return released ? { kind: "released" } : { kind: "release-failed" };
}

/** Mốc hết hạn sớm nhất trong các ghế đang giữ (null nếu không giữ ghế nào) */
export function earliestExpiry(
  expiries: Record<string, number>,
): number | null {
  const values = Object.values(expiries);
  return values.length > 0 ? Math.min(...values) : null;
}

export interface StaleHold {
  /** null nếu không xác định được suất chiếu (chỉ cần xóa khỏi context) */
  showtimeId: number | null;
  seatIds: number[];
}

interface StaleInput {
  /** Suất chiếu và ghế đang lưu trong context */
  contextShowtimeId: string;
  contextSeatIds: string[];
  /** Hạn giữ theo từng ghế (id ghế → epoch ms) */
  expiries: Record<string, number>;
  /** Suất chiếu của trang đang mở */
  showtimeId: string;
  now: number;
}

/**
 * Tìm các ghế đang giữ mà không còn hợp lệ cho trang hiện tại, cần trả lại:
 * - đang giữ ghế của một suất chiếu khác;
 * - có ghế đã hết hạn hoặc không rõ hạn (coi cả lượt đặt đã hết hạn).
 */
export function findStaleHold(input: StaleInput): StaleHold | null {
  if (input.contextSeatIds.length === 0) return null;

  const otherShowtime = input.contextShowtimeId !== input.showtimeId;
  const expired = input.contextSeatIds.some((id) => {
    const expiry = input.expiries[id];
    return expiry === undefined || expiry <= input.now;
  });
  if (!otherShowtime && !expired) return null;

  const contextId = Number(input.contextShowtimeId);
  return {
    showtimeId:
      input.contextShowtimeId === "" || isNaN(contextId) ? null : contextId,
    seatIds: input.contextSeatIds.map(Number).filter((id) => !isNaN(id)),
  };
}
