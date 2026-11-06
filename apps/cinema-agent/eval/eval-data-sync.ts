/**
 * Đồng bộ dữ liệu eval với database – hàm THUẦN (không I/O) để kiểm thử được.
 *
 * Bộ dữ liệu viết bằng ngày TƯƠNG ĐỐI ("ngày mai 10:00") trong khi backend chỉ trả suất
 * chiếu CHƯA bắt đầu. Vì vậy suất chiếu eval phải luôn nằm ở ngày mai (giờ VN) so với lúc
 * chạy, và fixtures phải trỏ đúng các bản ghi đang có trong DB. Module này tính ngày
 * cần seed và kiểm tra fixtures trước khi chạy để không có case FAIL vì dữ liệu lệch.
 */

export const EVAL_TIMEZONE = "Asia/Ho_Chi_Minh";

/** Ngày YYYY-MM-DD theo giờ VN, lệch `offsetDays` ngày so với `now`. */
export function vnDate(now: Date, offsetDays = 0): string {
  const shifted = new Date(now.getTime() + offsetDays * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: EVAL_TIMEZONE }).format(shifted);
}

/** Ngày suất chiếu eval phải có để "ngày mai" trong bộ dữ liệu đúng tại thời điểm `now`. */
export function requiredEvalDate(now: Date): string {
  return vnDate(now, 1);
}

export interface FixtureShowtime {
  key: string;
  id: string;
  startTime: string;
  auditoriumCode: string;
}

export interface FixtureSeat {
  id: number | string;
  seatNumber: string;
}

export interface SyncFixtures {
  evalDate: string;
  showtimes: FixtureShowtime[];
  seatsByAuditorium: Record<string, Record<string, FixtureSeat[]>>;
}

/** Suất chiếu đọc từ DB: id và start_time (UTC, ISO). */
export interface DbShowtime {
  id: string;
  startTime: string;
}

/**
 * Tra id ghế theo nhãn (VD "H7") TRONG phòng của suất chiếu `showtimeKey`.
 * Không đoán, không id viết cứng: không tìm thấy => null.
 * Không truyền suất chiếu => chỉ chấp nhận khi nhãn là duy nhất trên mọi phòng.
 */
export function resolveSeatId(
  fixtures: SyncFixtures,
  label: string,
  showtimeKey?: string,
): string | null {
  if (/^\d+$/.test(label)) return label;

  const findIn = (auditoriumCode: string) =>
    Object.values(fixtures.seatsByAuditorium[auditoriumCode] ?? {})
      .flat()
      .find((s) => s.seatNumber === label);

  if (showtimeKey) {
    const st = fixtures.showtimes.find((s) => s.key === showtimeKey);
    if (!st) return null;
    const seat = findIn(st.auditoriumCode);
    return seat ? String(seat.id) : null;
  }

  const matches = Object.keys(fixtures.seatsByAuditorium)
    .map(findIn)
    .filter((s): s is FixtureSeat => Boolean(s));
  return matches.length === 1 ? String(matches[0].id) : null;
}

export interface SeatReference {
  caseId: string;
  label: string;
  showtimeKey?: string;
}

/**
 * Kiểm tra fixtures có dùng được cho lần chạy tại thời điểm `now` không.
 * Trả danh sách lỗi (rỗng = dùng được).
 */
export function checkFixtures(
  fixtures: SyncFixtures,
  dbShowtimes: DbShowtime[],
  seatRefs: SeatReference[],
  now: Date,
): string[] {
  const errors: string[] = [];
  const required = requiredEvalDate(now);

  if (fixtures.evalDate !== required) {
    errors.push(
      `Fixtures seed cho ngày ${fixtures.evalDate}, nhưng bộ dữ liệu hỏi "ngày mai" = ${required}`,
    );
  }

  const byId = new Map(dbShowtimes.map((s) => [String(s.id), s]));
  for (const st of fixtures.showtimes) {
    const db = byId.get(String(st.id));
    if (!db) {
      errors.push(`Suất ${st.key} (id ${st.id}) không còn trong database`);
      continue;
    }
    if (Date.parse(db.startTime) !== Date.parse(st.startTime)) {
      errors.push(
        `Suất ${st.key} (id ${st.id}) lệch giờ: fixtures ${st.startTime}, database ${db.startTime}`,
      );
    }
    if (Date.parse(db.startTime) <= now.getTime()) {
      errors.push(`Suất ${st.key} (id ${st.id}) đã bắt đầu – backend sẽ không trả về`);
    }
  }

  for (const ref of seatRefs) {
    if (resolveSeatId(fixtures, ref.label, ref.showtimeKey) === null) {
      errors.push(
        `[${ref.caseId}] Không tra được ghế "${ref.label}"${ref.showtimeKey ? ` trong phòng của suất ${ref.showtimeKey}` : ""}`,
      );
    }
  }
  return errors;
}
