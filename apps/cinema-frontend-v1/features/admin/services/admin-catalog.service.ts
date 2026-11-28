import { apiClient } from "@/lib/api-client";
import { toPageResult, type PageResult } from "../utils/pagination";
import type { AdminFnbItem, FnbPayload } from "../utils/fnb-form";
import type {
  AdminShowtime,
  ShowtimePayload,
  ShowtimeStatusType,
} from "../utils/showtime-form";
import type {
  AdminUserDetail,
  AdminUserListItem,
  RoleOption,
  StaffFormValues,
  UserStatusType,
} from "../utils/user-admin";

export interface Option {
  id: string;
  name: string;
}

/** API bắp nước — backend: fnb.controller.ts (fnb:create, fnb:update). Gửi JSON, ảnh bằng URL. */
export const adminFnbService = {
  async list(params: {
    page: number;
    limit: number;
    keyword?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<PageResult<AdminFnbItem>> {
    const raw = await apiClient.get<unknown>("/fnb-items", { params });
    return toPageResult<AdminFnbItem>(raw, params.limit);
  },
  create: (payload: FnbPayload) => apiClient.post<AdminFnbItem>("/fnb-items", payload),
  update: (id: string, payload: FnbPayload) =>
    apiClient.put<AdminFnbItem>(`/fnb-items/${id}`, payload),
  setActive: (id: string, isActive: boolean) =>
    apiClient.patch(`/fnb-items/${id}/status`, { isActive }),
};

/** API suất chiếu — backend: showtime.controller.ts (showtime:create, showtime:update). */
export const adminShowtimeService = {
  async list(params: {
    page: number;
    limit: number;
    cineplexId?: string;
    movieId?: string;
    date?: string;
    status?: string;
  }): Promise<PageResult<AdminShowtime>> {
    const raw = await apiClient.get<unknown>("/showtimes", { params });
    return toPageResult<AdminShowtime>(raw, params.limit);
  },
  create: (payload: ShowtimePayload) => apiClient.post<AdminShowtime>("/showtimes", payload),
  setStatus: (id: string, status: ShowtimeStatusType) =>
    apiClient.patch(`/showtimes/${id}/status`, { status }),

  async cineplexes(): Promise<Option[]> {
    const raw = await apiClient.get<unknown>("/cineplexes", { params: { limit: 100 } });
    return toPageResult<{ id: number | string; name: string }>(raw, 100).items.map((c) => ({
      id: String(c.id),
      name: c.name,
    }));
  },
  /** GET /auditoriums?cineplexId= — quyền auditorium:view */
  async auditoriums(cineplexId: string): Promise<Option[]> {
    const raw = await apiClient.get<unknown>("/auditoriums", {
      params: { cineplexId, limit: 100 },
    });
    return toPageResult<{ id: number | string; name: string }>(raw, 100).items.map((a) => ({
      id: String(a.id),
      name: a.name,
    }));
  },
  /** Phim còn được xếp suất (backend từ chối phim ENDED). */
  async schedulableMovies(): Promise<(Option & { durationMinutes: number })[]> {
    const lists = await Promise.all(
      (["SHOWING", "UPCOMING"] as const).map((status) =>
        apiClient.get<unknown>("/movies", { params: { status, limit: 100 } }),
      ),
    );
    return lists.flatMap((raw) =>
      toPageResult<{ id: string | number; title: string; durationMinutes: number }>(raw, 100).items.map(
        (m) => ({ id: String(m.id), name: m.title, durationMinutes: m.durationMinutes }),
      ),
    );
  },
};

/** API người dùng — backend: users.controller.ts (user:view, user:create, user:assign_role, user:update_status). */
export const adminUserService = {
  async list(params: {
    page: number;
    limit: number;
    keyword?: string;
    status?: string;
  }): Promise<PageResult<AdminUserListItem>> {
    const raw = await apiClient.get<unknown>("/users", { params });
    return toPageResult<AdminUserListItem>(raw, params.limit);
  },
  detail: (id: string) => apiClient.get<AdminUserDetail>(`/users/${id}`),
  setStatus: (id: string, status: UserStatusType, reason?: string) =>
    apiClient.patch(`/users/${id}/status`, { status, reason }),
  assignRole: (id: string, roleId: string, cineplexId?: string) =>
    apiClient.put(`/users/${id}/role`, { roleId, cineplexId: cineplexId || undefined }),
  createStaff: (v: StaffFormValues) =>
    apiClient.post("/users", {
      fullName: v.fullName.trim(),
      email: v.email.trim(),
      phoneNumber: v.phoneNumber.trim(),
      password: v.password,
      roleId: Number(v.roleId),
      cineplexId: v.cineplexId ? Number(v.cineplexId) : undefined,
    }),
  async roles(): Promise<RoleOption[]> {
    const raw = await apiClient.get<unknown>("/roles");
    return toPageResult<{ id: number | string; code: string; name: string }>(raw, 100).items.map(
      (r) => ({ id: String(r.id), code: r.code, name: r.name }),
    );
  },
};
