import type { MovieShowtimesByCinema } from "@/features/movie";
import type {
  CinemaShowtimeView,
  DateOption,
  ProjectionGroup,
  ShowtimeSlot,
} from "../types/showtimes.type";

const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

/** Số ngày hiển thị trên thanh lịch chiếu (hôm nay + 6 ngày tiếp theo) */
export const SHOWTIME_DAYS = 7;

const DAY_NAMES = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

/** Thứ tự hiển thị các nhóm định dạng; định dạng lạ xếp sau cùng */
const PROJECTION_ORDER = ["2D", "3D", "IMAX"];

/** Nhãn hiển thị cho từng projectionType của backend */
const PROJECTION_LABELS: Record<string, string> = {
  "2D": "STANDARD 2D",
};

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: VN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VN_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Tạo danh sách `days` ngày bắt đầu từ hôm nay (theo giờ Việt Nam).
 * Ví dụ hôm nay 09/10 → 09/10, 10/10, ..., 15/10.
 */
export function buildDateOptions(
  days: number = SHOWTIME_DAYS,
  now: Date = new Date(),
): DateOption[] {
  const parts = dateFormatter.formatToParts(now);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);

  const year = pick("year");
  const month = pick("month");
  const day = pick("day");

  return Array.from({ length: days }, (_, offset) => {
    // Cộng ngày trên lịch UTC để không bị lệch do múi giờ máy người dùng
    const d = new Date(Date.UTC(year, month - 1, day + offset));
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");

    return {
      fullDate: `${d.getUTCFullYear()}-${mm}-${dd}`,
      dayNumber: `${dd}/${mm}`,
      dayName: offset === 0 ? "Hôm nay" : DAY_NAMES[d.getUTCDay()],
    };
  });
}

/** Đổi ISO UTC (vd 2026-10-09T14:36:00.000Z) sang giờ VN dạng HH:mm (21:36) */
export function formatShowtimeTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--:--";
  return timeFormatter.format(d);
}

export function getProjectionLabel(projectionType: string): string {
  return PROJECTION_LABELS[projectionType] ?? projectionType;
}

function projectionRank(projectionType: string): number {
  const index = PROJECTION_ORDER.indexOf(projectionType);
  return index === -1 ? PROJECTION_ORDER.length : index;
}

/**
 * Chuyển dữ liệu `showtimesByCinema` từ backend sang model hiển thị:
 * sắp xếp theo giờ chiếu và gom nhóm theo định dạng chiếu.
 */
export function toCinemaViews(
  items: MovieShowtimesByCinema[],
): CinemaShowtimeView[] {
  return items
    .map((cinema) => {
      const sorted = [...cinema.showtimes].sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime() ||
          a.showtimeId - b.showtimeId,
      );

      const byProjection = new Map<string, ShowtimeSlot[]>();
      for (const st of sorted) {
        const slots = byProjection.get(st.projectionType) ?? [];
        slots.push({
          id: st.showtimeId,
          time: formatShowtimeTime(st.startTime),
          auditoriumName: st.auditoriumName,
        });
        byProjection.set(st.projectionType, slots);
      }

      const groups: ProjectionGroup[] = Array.from(byProjection.entries())
        .map(([projectionType, slots]) => ({ projectionType, slots }))
        .sort(
          (a, b) =>
            projectionRank(a.projectionType) -
              projectionRank(b.projectionType) ||
            a.projectionType.localeCompare(b.projectionType),
        );

      return { id: cinema.cineplexId, name: cinema.cineplexName, groups };
    })
    .filter((cinema) => cinema.groups.length > 0);
}
