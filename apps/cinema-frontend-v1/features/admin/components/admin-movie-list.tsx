"use client";

import { useState } from "react";
import Link from "next/link";
import { Archive, CalendarClock, Clapperboard, Film, Pencil, Plus, Trash2 } from "lucide-react";
import { countOf, useStats } from "../hooks/use-stats";
import { useMovies } from "@/features/movie/hooks/use-movies";
import type {
  MovieListItem,
  MovieStatusType,
} from "@/features/movie/types/movie.type";
import { useAuthStore } from "@/stores/use-auth-store";
import { adminMovieService } from "../services/admin-movie.service";
import { hasPermission } from "../utils/admin-access";
import { MOVIE_STATUS_LABEL, nextStatuses } from "../utils/movie-form";
import {
  ClearFilters,
  MovieStatusBadge,
  Notice,
  PageHeader,
  SearchBox,
  Toolbar,
  filterClass,
  toolbarBtn,
  StatCards,
} from "./admin-ui";

const PAGE_SIZE = 10;

const formatDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("vi-VN") : "—";

export function AdminMovieList() {
  const user = useAuthStore((s) => s.user);
  const canCreate = hasPermission(user, "movie:create");
  const canUpdate = hasPermission(user, "movie:update");
  const canDelete = hasPermission(user, "movie:delete");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MovieStatusType | "">("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statsVersion, setStatsVersion] = useState(0);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const { rawMovies, isLoading, error, pagination, refetch } = useMovies({
    search: search || undefined,
    status: status || undefined,
    page,
    limit: PAGE_SIZE,
    sort: "release_date:desc",
  });

  const run = async (movie: MovieListItem, action: () => Promise<unknown>, ok: string) => {
    setBusyId(String(movie.id));
    setNotice(null);
    try {
      await action();
      setNotice({ kind: "success", text: ok });
      refetch();
      setStatsVersion((v) => v + 1);
    } catch (err) {
      setNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Thao tác thất bại",
      });
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = (movie: MovieListItem, target: MovieStatusType) =>
    run(
      movie,
      () => adminMovieService.updateStatus(movie.id, target),
      `Đã chuyển “${movie.title}” sang ${MOVIE_STATUS_LABEL[target]}`,
    );

  const remove = (movie: MovieListItem) => {
    if (!window.confirm(`Xóa phim “${movie.title}”? Thao tác này không hoàn tác được.`)) return;
    run(movie, () => adminMovieService.remove(movie.id), `Đã xóa phim “${movie.title}”`);
  };

  const stat = useStats(
    {
      all: () => countOf("/movies"),
      SHOWING: () => countOf("/movies", { status: "SHOWING" }),
      UPCOMING: () => countOf("/movies", { status: "UPCOMING" }),
      ENDED: () => countOf("/movies", { status: "ENDED" }),
    },
    statsVersion,
  );
  const pick = (s: MovieStatusType | "") => () => {
    setPage(1);
    setStatus(s);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Quản lý phim" subtitle={`${pagination.totalItems} phim`} />

      <StatCards
        items={[
          { label: "Tổng số phim", value: stat("all"), tone: "red", icon: Film, onClick: pick(""), active: status === "" },
          { label: "Đang chiếu", value: stat("SHOWING"), tone: "green", icon: Clapperboard, onClick: pick("SHOWING"), active: status === "SHOWING" },
          { label: "Sắp chiếu", value: stat("UPCOMING"), tone: "amber", icon: CalendarClock, onClick: pick("UPCOMING"), active: status === "UPCOMING" },
          { label: "Đã kết thúc", value: stat("ENDED"), tone: "gray", icon: Archive, onClick: pick("ENDED"), active: status === "ENDED" },
        ]}
      />

      <Toolbar
        actions={
          canCreate && (
            <Link href="/admin/movies/new" className={toolbarBtn}>
              <Plus size={16} /> Thêm phim
            </Link>
          )
        }
      >
        <SearchBox value={search} placeholder="Tìm theo tên phim..." onSearch={(v) => { setPage(1); setSearch(v); }} />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as MovieStatusType | "");
          }}
          className={filterClass}
          aria-label="Lọc theo trạng thái"
        >
          <option value="">Tất cả trạng thái</option>
          {(Object.keys(MOVIE_STATUS_LABEL) as MovieStatusType[]).map((s) => (
            <option key={s} value={s}>
              {MOVIE_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <ClearFilters show={!!(search || status)} onClear={() => { setPage(1); setSearch(""); setStatus(""); }} />
      </Toolbar>

      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      {error && <Notice kind="error">Không tải được danh sách phim: {error}</Notice>}

      <div className="overflow-x-auto rounded-xl border border-[#1F2937]">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-[#0B0F19] text-left text-xs uppercase tracking-wide text-[#6B7280]">
            <tr>
              <th className="px-4 py-3">Phim</th>
              <th className="px-4 py-3">Thời lượng</th>
              <th className="px-4 py-3">Độ tuổi</th>
              <th className="px-4 py-3">Khởi chiếu – Kết thúc</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2937]">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#6B7280]">
                  Đang tải...
                </td>
              </tr>
            )}
            {!isLoading && rawMovies.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#6B7280]">
                  Không có phim nào khớp bộ lọc.
                </td>
              </tr>
            )}
            {!isLoading &&
              rawMovies.map((movie) => {
                const busy = busyId === String(movie.id);
                const targets = nextStatuses(movie.status);
                return (
                  <tr key={movie.id} className={busy ? "opacity-50" : "hover:bg-[#0B0F19]/60"}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {movie.posterUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- poster có thể ở domain bất kỳ do admin nhập
                          <img src={movie.posterUrl} alt="" className="h-14 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-14 w-10 rounded bg-[#1F2937]" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium">{movie.title}</p>
                          {movie.originalTitle && (
                            <p className="truncate text-xs text-[#6B7280]">{movie.originalTitle}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#D1D5DB]">{movie.durationMinutes} phút</td>
                    <td className="px-4 py-3 text-[#D1D5DB]">{movie.ageRating}</td>
                    <td className="px-4 py-3 text-[#D1D5DB]">
                      {formatDate(movie.releaseDate)} – {formatDate(movie.endDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MovieStatusBadge status={movie.status} />
                        {canUpdate && targets.length > 0 && (
                          <select
                            value=""
                            disabled={busy}
                            onChange={(e) => {
                              if (e.target.value) changeStatus(movie, e.target.value as MovieStatusType);
                            }}
                            className="h-7 rounded border border-[#1F2937] bg-[#0B0F19] px-1 text-xs text-[#9CA3AF]"
                            aria-label={`Đổi trạng thái ${movie.title}`}
                          >
                            <option value="">Đổi…</option>
                            {targets.map((t) => (
                              <option key={t} value={t}>
                                {MOVIE_STATUS_LABEL[t]}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canUpdate && (
                          <Link
                            href={`/admin/movies/${movie.id}`}
                            className="rounded p-2 text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white"
                            title="Sửa"
                          >
                            <Pencil size={15} />
                          </Link>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => remove(movie)}
                            className="rounded p-2 text-[#9CA3AF] hover:bg-red-950/40 hover:text-red-400"
                            title="Xóa"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-[#374151] px-3 py-1.5 disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-[#9CA3AF]">
            Trang {page}/{pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-[#374151] px-3 py-1.5 disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
