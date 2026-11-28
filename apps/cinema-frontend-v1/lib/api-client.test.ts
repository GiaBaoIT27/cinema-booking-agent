import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiClient } from "./api-client";

const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  );

afterEach(() => vi.restoreAllMocks());

describe("apiClient — lỗi từ backend", () => {
  it("errors dạng chuỗi được dùng làm thông báo cụ thể", async () => {
    respond(422, {
      success: false,
      errorCode: "INVALID_INPUT",
      message: "Dữ liệu đầu vào không hợp lệ",
      errors: "Loại giảm giá PERCENTAGE bắt buộc phải có giá trị giảm tối đa (maxDiscountAmount)",
    });
    const err = await apiClient.post("/promotions", {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toMatch(/bắt buộc phải có giá trị giảm tối đa/);
    expect((err as ApiError).errors).toBeUndefined();
  });

  it("errors dạng mảng được giữ để gắn vào từng ô của form", async () => {
    respond(422, {
      success: false,
      errorCode: "INVALID_INPUT",
      message: "Dữ liệu đầu vào không hợp lệ",
      errors: [{ field: "sku", message: "SKU sai" }],
    });
    const err = (await apiClient.post("/fnb-items", {}).catch((e: unknown) => e)) as ApiError;
    expect(err.message).toBe("Dữ liệu đầu vào không hợp lệ");
    expect(err.errors).toEqual([{ field: "sku", message: "SKU sai" }]);
    expect(err.code).toBe(422);
  });
});
