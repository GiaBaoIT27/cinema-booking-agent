/* ───────── Cụm rạp ───────── */

export type CineplexStatusType = "ACTIVE" | "MAINTENANCE" | "CLOSED";
export const CINEPLEX_STATUS_LABEL: Record<CineplexStatusType, string> = {
  ACTIVE: "Hoạt động",
  MAINTENANCE: "Bảo trì",
  CLOSED: "Đóng cửa",
};

export interface AdminCineplex {
  id: number | string;
  code: string;
  name: string;
  provinceId: number | string;
  wardId: number | string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phoneNumber: string | null;
  status: string;
}

export interface CineplexFormValues {
  code: string;
  name: string;
  provinceId: string;
  wardId: string;
  address: string;
  latitude: string;
  longitude: string;
  phoneNumber: string;
}

export type CineplexFormErrors = Partial<Record<keyof CineplexFormValues, string>>;

export const emptyCineplexForm: CineplexFormValues = {
  code: "",
  name: "",
  provinceId: "",
  wardId: "",
  address: "",
  latitude: "",
  longitude: "",
  phoneNumber: "",
};

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export function cineplexToForm(c: AdminCineplex): CineplexFormValues {
  return {
    code: c.code,
    name: c.name,
    provinceId: str(c.provinceId),
    wardId: str(c.wardId),
    address: c.address,
    latitude: str(c.latitude),
    longitude: str(c.longitude),
    phoneNumber: str(c.phoneNumber),
  };
}

export interface CineplexPayload {
  code: string;
  name: string;
  provinceId: number;
  wardId: number;
  address: string;
  latitude?: number;
  longitude?: number;
  phoneNumber?: string;
}

const isNum = (v: string) => v.trim() !== "" && !Number.isNaN(Number(v));

/** Khớp CreateCineplexDto. */
export function validateCineplexForm(
  v: CineplexFormValues,
): { ok: true; payload: CineplexPayload } | { ok: false; errors: CineplexFormErrors } {
  const e: CineplexFormErrors = {};
  const code = v.code.trim();
  if (code.length < 3 || code.length > 50) e.code = "Mã từ 3 đến 50 ký tự";
  else if (!/^[A-Z0-9_-]+$/.test(code)) e.code = "Chỉ gồm chữ in hoa, số, - và _";
  if (v.name.trim().length < 3 || v.name.trim().length > 255) e.name = "Tên từ 3 đến 255 ký tự";
  if (!v.provinceId) e.provinceId = "Chọn tỉnh/thành";
  if (!v.wardId) e.wardId = "Chọn phường/xã";
  if (v.address.trim().length < 3 || v.address.trim().length > 500) e.address = "Địa chỉ từ 3 đến 500 ký tự";
  if (v.latitude.trim() && (!isNum(v.latitude) || Math.abs(Number(v.latitude)) > 90)) e.latitude = "Vĩ độ từ -90 đến 90";
  if (v.longitude.trim() && (!isNum(v.longitude) || Math.abs(Number(v.longitude)) > 180)) e.longitude = "Kinh độ từ -180 đến 180";
  if (v.phoneNumber.trim() && !/^(0|84)[35789]\d{8}$/.test(v.phoneNumber.trim())) e.phoneNumber = "SĐT Việt Nam không hợp lệ";
  if (Object.keys(e).length > 0) return { ok: false, errors: e };
  return {
    ok: true,
    payload: {
      code,
      name: v.name.trim(),
      provinceId: Number(v.provinceId),
      wardId: Number(v.wardId),
      address: v.address.trim(),
      latitude: v.latitude.trim() ? Number(v.latitude) : undefined,
      longitude: v.longitude.trim() ? Number(v.longitude) : undefined,
      phoneNumber: v.phoneNumber.trim() || undefined,
    },
  };
}

/* ───────── Phòng chiếu ───────── */

export type AuditoriumStatusType = "ACTIVE" | "MAINTENANCE" | "INACTIVE";
export const AUDITORIUM_STATUS_LABEL: Record<AuditoriumStatusType, string> = {
  ACTIVE: "Hoạt động",
  MAINTENANCE: "Bảo trì",
  INACTIVE: "Ngừng sử dụng",
};
export const SCREEN_TYPES = ["STANDARD", "IMAX", "4DX", "GOLD_CLASS"] as const;
export const AUDIO_TYPES = ["DOLBY_ATMOS", "7.1_SURROUND", "5.1_SURROUND"] as const;

export interface AdminAuditorium {
  id: number | string;
  cineplexId: number | string;
  cineplexName?: string;
  code: string;
  name: string;
  screenType: string;
  audioType: string;
  totalSeats: number;
  status: string;
}

export interface AuditoriumFormValues {
  cineplexId: string;
  code: string;
  name: string;
  screenType: (typeof SCREEN_TYPES)[number];
  audioType: (typeof AUDIO_TYPES)[number];
  totalSeats: string;
}

export type AuditoriumFormErrors = Partial<Record<keyof AuditoriumFormValues, string>>;

export const emptyAuditoriumForm: AuditoriumFormValues = {
  cineplexId: "",
  code: "",
  name: "",
  screenType: "STANDARD",
  audioType: "7.1_SURROUND",
  totalSeats: "",
};

export function auditoriumToForm(a: AdminAuditorium): AuditoriumFormValues {
  return {
    cineplexId: str(a.cineplexId),
    code: a.code,
    name: a.name,
    screenType: (SCREEN_TYPES as readonly string[]).includes(a.screenType)
      ? (a.screenType as AuditoriumFormValues["screenType"])
      : "STANDARD",
    audioType: (AUDIO_TYPES as readonly string[]).includes(a.audioType)
      ? (a.audioType as AuditoriumFormValues["audioType"])
      : "7.1_SURROUND",
    totalSeats: str(a.totalSeats),
  };
}

export interface AuditoriumPayload {
  cineplexId: number;
  code: string;
  name: string;
  screenType: string;
  audioType: string;
  totalSeats: number;
}

/** Khớp CreateAuditoriumDto. */
export function validateAuditoriumForm(
  v: AuditoriumFormValues,
): { ok: true; payload: AuditoriumPayload } | { ok: false; errors: AuditoriumFormErrors } {
  const e: AuditoriumFormErrors = {};
  const code = v.code.trim();
  if (!v.cineplexId) e.cineplexId = "Chọn cụm rạp";
  if (code.length < 2 || code.length > 50) e.code = "Mã từ 2 đến 50 ký tự";
  else if (!/^[A-Z0-9_-]+$/.test(code)) e.code = "Chỉ gồm chữ in hoa, số, - và _";
  if (v.name.trim().length < 2 || v.name.trim().length > 100) e.name = "Tên từ 2 đến 100 ký tự";
  if (!/^\d+$/.test(v.totalSeats) || Number(v.totalSeats) < 1) e.totalSeats = "Sức chứa phải là số nguyên ≥ 1";
  if (Object.keys(e).length > 0) return { ok: false, errors: e };
  return {
    ok: true,
    payload: {
      cineplexId: Number(v.cineplexId),
      code,
      name: v.name.trim(),
      screenType: v.screenType,
      audioType: v.audioType,
      totalSeats: Number(v.totalSeats),
    },
  };
}

/* ───────── Sinh sơ đồ ghế dạng lưới ───────── */

export interface SeatGridOptions {
  rows: number;
  seatsPerRow: number;
  normalSeatTypeId: number;
  vipSeatTypeId?: number;
  /** Các hàng VIP, ví dụ ["E","F"] */
  vipRows: string[];
}

export interface SeatLayoutItem {
  seatTypeId: number;
  rowLabel: string;
  columnNumber: number;
  seatNumber: string;
  coordX: number;
  coordY: number;
  gridSpan: number;
  status: "ACTIVE";
}

const ROW_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Hàng A ở đầu (gần màn hình), ghế đánh số 1..n từ trái sang; khớp cách seed 13-seats tạo tọa độ. */
export function buildSeatGrid(o: SeatGridOptions): SeatLayoutItem[] {
  const items: SeatLayoutItem[] = [];
  for (let r = 0; r < o.rows; r++) {
    const row = ROW_LETTERS[r];
    const isVip = o.vipSeatTypeId !== undefined && o.vipRows.includes(row);
    for (let c = 1; c <= o.seatsPerRow; c++) {
      items.push({
        seatTypeId: isVip ? o.vipSeatTypeId! : o.normalSeatTypeId,
        rowLabel: row,
        columnNumber: c,
        seatNumber: `${row}${c}`,
        coordX: c - 1,
        coordY: r,
        gridSpan: 1,
        status: "ACTIVE",
      });
    }
  }
  return items;
}

export function validateSeatGrid(rows: string, seatsPerRow: string, capacity: number): string | null {
  const r = Number(rows);
  const c = Number(seatsPerRow);
  if (!/^\d+$/.test(rows) || r < 1 || r > ROW_LETTERS.length) return `Số hàng từ 1 đến ${ROW_LETTERS.length}`;
  if (!/^\d+$/.test(seatsPerRow) || c < 1 || c > 40) return "Số ghế mỗi hàng từ 1 đến 40";
  if (r * c > capacity) return `Tổng ${r * c} ghế vượt sức chứa ${capacity} của phòng`;
  return null;
}

export const rowLetters = (rows: number) => ROW_LETTERS.slice(0, Math.max(0, Math.min(rows, 26))).split("");
