import { apiClient } from "@/lib/api-client";
import { toPageResult } from "../utils/pagination";
import type {
  AdminDistributor,
  AdminPromotion,
  AdminSeatType,
  DistributorPayload,
  DistributorStatusType,
  PromotionPayload,
  SeatTypePayload,
} from "../utils/master-data-form";

/** Loại ghế — seat-type.controller.ts (seat_type:create/update/delete). */
export const adminSeatTypeService = {
  async list(): Promise<AdminSeatType[]> {
    const raw = await apiClient.get<unknown>("/seat-types");
    return toPageResult<AdminSeatType>(raw, 100).items.sort((a, b) => a.displayOrder - b.displayOrder);
  },
  create: (p: SeatTypePayload) => apiClient.post<AdminSeatType>("/seat-types", p),
  update: (id: string, p: SeatTypePayload) => apiClient.put<AdminSeatType>(`/seat-types/${id}`, p),
  remove: (id: string) => apiClient.delete<void>(`/seat-types/${id}`),
};

/** Nhà phát hành — distributors.controller.ts (distributor:view/create/update). */
export const adminDistributorService = {
  async list(params: { page: number; limit: number; name?: string; status?: string }) {
    const raw = await apiClient.get<unknown>("/distributors", { params });
    return toPageResult<AdminDistributor>(raw, params.limit);
  },
  create: (p: DistributorPayload) => apiClient.post<AdminDistributor>("/distributors", p),
  update: (id: string, p: DistributorPayload) => apiClient.put<AdminDistributor>(`/distributors/${id}`, p),
  setStatus: (id: string, status: DistributorStatusType) =>
    apiClient.patch(`/distributors/${id}/status`, { status }),
  async movies(id: string): Promise<{ id: string; title: string; status: string }[]> {
    const raw = await apiClient.get<unknown>(`/distributors/${id}/movies`, { params: { limit: 100 } });
    return toPageResult<{ id: string | number; title: string; status: string }>(raw, 100).items.map((m) => ({
      ...m,
      id: String(m.id),
    }));
  },
};

/** Khuyến mãi — promotions.controller.ts (promo:view/create/update). */
export const adminPromotionService = {
  async list(params: { page: number; limit: number; code?: string; discountType?: string; isActive?: boolean }) {
    const raw = await apiClient.get<unknown>("/promotions", { params });
    return toPageResult<AdminPromotion>(raw, params.limit);
  },
  create: (p: PromotionPayload) => apiClient.post<AdminPromotion>("/promotions", p),
  update: (id: string, p: PromotionPayload) => apiClient.put<AdminPromotion>(`/promotions/${id}`, p),
  setActive: (id: string, isActive: boolean) => apiClient.patch(`/promotions/${id}/status`, { isActive }),
};
