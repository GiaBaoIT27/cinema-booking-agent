export const PROJECTION_TYPES = ["2D", "3D", "4DX", "IMAX"] as const;

export type ShowtimeStatusType = "SCHEDULED" | "OPEN" | "CLOSED" | "CANCELLED";

export const SHOWTIME_STATUS_LABEL: Record<ShowtimeStatusType, string> = {
  SCHEDULED: "Đã lên lịch",
  OPEN: "Đang mở bán",
  CLOSED: "Đã đóng",
  CANCELLED: "Đã hủy",
};

/** Bản sao ma trận ở backend (showtime-status.rules.ts). */
const ALLOWED: Record<ShowtimeStatusType, ShowtimeStatusType[]> = {
  SCHEDULED: ["OPEN", "CANCELLED"],
  OPEN: ["CLOSED", "CANCELLED"],
  CLOSED: [],
  CANCELLED: [],
};

export function nextShowtimeStatuses(status: string): ShowtimeStatusType[] {
  return ALLOWED[status as ShowtimeStatusType] ?? [];
}

export interface AdminShowtime {
  id: string;
  auditoriumId: string;
  movieId: string;
  projectionType: string;
  audioLanguage: string;
  subtitleLanguage: string | null;
  startTime: string;
  endTime: string;
  cleaningMinutes: number;
  status: string;
  movie?: { id: string; title: string; durationMinutes: number } | null;
  auditorium?: {
    id: string;
    name: string;
    cineplexId: string;
    cineplex?: { id: string; name: string } | null;
  } | null;
}

export interface ShowtimeFormValues {
  cineplexId: string;
  auditoriumId: string;
  movieId: string;
  projectionType: (typeof PROJECTION_TYPES)[number];
  audioLanguage: string;
  subtitleLanguage: string;
  /** Giá trị của <input type="datetime-local">: giờ địa phương, "YYYY-MM-DDTHH:mm" */
  startLocal: string;
  cleaningMinutes: string;
}

export type ShowtimeFormErrors = Partial<Record<keyof ShowtimeFormValues, string>>;

export const emptyShowtimeForm: ShowtimeFormValues = {
  cineplexId: "",
  auditoriumId: "",
  movieId: "",
  projectionType: "2D",
  audioLanguage: "Tiếng Việt",
  subtitleLanguage: "",
  startLocal: "",
  cleaningMinutes: "15",
};

export interface ShowtimePayload {
  auditoriumId: number;
  movieId: number;
  projectionType: string;
  audioLanguage: string;
  subtitleLanguage?: string;
  startTime: string;
  cleaningMinutes: number;
}

/** "2026-12-01T19:30" (giờ máy người dùng) → ISO UTC mà backend yêu cầu. */
export function localToIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function validateShowtimeForm(
  v: ShowtimeFormValues,
  now: Date = new Date(),
): { ok: true; payload: ShowtimePayload } | { ok: false; errors: ShowtimeFormErrors } {
  const errors: ShowtimeFormErrors = {};
  if (!v.cineplexId) errors.cineplexId = "Chọn cụm rạp";
  if (!v.auditoriumId) errors.auditoriumId = "Chọn phòng chiếu";
  if (!v.movieId) errors.movieId = "Chọn phim";
  if (!v.audioLanguage.trim()) errors.audioLanguage = "Nhập ngôn ngữ âm thanh";
  if (v.audioLanguage.trim().length > 50) errors.audioLanguage = "Tối đa 50 ký tự";
  if (v.subtitleLanguage.trim().length > 50) errors.subtitleLanguage = "Tối đa 50 ký tự";
  const iso = localToIso(v.startLocal);
  if (!iso) errors.startLocal = "Chọn giờ bắt đầu";
  else if (new Date(iso).getTime() <= now.getTime()) errors.startLocal = "Giờ bắt đầu phải ở tương lai";
  const cleaning = Number(v.cleaningMinutes);
  if (!/^\d+$/.test(v.cleaningMinutes) || cleaning > 60) errors.cleaningMinutes = "Từ 0 đến 60 phút";

  if (Object.keys(errors).length > 0 || !iso) return { ok: false, errors };
  return {
    ok: true,
    payload: {
      auditoriumId: Number(v.auditoriumId),
      movieId: Number(v.movieId),
      projectionType: v.projectionType,
      audioLanguage: v.audioLanguage.trim(),
      subtitleLanguage: v.subtitleLanguage.trim() || undefined,
      startTime: iso,
      cleaningMinutes: cleaning,
    },
  };
}

/** Phòng bị chiếm đến = bắt đầu + thời lượng phim + dọn phòng (giống calculateEndTime ở backend). */
export function estimateEnd(
  startLocal: string,
  durationMinutes?: number,
  cleaningMinutes = 15,
): Date | null {
  const iso = localToIso(startLocal);
  if (!iso || !durationMinutes) return null;
  return new Date(new Date(iso).getTime() + (durationMinutes + cleaningMinutes) * 60_000);
}

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
