import { localToIso } from "./showtime-form";

type Errors<T> = Partial<Record<keyof T, string>>;
type Result<P, T> = { ok: true; payload: P } | { ok: false; errors: Errors<T> };

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const done = <P, T>(errors: Errors<T>, payload: () => P): Result<P, T> =>
  Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, payload: payload() };

/* ───────── Loại ghế (CreateSeatTypeDto) ───────── */

export interface AdminSeatType {
  id: string;
  code: string;
  name: string;
  priceMultiplier: number;
  surchargeAmount: number;
  colorCode: string;
  seatCount: number;
  description: string | null;
  displayOrder: number;
}

export interface SeatTypeFormValues {
  code: string;
  name: string;
  priceMultiplier: string;
  surchargeAmount: string;
  colorCode: string;
  seatCount: string;
  description: string;
  displayOrder: string;
}

export const emptySeatTypeForm: SeatTypeFormValues = {
  code: "",
  name: "",
  priceMultiplier: "1",
  surchargeAmount: "0",
  colorCode: "#C0C0C0",
  seatCount: "1",
  description: "",
  displayOrder: "1",
};

export function seatTypeToForm(t: AdminSeatType): SeatTypeFormValues {
  return {
    code: t.code,
    name: t.name,
    priceMultiplier: str(t.priceMultiplier),
    surchargeAmount: str(Math.round(Number(t.surchargeAmount))),
    colorCode: t.colorCode,
    seatCount: str(t.seatCount),
    description: str(t.description),
    displayOrder: str(t.displayOrder),
  };
}

export interface SeatTypePayload {
  code: string;
  name: string;
  priceMultiplier: number;
  surchargeAmount: number;
  colorCode: string;
  seatCount: number;
  description?: string;
  displayOrder: number;
}

export function validateSeatTypeForm(v: SeatTypeFormValues): Result<SeatTypePayload, SeatTypeFormValues> {
  const e: Errors<SeatTypeFormValues> = {};
  const code = v.code.trim();
  if (code.length < 2 || code.length > 20) e.code = "Mã từ 2 đến 20 ký tự";
  else if (!/^[A-Z0-9_]+$/.test(code)) e.code = "Dạng UPPER_SNAKE_CASE, ví dụ ROYAL_BED";
  if (v.name.trim().length < 2 || v.name.trim().length > 50) e.name = "Tên từ 2 đến 50 ký tự";
  const m = Number(v.priceMultiplier);
  if (!/^\d+(\.\d{1,2})?$/.test(v.priceMultiplier) || m < 1 || m > 10) e.priceMultiplier = "Hệ số từ 1.00 đến 10.00";
  if (!/^\d+$/.test(v.surchargeAmount)) e.surchargeAmount = "Phụ thu là số nguyên ≥ 0 (VND)";
  if (!/^#[A-Fa-f0-9]{6}$/.test(v.colorCode)) e.colorCode = "Mã màu dạng #RRGGBB";
  if (!/^[1-4]$/.test(v.seatCount)) e.seatCount = "Từ 1 đến 4 chỗ";
  if (v.description.trim().length > 255) e.description = "Tối đa 255 ký tự";
  if (!/^\d+$/.test(v.displayOrder)) e.displayOrder = "Số nguyên ≥ 0";
  return done(e, () => ({
    code,
    name: v.name.trim(),
    priceMultiplier: m,
    surchargeAmount: Number(v.surchargeAmount),
    colorCode: v.colorCode.toUpperCase(),
    seatCount: Number(v.seatCount),
    description: v.description.trim() || undefined,
    displayOrder: Number(v.displayOrder),
  }));
}

/** Giá ghế = giá gốc × hệ số + phụ thu (công thức ở price-calculation.service). */
export const seatPrice = (basePrice: number, multiplier: number, surcharge: number) =>
  Math.round(basePrice * multiplier + surcharge);

/* ───────── Nhà phát hành (CreateDistributorDto) ───────── */

export type DistributorStatusType = "ACTIVE" | "SUSPENDED";
export const DISTRIBUTOR_STATUS_LABEL: Record<DistributorStatusType, string> = {
  ACTIVE: "Đang hợp tác",
  SUSPENDED: "Tạm ngưng",
};

export interface AdminDistributor {
  id: number | string;
  name: string;
  taxCode: string;
  address: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  bankAccountNumber: string | null;
  bankName: string | null;
  status: string;
}

export interface DistributorFormValues {
  name: string;
  taxCode: string;
  address: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  bankAccountNumber: string;
  bankName: string;
}

export const emptyDistributorForm: DistributorFormValues = {
  name: "",
  taxCode: "",
  address: "",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  bankAccountNumber: "",
  bankName: "",
};

export function distributorToForm(d: AdminDistributor): DistributorFormValues {
  return {
    name: d.name,
    taxCode: d.taxCode,
    address: d.address,
    contactPerson: d.contactPerson,
    contactEmail: d.contactEmail,
    contactPhone: d.contactPhone,
    bankAccountNumber: str(d.bankAccountNumber),
    bankName: str(d.bankName),
  };
}

export type DistributorPayload = Omit<DistributorFormValues, "bankAccountNumber" | "bankName"> & {
  bankAccountNumber?: string;
  bankName?: string;
};

const between = (s: string, min: number, max: number) => s.length >= min && s.length <= max;

export function validateDistributorForm(v: DistributorFormValues): Result<DistributorPayload, DistributorFormValues> {
  const t = (k: keyof DistributorFormValues) => v[k].trim();
  const e: Errors<DistributorFormValues> = {};
  if (!between(t("name"), 2, 255)) e.name = "Tên từ 2 đến 255 ký tự";
  if (!between(t("taxCode"), 10, 50) || !/^[0-9-]+$/.test(t("taxCode"))) e.taxCode = "MST 10–50 ký tự, chỉ số và dấu -";
  if (!between(t("address"), 5, 500)) e.address = "Địa chỉ từ 5 đến 500 ký tự";
  if (!between(t("contactPerson"), 2, 255)) e.contactPerson = "Tên người liên hệ từ 2 đến 255 ký tự";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t("contactEmail"))) e.contactEmail = "Email không hợp lệ";
  if (!between(t("contactPhone"), 8, 20) || !/^[0-9+() -]+$/.test(t("contactPhone"))) e.contactPhone = "SĐT 8–20 ký tự";
  if (t("bankAccountNumber") && !between(t("bankAccountNumber"), 5, 50)) e.bankAccountNumber = "STK từ 5 đến 50 ký tự";
  if (t("bankName") && !between(t("bankName"), 2, 100)) e.bankName = "Tên ngân hàng từ 2 đến 100 ký tự";
  return done(e, () => ({
    name: t("name"),
    taxCode: t("taxCode"),
    address: t("address"),
    contactPerson: t("contactPerson"),
    contactEmail: t("contactEmail"),
    contactPhone: t("contactPhone"),
    bankAccountNumber: t("bankAccountNumber") || undefined,
    bankName: t("bankName") || undefined,
  }));
}

/* ───────── Khuyến mãi / voucher (CreatePromotionDto) ───────── */

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface AdminPromotion {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  usageLimit: number | null;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface PromotionFormValues {
  code: string;
  discountType: DiscountType;
  discountValue: string;
  maxDiscountAmount: string;
  minOrderAmount: string;
  usageLimit: string;
  startLocal: string;
  endLocal: string;
  isActive: boolean;
}

export const emptyPromotionForm: PromotionFormValues = {
  code: "",
  discountType: "FIXED_AMOUNT",
  discountValue: "",
  maxDiscountAmount: "",
  minOrderAmount: "0",
  usageLimit: "",
  startLocal: "",
  endLocal: "",
  isActive: true,
};

/** ISO → giá trị cho <input type="datetime-local"> theo giờ máy người dùng. */
export function isoToLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function promotionToForm(p: AdminPromotion): PromotionFormValues {
  return {
    code: p.code,
    discountType: p.discountType,
    discountValue: str(Number(p.discountValue)),
    maxDiscountAmount: str(p.maxDiscountAmount === null ? "" : Number(p.maxDiscountAmount)),
    minOrderAmount: str(Number(p.minOrderAmount)),
    usageLimit: str(p.usageLimit),
    startLocal: isoToLocal(p.startDate),
    endLocal: isoToLocal(p.endDate),
    isActive: p.isActive,
  };
}

export interface PromotionPayload {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount: number;
  usageLimit?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export function validatePromotionForm(v: PromotionFormValues): Result<PromotionPayload, PromotionFormValues> {
  const e: Errors<PromotionFormValues> = {};
  const code = v.code.trim().toUpperCase();
  if (!between(code, 6, 50) || !/^[A-Z0-9]+$/.test(code)) e.code = "Mã 6–50 ký tự, chỉ chữ in hoa và số";
  const value = Number(v.discountValue);
  if (!/^\d+(\.\d{1,2})?$/.test(v.discountValue) || value <= 0) e.discountValue = "Giá trị giảm phải lớn hơn 0";
  else if (v.discountType === "PERCENTAGE" && value > 100) e.discountValue = "Phần trăm không vượt quá 100";
  if (v.discountType === "PERCENTAGE" && !/^\d+$/.test(v.maxDiscountAmount)) e.maxDiscountAmount = "Giảm theo % bắt buộc có mức giảm tối đa";
  if (!/^\d+$/.test(v.minOrderAmount)) e.minOrderAmount = "Số nguyên ≥ 0";
  if (v.usageLimit.trim() && (!/^\d+$/.test(v.usageLimit) || Number(v.usageLimit) < 1)) e.usageLimit = "Số lượt ≥ 1, để trống nếu không giới hạn";
  const start = localToIso(v.startLocal);
  const end = localToIso(v.endLocal);
  if (!start) e.startLocal = "Chọn thời gian bắt đầu";
  if (!end) e.endLocal = "Chọn thời gian kết thúc";
  else if (start && new Date(end) <= new Date(start)) e.endLocal = "Kết thúc phải sau bắt đầu";
  return done(e, () => ({
    code,
    discountType: v.discountType,
    discountValue: value,
    maxDiscountAmount: v.discountType === "PERCENTAGE" ? Number(v.maxDiscountAmount) : undefined,
    minOrderAmount: Number(v.minOrderAmount),
    usageLimit: v.usageLimit.trim() ? Number(v.usageLimit) : undefined,
    startDate: start!,
    endDate: end!,
    isActive: v.isActive,
  }));
}

export type PromotionPhase = "DISABLED" | "UPCOMING" | "RUNNING" | "EXHAUSTED" | "EXPIRED";

/** Trạng thái hiệu lực thực tế mà khách thấy (khớp điều kiện của GET /promotions/public). */
export function promotionPhase(p: AdminPromotion, now: Date = new Date()): PromotionPhase {
  if (!p.isActive) return "DISABLED";
  if (new Date(p.endDate) < now) return "EXPIRED";
  if (new Date(p.startDate) > now) return "UPCOMING";
  if (p.usageLimit !== null && p.usedCount >= p.usageLimit) return "EXHAUSTED";
  return "RUNNING";
}

export const PROMOTION_PHASE_LABEL: Record<PromotionPhase, string> = {
  DISABLED: "Đã tắt",
  UPCOMING: "Sắp diễn ra",
  RUNNING: "Đang áp dụng",
  EXHAUSTED: "Hết lượt",
  EXPIRED: "Hết hạn",
};
