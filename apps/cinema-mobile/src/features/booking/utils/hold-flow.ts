import type { BookingHoldApi } from "../services/booking.service";
import type { HoldSeatsResponse, SeatHoldResult } from "../types/booking.types";

/**
 * Đổi thời hạn giữ ghế của server sang mốc giờ của điện thoại: dùng holdDurationMs
 * tính từ lúc gửi request nên không lệch khi đồng hồ máy sai; luôn nghiêng về phía an toàn.
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

/** Giữ ghế và kiểm tra server giữ đủ; giữ thiếu thì trả lại số đã giữ rồi báo lỗi. */
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

/** Giải phóng ghế; lỗi (vd đã hết hạn) bị bỏ qua và trả về false. */
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
  isSelected: boolean;
  /** Mốc hết hạn đã lưu của ghế này (epoch ms), nếu có */
  expiresAt?: number;
}

/** Một lần chạm vào ghế: chưa chọn thì giữ ngay, đang chọn thì trả ngay. */
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
  // Ghế đã hết hạn phía client thì server đã tự nhả, không cần gọi API.
  if (input.expiresAt !== undefined && input.expiresAt <= now()) {
    return { kind: "released" };
  }
  const released = await releaseSeatsFlow(api, input.showtimeId, [
    input.seatId,
  ]);
  return released ? { kind: "released" } : { kind: "release-failed" };
}
