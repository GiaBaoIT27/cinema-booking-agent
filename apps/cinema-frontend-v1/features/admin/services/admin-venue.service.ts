import { apiClient } from "@/lib/api-client";
import { toPageResult, type PageResult } from "../utils/pagination";
import type {
  AdminAuditorium,
  AdminCineplex,
  AuditoriumPayload,
  AuditoriumStatusType,
  CineplexPayload,
  CineplexStatusType,
  SeatLayoutItem,
} from "../utils/venue-form";
import type {
  AdminOrderDetail,
  AdminOrderRow,
  OrderSummary,
} from "../utils/order-admin";
import type { Option } from "./admin-catalog.service";

/** Cụm rạp — backend cineplexes.controller.ts (cinema:manage). */
export const adminCineplexService = {
  async list(params: { page: number; limit: number; search?: string; status: string; provinceId?: string }) {
    const raw = await apiClient.get<unknown>("/cineplexes", { params });
    return toPageResult<AdminCineplex>(raw, params.limit);
  },
  create: (p: CineplexPayload) => apiClient.post<AdminCineplex>("/cineplexes", p),
  update: (id: string, p: CineplexPayload) => apiClient.put<AdminCineplex>(`/cineplexes/${id}`, p),
  setStatus: (id: string, status: CineplexStatusType, reason?: string) =>
    apiClient.patch(`/cineplexes/${id}/status`, { status, reason: reason || undefined }),

  async provinces(): Promise<Option[]> {
    const raw = await apiClient.get<unknown>("/provinces", { params: { limit: 100 } });
    return toPageResult<{ id: number; name: string }>(raw, 100).items.map((p) => ({ id: String(p.id), name: p.name }));
  },
  async wards(provinceId: string): Promise<Option[]> {
    const raw = await apiClient.get<unknown>(`/provinces/${provinceId}/wards`, { params: { limit: 100 } });
    return toPageResult<{ id: number; name: string }>(raw, 100).items.map((w) => ({ id: String(w.id), name: w.name }));
  },
};

export interface SeatLayout {
  totalSeats: number;
  gridDimensions: { maxRowsY: number; maxColumnsX: number };
  seats: {
    id: number;
    seatNumber: string;
    coordinates: { x: number; y: number; gridSpan: number };
    seatType: { code: string; colorCode?: string | null };
    status: string;
  }[];
}

/** Phòng chiếu — backend auditoriums.controller.ts (auditorium:view/create/update). */
export const adminAuditoriumService = {
  async list(params: { page: number; limit: number; cineplexId?: string; screenType?: string; status: string }) {
    const raw = await apiClient.get<unknown>("/auditoriums", { params });
    return toPageResult<AdminAuditorium>(raw, params.limit);
  },
  create: (p: AuditoriumPayload) => apiClient.post<AdminAuditorium>("/auditoriums", p),
  update: (id: string, p: AuditoriumPayload) => apiClient.put<AdminAuditorium>(`/auditoriums/${id}`, p),
  setStatus: (id: string, status: AuditoriumStatusType, reason?: string) =>
    apiClient.patch(`/auditoriums/${id}/status`, { status, reason: reason || undefined }),
  seats: (id: string) => apiClient.get<SeatLayout>(`/auditoriums/${id}/seats`),
  /** Chỉ dùng cho phòng chưa có ghế: clearExisting=false để không bao giờ xóa ghế đã bán vé. */
  createSeats: (id: string, items: SeatLayoutItem[]) =>
    apiClient.post(`/auditoriums/${id}/seats/batch`, { clearExisting: false, items }),
  async seatTypes(): Promise<{ id: string; code: string; name: string }[]> {
    const raw = await apiClient.get<unknown>("/seat-types");
    return toPageResult<{ id: string | number; code: string; name: string }>(raw, 100).items.map((t) => ({
      id: String(t.id),
      code: t.code,
      name: t.name,
    }));
  },
};

/** Đơn hàng — endpoint mới GET /admin/orders (order:manage). */
export const adminOrderService = {
  async list(params: {
    page: number;
    limit: number;
    status?: string;
    keyword?: string;
    cineplexId?: string;
    date?: string;
  }): Promise<PageResult<AdminOrderRow> & { summary: OrderSummary }> {
    const raw = await apiClient.get<{
      items: AdminOrderRow[];
      summary: OrderSummary;
      page: { totalItems: number; totalPages: number };
    }>("/admin/orders", { params });
    return {
      items: raw?.items ?? [],
      totalItems: raw?.page?.totalItems ?? 0,
      totalPages: Math.max(1, raw?.page?.totalPages ?? 1),
      summary: raw?.summary ?? { paidCount: 0, paidRevenue: 0 },
    };
  },
  detail: (id: number) => apiClient.get<AdminOrderDetail>(`/admin/orders/${id}`),
};
