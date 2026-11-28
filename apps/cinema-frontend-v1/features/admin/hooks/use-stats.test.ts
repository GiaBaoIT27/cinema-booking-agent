import { afterEach, describe, expect, it, vi } from "vitest";
import { countOf, fetchAll, todayLocal } from "./use-stats";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

afterEach(() => vi.restoreAllMocks());

describe("countOf", () => {
  it("gọi limit=1 và đọc tổng trong pagination (cả totalElements của module users)", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(json({ success: true, data: [{ id: 1 }], pagination: { page: 1, limit: 1, totalElements: 42, totalPages: 42 } }));
    expect(await countOf("/users", { status: "ACTIVE" })).toBe(42);
    const url = String(spy.mock.calls[0][0]);
    expect(url).toContain("status=ACTIVE");
    expect(url).toContain("limit=1");
  });
});

describe("fetchAll", () => {
  it("lặp qua mọi trang để cộng dồn", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json({ success: true, data: [{ n: 1 }, { n: 2 }], pagination: { totalItems: 3, totalPages: 2 } }))
      .mockResolvedValueOnce(json({ success: true, data: [{ n: 3 }], pagination: { totalItems: 3, totalPages: 2 } }));
    const all = await fetchAll<{ n: number }>("/auditoriums");
    expect(all.map((x) => x.n)).toEqual([1, 2, 3]);
  });
});

describe("todayLocal", () => {
  it("định dạng YYYY-MM-DD theo giờ máy", () => {
    expect(todayLocal(new Date(2026, 11, 4, 23, 30))).toBe("2026-12-04");
  });
});
