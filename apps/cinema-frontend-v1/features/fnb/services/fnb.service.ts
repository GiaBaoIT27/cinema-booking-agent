import { apiClient } from "@/lib/api-client";
import type { FnbItem, GetFnbItemsParams } from "../types/fnb.type";

/**
 * Tuỳ phiên bản backend, `data` có thể là mảng sản phẩm trực tiếp
 * hoặc object bọc ngoài ({ items, pagination } / { data, pagination }).
 */
type RawFnbItemsResponse =
  | FnbItem[]
  | { items?: FnbItem[]; data?: FnbItem[] }
  | null
  | undefined;

export const fnbService = {
  /**
   * Lấy danh sách sản phẩm F&B
   * GET /api/v1/fnb-items
   */
  async getItems(params?: GetFnbItemsParams): Promise<FnbItem[]> {
    const raw = await apiClient.get<RawFnbItemsResponse>("/fnb-items", {
      params: {
        category: params?.category,
        type: params?.type,
        // Backend đọc `isActive` (không phải `active`)
        isActive: params?.isActive,
        page: params?.page,
        limit: params?.limit,
      },
    });

    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.items)) return raw.items;
    if (raw && Array.isArray(raw.data)) return raw.data;
    return [];
  },
};
