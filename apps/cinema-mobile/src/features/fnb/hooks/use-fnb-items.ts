import { useQuery } from "@tanstack/react-query";
import { fnbService } from "../services/fnb.service";
import type { FnbItem } from "../types/fnb.types";
import { groupFnbByCategory } from "../utils/fnb-adapter";

const select = (items: FnbItem[]) => ({
  items,
  groups: groupFnbByCategory(items),
});

/** Mặc định chỉ lấy sản phẩm đang kinh doanh, tối đa 100. Thực đơn ít đổi nên cache 5 phút. */
export function useFnbItems() {
  return useQuery({
    queryKey: ["fnb-items", { isActive: true, limit: 100 }] as const,
    queryFn: ({ signal }) =>
      fnbService.getItems({ isActive: true, limit: 100 }, signal),
    select,
    staleTime: 5 * 60 * 1000,
  });
}
