import { describe, expect, it } from "vitest";
import { groupSections, visibleSections } from "./admin-access";
import {
  emptyDistributorForm,
  emptyPromotionForm,
  emptySeatTypeForm,
  isoToLocal,
  promotionPhase,
  promotionToForm,
  seatPrice,
  validateDistributorForm,
  validatePromotionForm,
  validateSeatTypeForm,
  type AdminPromotion,
} from "./master-data-form";

describe("seat type form", () => {
  it("chấp nhận loại ghế hợp lệ và chuẩn hóa mã màu", () => {
    const r = validateSeatTypeForm({ ...emptySeatTypeForm, code: "ROYAL_BED", name: "Giường nằm", priceMultiplier: "1.5", surchargeAmount: "20000", colorCode: "#aa00ff", seatCount: "2" });
    expect(r.ok && r.payload).toMatchObject({ priceMultiplier: 1.5, surchargeAmount: 20000, colorCode: "#AA00FF", seatCount: 2 });
  });

  it("từ chối hệ số < 1, 5 chỗ, màu sai", () => {
    const r = validateSeatTypeForm({ ...emptySeatTypeForm, code: "x", name: "A", priceMultiplier: "0.5", seatCount: "5", colorCode: "red" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["code", "colorCode", "name", "priceMultiplier", "seatCount"]);
  });

  it("giá ghế = giá gốc × hệ số + phụ thu", () => {
    expect(seatPrice(90000, 1.2, 10000)).toBe(118000);
  });
});

describe("distributor form", () => {
  const ok = {
    ...emptyDistributorForm,
    name: "CGV Việt Nam",
    taxCode: "0303675393",
    address: "Lầu 2, Rivera Park",
    contactPerson: "Nguyễn Văn A",
    contactEmail: "a@cgv.vn",
    contactPhone: "028 3636 7777",
  };
  it("bỏ thông tin ngân hàng trống", () => {
    const r = validateDistributorForm(ok);
    expect(r.ok && r.payload.bankName).toBeUndefined();
  });
  it("kiểm tra MST và email", () => {
    const r = validateDistributorForm({ ...ok, taxCode: "ABC", contactEmail: "sai" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["contactEmail", "taxCode"]);
  });
});

describe("promotion form", () => {
  const base = { ...emptyPromotionForm, code: "tet2027", discountValue: "20", startLocal: "2027-01-01T00:00", endLocal: "2027-02-01T00:00" };

  it("giảm theo % bắt buộc có mức giảm tối đa và ≤ 100", () => {
    const r = validatePromotionForm({ ...base, discountType: "PERCENTAGE", discountValue: "120" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["discountValue", "maxDiscountAmount"]);
  });

  it("mã viết hoa, số tiền cố định không gửi maxDiscountAmount, bỏ giới hạn lượt khi trống", () => {
    const r = validatePromotionForm({ ...base, discountValue: "30000", maxDiscountAmount: "999" });
    expect(r.ok && r.payload).toMatchObject({ code: "TET2027", discountValue: 30000, maxDiscountAmount: undefined, usageLimit: undefined });
  });

  it("kết thúc phải sau bắt đầu", () => {
    const r = validatePromotionForm({ ...base, endLocal: "2026-12-01T00:00" });
    expect(!r.ok && r.errors.endLocal).toBeTruthy();
  });

  it("đổi qua lại ISO ↔ datetime-local không lệch giờ", () => {
    const iso = new Date("2027-01-01T08:30").toISOString();
    expect(isoToLocal(iso)).toBe("2027-01-01T08:30");
  });

  it("xác định hiệu lực thực tế của mã", () => {
    const now = new Date("2026-11-28T00:00:00Z");
    const p: AdminPromotion = {
      id: "1", code: "ABCDEF", discountType: "FIXED_AMOUNT", discountValue: 1000, maxDiscountAmount: null,
      minOrderAmount: 0, usageLimit: 10, usedCount: 3, startDate: "2026-11-01T00:00:00Z", endDate: "2026-12-31T00:00:00Z", isActive: true,
    };
    expect(promotionPhase(p, now)).toBe("RUNNING");
    expect(promotionPhase({ ...p, usedCount: 10 }, now)).toBe("EXHAUSTED");
    expect(promotionPhase({ ...p, isActive: false }, now)).toBe("DISABLED");
    expect(promotionPhase({ ...p, endDate: "2026-11-01T00:00:00Z" }, now)).toBe("EXPIRED");
    expect(promotionPhase({ ...p, startDate: "2026-12-01T00:00:00Z" }, now)).toBe("UPCOMING");
    expect(promotionToForm(p).maxDiscountAmount).toBe("");
  });
});

describe("admin nav groups", () => {
  it("gom mục theo nhóm và bỏ nhóm trống", () => {
    const user = { roles: ["X"], permissions: ["movie:view", "promo:view", "order:manage"] };
    expect(groupSections(visibleSections(user)).map(([g, s]) => [g, s.map((x) => x.key)])).toEqual([
      ["Nội dung", ["movies"]],
      ["Kinh doanh", ["promotions", "orders"]],
    ]);
  });
});
