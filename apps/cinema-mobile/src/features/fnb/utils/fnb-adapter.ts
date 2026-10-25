import type {
  FnbCategory,
  FnbCategoryGroup,
  FnbItem,
} from "../types/fnb.types";

/** Thứ tự nhóm; nhóm lạ (backend thêm sau) xếp cuối. */
const CATEGORY_ORDER: string[] = ["COMBO", "POPCORN", "BEVERAGE", "SNACK"];

const CATEGORY_LABELS: Record<FnbCategory, string> = {
  COMBO: "Combo",
  POPCORN: "Bắp rang",
  BEVERAGE: "Nước uống",
  SNACK: "Đồ ăn vặt",
};

export const fnbPrice = (item: FnbItem) => Number(item.basePrice) || 0;

export function groupFnbByCategory(items: FnbItem[]): FnbCategoryGroup[] {
  const map = new Map<string, FnbItem[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  const rank = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return Array.from(map.entries())
    .map(([category, items]) => ({
      category,
      label: CATEGORY_LABELS[category as FnbCategory] ?? category,
      items,
    }))
    .sort(
      (a, b) =>
        rank(a.category) - rank(b.category) ||
        a.category.localeCompare(b.category),
    );
}
