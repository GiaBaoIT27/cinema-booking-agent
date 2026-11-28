import { apiClient } from "@/lib/api-client";
import type {
  MovieDetail,
  MovieStatusType,
} from "@/features/movie/types/movie.type";
import type { MoviePayload } from "../utils/movie-form";

export interface DistributorOption {
  id: string;
  name: string;
}

/**
 * Các API quản trị phim (backend đã có sẵn, mỗi API được chặn bằng @RequirePermissions).
 * Gửi JSON với URL ảnh/trailer; backend vẫn hỗ trợ upload file nhưng giao diện chưa dùng.
 */
export const adminMovieService = {
  /** POST /movies — quyền movie:create */
  create(payload: MoviePayload) {
    return apiClient.post<{ id: string; title: string; status: string }>(
      "/movies",
      payload,
    );
  },

  /** PUT /movies/:id — quyền movie:update. Không gồm thể loại (cập nhật riêng). */
  update(id: string | number, payload: MoviePayload) {
    const body: Partial<MoviePayload> = { ...payload };
    delete body.genreIds;
    return apiClient.put<MovieDetail>(`/movies/${id}`, body);
  },

  /** PATCH /movies/:id/genres — quyền movie:update */
  updateGenres(id: string | number, genreIds: number[]) {
    return apiClient.patch<MovieDetail>(`/movies/${id}/genres`, { genreIds });
  },

  /** PATCH /movies/:id/status — quyền movie:update, backend kiểm tra ma trận chuyển trạng thái */
  updateStatus(id: string | number, status: MovieStatusType) {
    return apiClient.patch<MovieDetail>(`/movies/${id}/status`, { status });
  },

  /** DELETE /movies/:id — quyền movie:delete; bị từ chối nếu phim còn suất chiếu sắp tới */
  remove(id: string | number) {
    return apiClient.delete<void>(`/movies/${id}`);
  },

  /** GET /distributors?status=ACTIVE — quyền distributor:view */
  async getActiveDistributors(): Promise<DistributorOption[]> {
    const raw = await apiClient.get<
      DistributorOption[] | { data?: DistributorOption[] }
    >("/distributors", { params: { status: "ACTIVE", limit: 100 } });
    const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
    return list.map((d) => ({ id: String(d.id), name: d.name }));
  },
};
