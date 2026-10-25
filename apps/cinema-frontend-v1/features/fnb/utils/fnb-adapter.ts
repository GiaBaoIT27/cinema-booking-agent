import type { ComboItem } from "../components/combo-card";
import type { FnbCategory, FnbItem } from "../types/fnb.type";

/** Thứ tự hiển thị các nhóm; nhóm lạ (backend thêm sau) xếp cuối */
const CATEGORY_ORDER: string[] = ["COMBO", "POPCORN", "BEVERAGE", "SNACK"];

const CATEGORY_LABELS: Record<FnbCategory, string> = {
  COMBO: "Combo",
  POPCORN: "Bắp rang",
  BEVERAGE: "Nước uống",
  SNACK: "Đồ ăn vặt",
};

export interface FnbCategoryGroup {
  category: string;
  label: string;
  items: FnbItem[];
}

/** FnbItem (backend) → ComboItem (props của ComboCard) */
export function toComboItem(item: FnbItem): ComboItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    price: Number(item.basePrice) || 0,
    imageUrl: item.imageUrl || null,
  };
}

/** Gom sản phẩm theo nhóm, giữ nguyên thứ tự backend trong từng nhóm */
export function groupFnbByCategory(items: FnbItem[]): FnbCategoryGroup[] {
  const map = new Map<string, FnbItem[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }

  const rank = (category: string) => {
    const index = CATEGORY_ORDER.indexOf(category);
    return index === -1 ? CATEGORY_ORDER.length : index;
  };

  return Array.from(map.entries())
    .map(([category, groupItems]) => ({
      category,
      label: CATEGORY_LABELS[category as FnbCategory] ?? category,
      items: groupItems,
    }))
    .sort(
      (a, b) =>
        rank(a.category) - rank(b.category) ||
        a.category.localeCompare(b.category),
    );
}
