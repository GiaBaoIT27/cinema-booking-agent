"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { toPageResult } from "../utils/pagination";

/**
 * Đếm số bản ghi khớp bộ lọc bằng chính API danh sách (limit=1, chỉ đọc tổng trong pagination),
 * nên không cần thêm endpoint thống kê ở backend.
 */
export async function countOf(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<number> {
  const raw = await apiClient.get<unknown>(path, { params: { ...params, page: 1, limit: 1 } });
  return toPageResult(raw, 1).totalItems;
}

/** Lấy toàn bộ bản ghi (lặp từng trang 100) để cộng dồn, ví dụ tổng sức chứa phòng, tổng lượt dùng voucher. */
export async function fetchAll<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  maxPages = 20,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const raw = await apiClient.get<unknown>(path, { params: { ...params, page, limit: 100 } });
    const res = toPageResult<T>(raw, 100);
    all.push(...res.items);
    if (page >= res.totalPages || res.items.length === 0) break;
  }
  return all;
}

/** Ngày hôm nay theo giờ máy, dạng YYYY-MM-DD (khớp input type="date"). */
export function todayLocal(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export type StatLoaders = Record<string, () => Promise<number | string>>;

/**
 * Tải song song các số liệu; một số liệu lỗi không làm hỏng các số còn lại (hiện "—").
 * `version` đổi (sau khi thêm/sửa/xóa) thì tải lại.
 */
export function useStats(loaders: StatLoaders, version: unknown) {
  const [state, setState] = useState<{ values: Record<string, number | string | null> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const keys = Object.keys(loaders);
    Promise.allSettled(keys.map((k) => loaders[k]())).then((results) => {
      if (cancelled) return;
      const values: Record<string, number | string | null> = {};
      results.forEach((r, i) => {
        values[keys[i]] = r.status === "fulfilled" ? r.value : null;
      });
      setState({ values });
    });
    return () => {
      cancelled = true;
    };
    // loaders là object tạo mới mỗi render; chỉ tải lại khi version đổi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  // Khi tải lại vẫn giữ số cũ trên màn hình (không nhấp nháy). undefined = lần đầu đang tải, null = lỗi
  return (key: string): number | string | null | undefined => state?.values[key];
}
