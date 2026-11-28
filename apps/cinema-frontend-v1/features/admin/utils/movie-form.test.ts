import { describe, expect, it } from "vitest";
import type { MovieDetail } from "@/features/movie/types/movie.type";
import {
  emptyMovieForm,
  genresChanged,
  movieDetailToForm,
  nextStatuses,
  toMoviePayload,
  validateMovieForm,
  type MovieFormValues,
} from "./movie-form";

const valid: MovieFormValues = {
  ...emptyMovieForm,
  title: "  Mai  ",
  distributorId: "3",
  genreIds: ["1", "4"],
  durationMinutes: "131",
  ageRating: "T18",
  releaseDate: "2026-12-01",
  endDate: "2026-12-31",
  revenueShareRatio: "45.5",
  posterUrl: "https://res.cloudinary.com/demo/poster.jpg",
};

describe("validateMovieForm", () => {
  it("chấp nhận form hợp lệ", () => {
    expect(validateMovieForm(valid).ok).toBe(true);
  });

  it("báo lỗi các trường bắt buộc của form trống", () => {
    const r = validateMovieForm(emptyMovieForm);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors)).toEqual(
      expect.arrayContaining(["title", "distributorId", "genreIds", "durationMinutes", "releaseDate", "endDate"]),
    );
  });

  it("từ chối ngày kết thúc trước ngày khởi chiếu", () => {
    const r = validateMovieForm({ ...valid, endDate: "2026-11-30" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.endDate).toMatch(/sau hoặc bằng/);
  });

  it("từ chối thời lượng 0, tỷ lệ ngoài 0–100 và URL sai", () => {
    const r = validateMovieForm({
      ...valid,
      durationMinutes: "0",
      revenueShareRatio: "120",
      trailerUrl: "youtube.com/abc",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.durationMinutes).toBeDefined();
    expect(r.errors.revenueShareRatio).toBeDefined();
    expect(r.errors.trailerUrl).toBeDefined();
  });
});

describe("toMoviePayload", () => {
  it("đổi kiểu số, cắt khoảng trắng và bỏ trường tùy chọn rỗng", () => {
    const p = toMoviePayload(valid);
    expect(p).toMatchObject({
      title: "Mai",
      distributorId: 3,
      durationMinutes: 131,
      revenueShareRatio: 45.5,
      genreIds: [1, 4],
      ageRating: "T18",
    });
    expect(p).not.toHaveProperty("director", "");
    expect(p.director).toBeUndefined();
    expect(p.trailerUrl).toBeUndefined();
  });
});

describe("movieDetailToForm", () => {
  it("điền form từ chi tiết phim, cắt ngày về YYYY-MM-DD", () => {
    const detail = {
      id: "7",
      title: "Mai",
      originalTitle: null,
      description: null,
      director: "Trấn Thành",
      cast: null,
      durationMinutes: 131,
      ageRating: "T18",
      country: "Việt Nam",
      originalLanguage: null,
      revenueShareRatio: 50,
      trailerUrl: null,
      posterUrl: null,
      bannerUrl: null,
      releaseDate: "2026-12-01T00:00:00.000Z",
      endDate: "2026-12-31",
      status: "UPCOMING",
      distributor: { id: "3", name: "CJ" },
      genres: [{ id: "1", name: "Tâm lý" }],
    } satisfies MovieDetail;
    const form = movieDetailToForm(detail);
    expect(form.releaseDate).toBe("2026-12-01");
    expect(form.distributorId).toBe("3");
    expect(form.genreIds).toEqual(["1"]);
    expect(form.originalTitle).toBe("");
    expect(validateMovieForm(form).ok).toBe(true);
  });
});

describe("nextStatuses", () => {
  it("khớp ma trận chuyển trạng thái của backend", () => {
    expect(nextStatuses("UPCOMING")).toEqual(["SHOWING", "ENDED"]);
    expect(nextStatuses("SHOWING")).toEqual(["ENDED"]);
    expect(nextStatuses("ENDED")).toEqual([]);
    expect(nextStatuses("UNKNOWN")).toEqual([]);
  });
});

describe("genresChanged", () => {
  it("không phụ thuộc thứ tự", () => {
    expect(genresChanged(["1", "2"], ["2", "1"])).toBe(false);
    expect(genresChanged(["1", "2"], ["1", "3"])).toBe(true);
    expect(genresChanged(["1"], ["1", "2"])).toBe(true);
  });
});
