import { describe, expect, it } from "vitest";
import { emptyFnbForm, fnbItemToForm, validateFnbForm } from "./fnb-form";
import { toPageResult } from "./pagination";
import {
  emptyShowtimeForm,
  estimateEnd,
  localToIso,
  nextShowtimeStatuses,
  validateShowtimeForm,
} from "./showtime-form";
import {
  assignableRoles,
  emptyStaffForm,
  requiresCineplex,
  validateBlockReason,
  validateStaffForm,
} from "./user-admin";

describe("toPageResult", () => {
  it("đọc cả totalItems lẫn totalElements (module users)", () => {
    // apiClient gắn pagination vào mảng dưới dạng thuộc tính không enumerable
    const arr = [{ id: 1 }];
    Object.defineProperty(arr, "pagination", { value: { totalElements: 25, totalPages: 3 }, enumerable: false });
    expect(toPageResult(arr, 10)).toEqual({ items: [{ id: 1 }], totalItems: 25, totalPages: 3 });
    expect(toPageResult({ data: [1, 2], pagination: { totalItems: 2 } }, 10)).toMatchObject({ totalItems: 2, totalPages: 1 });
    expect(toPageResult(null, 10)).toEqual({ items: [], totalItems: 0, totalPages: 1 });
  });
});

describe("fnb form", () => {
  const ok = { ...emptyFnbForm, sku: "FNB-POP-L", name: "Bắp lớn", basePrice: "65000" };

  it("tạo payload đúng kiểu, bỏ trường rỗng", () => {
    const r = validateFnbForm(ok);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.basePrice).toBe(65000);
      expect(r.payload.imageUrl).toBeUndefined();
    }
  });

  it("từ chối SKU chữ thường, giá âm/thập phân", () => {
    const r = validateFnbForm({ ...ok, sku: "fnb pop", basePrice: "-5" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.sku).toBeDefined();
      expect(r.errors.basePrice).toBeDefined();
    }
  });

  it("điền form từ món có giá dạng chuỗi decimal", () => {
    const form = fnbItemToForm({
      id: "3", sku: "FNB-DRK-COCA", name: "Coca", type: "SINGLE", category: "BEVERAGE",
      unit: "LY", basePrice: "35000.00", imageUrl: null, description: null, isActive: false,
    });
    expect(form.basePrice).toBe("35000");
    expect(form.isActive).toBe(false);
    expect(validateFnbForm(form).ok).toBe(true);
  });
});

describe("showtime form", () => {
  const now = new Date("2026-11-28T10:00:00Z");
  const ok = { ...emptyShowtimeForm, cineplexId: "1", auditoriumId: "2", movieId: "5", startLocal: "2030-01-01T19:30" };

  it("đổi giờ địa phương sang ISO UTC", () => {
    expect(localToIso("2030-01-01T19:30")).toBe(new Date("2030-01-01T19:30").toISOString());
    expect(localToIso("bad")).toBeNull();
  });

  it("tạo payload hợp lệ, bỏ phụ đề rỗng", () => {
    const r = validateShowtimeForm(ok, now);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload).toMatchObject({ auditoriumId: 2, movieId: 5, cleaningMinutes: 15, subtitleLanguage: undefined });
  });

  it("từ chối giờ trong quá khứ và giờ dọn phòng quá 60 phút", () => {
    const r = validateShowtimeForm({ ...ok, startLocal: "2020-01-01T10:00", cleaningMinutes: "90" }, now);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.startLocal).toBeDefined();
      expect(r.errors.cleaningMinutes).toBeDefined();
    }
  });

  it("giờ phòng bận = thời lượng + dọn phòng, giống backend", () => {
    const end = estimateEnd("2030-01-01T19:30", 120, 15);
    expect(end?.getTime()).toBe(new Date("2030-01-01T19:30").getTime() + 135 * 60_000);
  });

  it("khớp ma trận chuyển trạng thái suất chiếu", () => {
    expect(nextShowtimeStatuses("SCHEDULED")).toEqual(["OPEN", "CANCELLED"]);
    expect(nextShowtimeStatuses("OPEN")).toEqual(["CLOSED", "CANCELLED"]);
    expect(nextShowtimeStatuses("CANCELLED")).toEqual([]);
  });
});

describe("user admin", () => {
  const roles = [
    { id: "1", code: "SUPER_ADMIN", name: "Admin" },
    { id: "2", code: "CINEMA_MANAGER", name: "Quản lý" },
    { id: "3", code: "CINEMA_STAFF", name: "Nhân viên" },
  ];

  it("ẩn SUPER_ADMIN với người không phải SUPER_ADMIN", () => {
    expect(assignableRoles(roles, ["CINEMA_MANAGER"]).map((r) => r.code)).toEqual(["CINEMA_MANAGER", "CINEMA_STAFF"]);
    expect(assignableRoles(roles, ["SUPER_ADMIN"])).toHaveLength(3);
  });

  it("vai trò rạp cần cụm rạp", () => {
    expect(requiresCineplex("CINEMA_STAFF")).toBe(true);
    expect(requiresCineplex("SUPER_ADMIN")).toBe(false);
  });

  it("lý do khóa 10–500 ký tự", () => {
    expect(validateBlockReason("spam")).not.toBeNull();
    expect(validateBlockReason("Gian lận thanh toán nhiều lần")).toBeNull();
  });

  it("kiểm tra form nhân viên giống CreateInternalUserDto", () => {
    const bad = validateStaffForm({ ...emptyStaffForm, phoneNumber: "0123", password: "abcdefgh", roleId: "3" }, roles);
    expect(Object.keys(bad)).toEqual(expect.arrayContaining(["fullName", "email", "phoneNumber", "password", "cineplexId"]));
    const good = validateStaffForm(
      { fullName: "Lê Văn A", email: "a@cinema.com", phoneNumber: "0912345678", password: "Abcdef12", roleId: "3", cineplexId: "1" },
      roles,
    );
    expect(good).toEqual({});
  });
});
