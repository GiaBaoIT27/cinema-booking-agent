"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { movieService } from "@/features/movie/services/movie.service";
import type { MovieGenre } from "@/features/movie/types/movie.type";
import {
  adminMovieService,
  type DistributorOption,
} from "../services/admin-movie.service";
import {
  AGE_RATINGS,
  emptyMovieForm,
  genresChanged,
  movieDetailToForm,
  toMoviePayload,
  validateMovieForm,
  type MovieFormErrors,
  type MovieFormValues,
} from "../utils/movie-form";
import { Field, MovieStatusBadge, Notice, inputClass } from "./admin-ui";

interface Props {
  /** Không có id → tạo mới; có id → sửa phim đó. */
  movieId?: string;
}

/** Lỗi validate từ backend có dạng { field, message }; gắn vào đúng ô nếu tên trường khớp. */
function mapServerErrors(err: ApiError): MovieFormErrors {
  const result: MovieFormErrors = {};
  for (const e of err.errors ?? []) {
    if (e.field && e.field in emptyMovieForm) {
      result[e.field as keyof MovieFormValues] = e.message;
    }
  }
  return result;
}

export function AdminMovieForm({ movieId }: Props) {
  const router = useRouter();
  const isEdit = Boolean(movieId);

  const [values, setValues] = useState<MovieFormValues>(emptyMovieForm);
  const [initialGenres, setInitialGenres] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<MovieFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [genres, setGenres] = useState<MovieGenre[]>([]);
  const [distributors, setDistributors] = useState<DistributorOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      movieService.getGenres(),
      adminMovieService.getActiveDistributors(),
      movieId ? movieService.getMovieById(movieId) : Promise.resolve(null),
    ])
      .then(([genreList, distributorList, movie]) => {
        if (cancelled) return;
        setGenres(Array.isArray(genreList) ? genreList : []);
        let options = distributorList;
        if (movie) {
          const form = movieDetailToForm(movie);
          setValues(form);
          setInitialGenres(form.genreIds);
          setStatus(movie.status);
          // Nhà phát hành hiện tại có thể đã bị tạm ngưng → vẫn hiện để không mất giá trị
          if (
            movie.distributor &&
            !options.some((d) => d.id === String(movie.distributor!.id))
          ) {
            options = [
              {
                id: String(movie.distributor.id),
                name: `${movie.distributor.name} (ngưng hoạt động)`,
              },
              ...options,
            ];
          }
        }
        setDistributors(options);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setFormError(
            err instanceof Error ? err.message : "Không tải được dữ liệu",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [movieId]);

  const set = <K extends keyof MovieFormValues>(
    key: K,
    value: MovieFormValues[K],
  ) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const toggleGenre = (id: string) =>
    set(
      "genreIds",
      values.genreIds.includes(id)
        ? values.genreIds.filter((g) => g !== id)
        : [...values.genreIds, id],
    );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const check = validateMovieForm(values);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    const payload = toMoviePayload(check.values);
    setSaving(true);
    try {
      if (movieId) {
        await adminMovieService.update(movieId, payload);
        if (genresChanged(initialGenres, check.values.genreIds)) {
          await adminMovieService.updateGenres(movieId, payload.genreIds);
        }
      } else {
        await adminMovieService.create(payload);
      }
      router.push("/admin/movies");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(mapServerErrors(err));
        setFormError(err.message);
      } else {
        setFormError(err instanceof Error ? err.message : "Lưu phim thất bại");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[#9CA3AF]">Đang tải...</p>;
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mx-auto max-w-5xl space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/movies"
            className="mb-1 flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-white"
          >
            <ArrowLeft size={12} /> Danh sách phim
          </Link>
          <h1 className="flex items-center gap-3 font-heading text-2xl font-bold">
            {isEdit ? "Sửa phim" : "Thêm phim mới"}
            {status && <MovieStatusBadge status={status} />}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/movies"
            className="rounded-lg border border-[#374151] px-4 py-2 text-sm hover:bg-[#1F2937]"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#EF4444] px-5 py-2 text-sm font-medium hover:bg-[#DC2626] disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo phim"}
          </button>
        </div>
      </div>

      {formError && <Notice kind="error">{formError}</Notice>}

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-[#1F2937] bg-[#0B0F19]/60 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#9CA3AF]">
              Thông tin chính
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Tên phim"
                required
                error={errors.title}
                className="sm:col-span-2"
              >
                <input
                  className={inputClass(errors.title)}
                  value={values.title}
                  onChange={(e) => set("title", e.target.value)}
                />
              </Field>
              <Field label="Tên gốc" error={errors.originalTitle}>
                <input
                  className={inputClass(errors.originalTitle)}
                  value={values.originalTitle}
                  onChange={(e) => set("originalTitle", e.target.value)}
                />
              </Field>
              <Field
                label="Nhà phát hành"
                required
                error={errors.distributorId}
              >
                <select
                  className={inputClass(errors.distributorId)}
                  value={values.distributorId}
                  onChange={(e) => set("distributorId", e.target.value)}
                >
                  <option value="">— Chọn —</option>
                  {distributors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Thời lượng (phút)"
                required
                error={errors.durationMinutes}
              >
                <input
                  type="number"
                  min={1}
                  className={inputClass(errors.durationMinutes)}
                  value={values.durationMinutes}
                  onChange={(e) => set("durationMinutes", e.target.value)}
                />
              </Field>
              <Field
                label="Phân loại độ tuổi"
                required
                error={errors.ageRating}
              >
                <select
                  className={inputClass(errors.ageRating)}
                  value={values.ageRating}
                  onChange={(e) =>
                    set(
                      "ageRating",
                      e.target.value as MovieFormValues["ageRating"],
                    )
                  }
                >
                  {AGE_RATINGS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Ngày khởi chiếu"
                required
                error={errors.releaseDate}
              >
                <input
                  type="date"
                  className={inputClass(errors.releaseDate)}
                  value={values.releaseDate}
                  onChange={(e) => set("releaseDate", e.target.value)}
                />
              </Field>
              <Field label="Ngày kết thúc" required error={errors.endDate}>
                <input
                  type="date"
                  className={inputClass(errors.endDate)}
                  value={values.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                />
              </Field>
              <Field
                label="Tỷ lệ chia doanh thu cho NPH (%)"
                required
                error={errors.revenueShareRatio}
              >
                <input
                  inputMode="decimal"
                  className={inputClass(errors.revenueShareRatio)}
                  value={values.revenueShareRatio}
                  onChange={(e) => set("revenueShareRatio", e.target.value)}
                />
              </Field>
            </div>

            <div className="space-y-2">
              <span className="text-[13px] font-medium text-[#D1D5DB]">
                Thể loại<span className="ml-0.5 text-red-500">*</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => {
                  const id = String(g.id);
                  const on = values.genreIds.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleGenre(id)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        on
                          ? "border-[#EF4444] bg-[#EF4444]/15 text-[#FCA5A5]"
                          : "border-[#374151] text-[#9CA3AF] hover:border-[#4B5563] hover:text-white"
                      }`}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
              {errors.genreIds && (
                <span className="block text-xs text-red-500">
                  {errors.genreIds}
                </span>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-[#1F2937] bg-[#0B0F19]/60 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#9CA3AF]">
              Chi tiết
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Đạo diễn" error={errors.director}>
                <input
                  className={inputClass(errors.director)}
                  value={values.director}
                  onChange={(e) => set("director", e.target.value)}
                />
              </Field>
              <Field label="Quốc gia" error={errors.country}>
                <input
                  className={inputClass(errors.country)}
                  value={values.country}
                  onChange={(e) => set("country", e.target.value)}
                />
              </Field>
              <Field label="Diễn viên" error={errors.cast}>
                <input
                  className={inputClass(errors.cast)}
                  value={values.cast}
                  onChange={(e) => set("cast", e.target.value)}
                />
              </Field>
              <Field label="Ngôn ngữ gốc" error={errors.originalLanguage}>
                <input
                  className={inputClass(errors.originalLanguage)}
                  value={values.originalLanguage}
                  onChange={(e) => set("originalLanguage", e.target.value)}
                />
              </Field>
              <Field
                label="Mô tả"
                error={errors.description}
                className="sm:col-span-2"
              >
                <textarea
                  rows={4}
                  className={`${inputClass(errors.description)} h-auto py-2`}
                  value={values.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
            </div>
          </section>
        </div>

        <section className="space-y-4 rounded-xl border border-[#1F2937] bg-[#0B0F19]/60 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#9CA3AF]">
            Hình ảnh & trailer
          </h2>
          <div className="flex aspect-2/3 items-center justify-center overflow-hidden rounded-lg bg-[#1F2937] text-xs text-[#6B7280]">
            {values.posterUrl && !errors.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- xem trước URL bất kỳ do admin nhập
              <img
                src={values.posterUrl}
                alt="Poster"
                className="h-full w-full object-cover"
              />
            ) : (
              "Chưa có poster"
            )}
          </div>
          <Field label="URL poster" error={errors.posterUrl}>
            <input
              className={inputClass(errors.posterUrl)}
              placeholder="https://..."
              value={values.posterUrl}
              onChange={(e) => set("posterUrl", e.target.value)}
            />
          </Field>
          <Field label="URL banner" error={errors.bannerUrl}>
            <input
              className={inputClass(errors.bannerUrl)}
              placeholder="https://..."
              value={values.bannerUrl}
              onChange={(e) => set("bannerUrl", e.target.value)}
            />
          </Field>
          <Field label="URL trailer" error={errors.trailerUrl}>
            <input
              className={inputClass(errors.trailerUrl)}
              placeholder="https://youtube.com/..."
              value={values.trailerUrl}
              onChange={(e) => set("trailerUrl", e.target.value)}
            />
          </Field>
        </section>
      </div>
    </form>
  );
}
