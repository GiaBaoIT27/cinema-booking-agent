import { describe, expect, it, vi } from "vitest";

import type { BookingHoldApi } from "../services/booking.service";
import {
  earliestExpiry,
  findStaleHold,
  holdSeatsFlow,
  toClientExpiry,
  toggleSeatFlow,
} from "./hold-flow";

const api = (over: Partial<Record<keyof BookingHoldApi, unknown>> = {}) =>
  ({
    holdSeats: vi.fn(),
    releaseSeats: vi.fn().mockResolvedValue({}),
    ...over,
  }) as unknown as BookingHoldApi & {
    holdSeats: ReturnType<typeof vi.fn>;
    releaseSeats: ReturnType<typeof vi.fn>;
  };

describe("toClientExpiry", () => {
  it("tính theo holdDurationMs từ lúc gửi request – không phụ thuộc đồng hồ máy khách", () => {
    expect(
      toClientExpiry({ holdDurationMs: 660_000, holdExpiresAt: "2000-01-01T00:00:00Z" }, 1_000),
    ).toBe(661_000);
  });

  it("thiếu holdDurationMs thì dùng holdExpiresAt; sai định dạng thì coi như hết hạn ngay", () => {
    const iso = "2026-11-05T10:00:00.000Z";
    expect(toClientExpiry({ holdDurationMs: 0, holdExpiresAt: iso }, 5)).toBe(Date.parse(iso));
    expect(toClientExpiry({ holdDurationMs: 0, holdExpiresAt: "x" }, 5)).toBe(5);
  });
});

describe("holdSeatsFlow", () => {
  it("giữ đủ ghế => ok kèm hạn giữ", async () => {
    const a = api();
    a.holdSeats.mockResolvedValue({
      heldSeats: [{ seatId: 1 }, { seatId: 2 }],
      holdDurationMs: 1000,
      holdExpiresAt: "",
    });

    const r = await holdSeatsFlow(a, 7, [1, 2], () => 100);

    expect(r).toEqual({ ok: true, expiresAt: 1100 });
    expect(a.releaseSeats).not.toHaveBeenCalled();
  });

  it("server chỉ giữ được một phần => trả lại phần đã giữ, báo thất bại (không để ghế treo)", async () => {
    const a = api();
    a.holdSeats.mockResolvedValue({ heldSeats: [{ seatId: 1 }], holdDurationMs: 1000, holdExpiresAt: "" });

    const r = await holdSeatsFlow(a, 7, [1, 2]);

    expect(r.ok).toBe(false);
    expect(a.releaseSeats).toHaveBeenCalledWith({ showtimeId: 7, seatIds: [1] });
  });

  it("lỗi từ server => hiện đúng thông báo của server", async () => {
    const a = api();
    a.holdSeats.mockRejectedValue(new Error("Ghế đang được người khác giữ"));

    expect(await holdSeatsFlow(a, 7, [1])).toEqual({
      ok: false,
      message: "Ghế đang được người khác giữ",
    });
  });
});

describe("toggleSeatFlow", () => {
  it("bỏ chọn ghế đã hết hạn phía client => không gọi API (server đã tự nhả)", async () => {
    const a = api();
    const r = await toggleSeatFlow(
      a,
      { showtimeId: 7, seatId: 1, isSelected: true, expiresAt: 50 },
      () => 100,
    );

    expect(r).toEqual({ kind: "released" });
    expect(a.releaseSeats).not.toHaveBeenCalled();
  });

  it("bỏ chọn ghế còn hạn => gọi API trả ghế; lỗi thì báo release-failed", async () => {
    const a = api();
    a.releaseSeats.mockRejectedValue(new Error("x"));

    const r = await toggleSeatFlow(
      a,
      { showtimeId: 7, seatId: 1, isSelected: true, expiresAt: 500 },
      () => 100,
    );
    expect(r).toEqual({ kind: "release-failed" });
  });
});

describe("findStaleHold / earliestExpiry", () => {
  const base = {
    contextShowtimeId: "7",
    contextSeatIds: ["1", "2"],
    expiries: { "1": 500, "2": 900 },
    showtimeId: "7",
    now: 100,
  };

  it("cùng suất chiếu, còn hạn => không có gì cần trả", () => {
    expect(findStaleHold(base)).toBeNull();
  });

  it("đang giữ ghế của suất chiếu khác => trả toàn bộ", () => {
    expect(findStaleHold({ ...base, showtimeId: "8" })).toEqual({ showtimeId: 7, seatIds: [1, 2] });
  });

  it("một ghế hết hạn hoặc không rõ hạn => coi cả lượt giữ đã hết hạn", () => {
    expect(findStaleHold({ ...base, now: 600 })).not.toBeNull();
    expect(findStaleHold({ ...base, expiries: { "1": 500 } })).not.toBeNull();
  });

  it("earliestExpiry lấy mốc sớm nhất, null khi không giữ ghế nào", () => {
    expect(earliestExpiry(base.expiries)).toBe(500);
    expect(earliestExpiry({})).toBeNull();
  });
});
