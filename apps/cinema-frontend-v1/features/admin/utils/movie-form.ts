import { z } from "zod";
import type {
  MovieDetail,
  MovieStatusType,
} from "@/features/movie/types/movie.type";

export const AGE_RATINGS = ["P", "K", "T13", "T16", "T18"] as const;

export const MOVIE_STATUS_LABEL: Record<MovieStatusType, string> = {
  UPCOMING: "Sắp chiếu",
  SHOWING: "Đang chiếu",
  ENDED: "Đã kết thúc",
};

/** Bản sao ma trận chuyển trạng thái ở backend (movie-status.rules.ts) để chỉ hiện lựa chọn hợp lệ. */
const ALLOWED_STATUS_TRANSITIONS: Record<MovieStatusType, MovieStatusType[]> = {
  UPCOMING: ["SHOWING", "ENDED"],
  SHOWING: ["ENDED"],
  ENDED: [],
};

export function nextStatuses(status: string): MovieStatusType[] {
  return ALLOWED_STATUS_TRANSITIONS[status as MovieStatusType] ?? [];
}

const optionalText = (max: number) =>
  z.string().trim().max(max, `Tối đa ${max} ký tự`);

const optionalUrl = z
  .string()
  .trim()
  .max(500, "Tối đa 500 ký tự")
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "URL không hợp lệ");

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

/** Giá trị form đều là chuỗi (đúng như input HTML trả về), chỉ đổi kiểu khi gửi API. */
export const movieFormSchema = z
  .object({
    title: z.string().trim().min(1, "Tên phim không được để trống").max(255, "Tối đa 255 ký tự"),
    originalTitle: optionalText(255),
    distributorId: z.string().min(1, "Chọn nhà phát hành"),
    genreIds: z.array(z.string()).min(1, "Chọn ít nhất 1 thể loại"),
    durationMinutes: z
      .string()
      .regex(/^\d+$/, "Thời lượng phải là số nguyên")
      .refine((v) => Number(v) > 0, "Thời lượng phải lớn hơn 0"),
    ageRating: z.enum(AGE_RATINGS, { message: "Chọn phân loại độ tuổi" }),
    releaseDate: z.string().regex(datePattern, "Chọn ngày khởi chiếu"),
    endDate: z.string().regex(datePattern, "Chọn ngày kết thúc"),
    revenueShareRatio: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Tối đa 2 chữ số thập phân")
      .refine((v) => Number(v) >= 0 && Number(v) <= 100, "Từ 0 đến 100"),
    director: optionalText(255),
    cast: z.string().trim(),
    country: optionalText(100),
    originalLanguage: optionalText(50),
    posterUrl: optionalUrl,
    bannerUrl: optionalUrl,
    trailerUrl: optionalUrl,
    description: z.string().trim(),
  })
  .refine((v) => !v.releaseDate || !v.endDate || v.endDate >= v.releaseDate, {
    path: ["endDate"],
    message: "Ngày kết thúc phải sau hoặc bằng ngày khởi chiếu",
  });

export type MovieFormValues = z.input<typeof movieFormSchema>;
export type MovieFormErrors = Partial<Record<keyof MovieFormValues, string>>;

export const emptyMovieForm: MovieFormValues = {
  title: "",
  originalTitle: "",
  distributorId: "",
  genreIds: [],
  durationMinutes: "",
  ageRating: "P",
  releaseDate: "",
  endDate: "",
  revenueShareRatio: "50",
  director: "",
  cast: "",
  country: "",
  originalLanguage: "",
  posterUrl: "",
  bannerUrl: "",
  trailerUrl: "",
  description: "",
};

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export function movieDetailToForm(movie: MovieDetail): MovieFormValues {
  const age = AGE_RATINGS.includes(movie.ageRating as (typeof AGE_RATINGS)[number])
    ? (movie.ageRating as MovieFormValues["ageRating"])
    : "P";
  return {
    title: s(movie.title),
    originalTitle: s(movie.originalTitle),
    distributorId: s(movie.distributor?.id),
    genreIds: (movie.genres ?? []).map((g) => String(g.id)),
    durationMinutes: s(movie.durationMinutes),
    ageRating: age,
    releaseDate: s(movie.releaseDate).slice(0, 10),
    endDate: s(movie.endDate).slice(0, 10),
    revenueShareRatio: s(movie.revenueShareRatio ?? 50),
    director: s(movie.director),
    cast: s(movie.cast),
    country: s(movie.country),
    originalLanguage: s(movie.originalLanguage),
    posterUrl: s(movie.posterUrl),
    bannerUrl: s(movie.bannerUrl),
    trailerUrl: s(movie.trailerUrl),
    description: s(movie.description),
  };
}

export type ValidationResult =
  | { ok: true; values: MovieFormValues }
  | { ok: false; errors: MovieFormErrors };

export function validateMovieForm(values: MovieFormValues): ValidationResult {
  const parsed = movieFormSchema.safeParse(values);
  if (parsed.success) return { ok: true, values: parsed.data };
  const errors: MovieFormErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof MovieFormValues | undefined;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/** Body JSON khớp CreateMovieDto. Trường tùy chọn để trống thì bỏ đi, không gửi chuỗi rỗng. */
export interface MoviePayload {
  distributorId: number;
  title: string;
  originalTitle?: string;
  description?: string;
  director?: string;
  cast?: string;
  durationMinutes: number;
  ageRating: string;
  country?: string;
  originalLanguage?: string;
  revenueShareRatio: number;
  trailerUrl?: string;
  posterUrl?: string;
  bannerUrl?: string;
  releaseDate: string;
  endDate: string;
  genreIds: number[];
}

export function toMoviePayload(values: MovieFormValues): MoviePayload {
  const opt = (v: string) => {
    const t = v.trim();
    return t === "" ? undefined : t;
  };
  return {
    distributorId: Number(values.distributorId),
    title: values.title.trim(),
    originalTitle: opt(values.originalTitle),
    description: opt(values.description),
    director: opt(values.director),
    cast: opt(values.cast),
    durationMinutes: Number(values.durationMinutes),
    ageRating: values.ageRating,
    country: opt(values.country),
    originalLanguage: opt(values.originalLanguage),
    revenueShareRatio: Number(values.revenueShareRatio),
    trailerUrl: opt(values.trailerUrl),
    posterUrl: opt(values.posterUrl),
    bannerUrl: opt(values.bannerUrl),
    releaseDate: values.releaseDate,
    endDate: values.endDate,
    genreIds: values.genreIds.map(Number),
  };
}

/** So sánh không phụ thuộc thứ tự, để chỉ gọi PATCH /movies/:id/genres khi thể loại thực sự đổi. */
export function genresChanged(before: string[], after: string[]): boolean {
  if (before.length !== after.length) return true;
  const set = new Set(before);
  return after.some((id) => !set.has(id));
}
