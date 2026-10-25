import { apiClient } from "@/lib/api-client";
import type { FnbItem, GetFnbItemsParams } from "../types/fnb.types";

type RawFnbItemsResponse =
  | FnbItem[]
  | { items?: FnbItem[]; data?: FnbItem[] }
  | null
  | undefined;

export const fnbService = {
  /** GET /api/v1/fnb-items */
  async getItems(
    params?: GetFnbItemsParams,
    signal?: AbortSignal,
  ): Promise<FnbItem[]> {
    const raw = await apiClient.get<RawFnbItemsResponse>("/fnb-items", {
      params: {
        category: params?.category,
        type: params?.type,
        // Backend đọc `isActive` (không phải `active`)
        isActive: params?.isActive,
        page: params?.page,
        limit: params?.limit,
      },
      signal,
    });
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.items)) return raw.items;
    if (raw && Array.isArray(raw.data)) return raw.data;
    return [];
  },
};
