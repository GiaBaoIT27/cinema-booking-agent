import { z } from "zod";

export const FNB_CATEGORIES = ["POPCORN", "BEVERAGE", "SNACK", "COMBO"] as const;
export const FNB_TYPES = ["SINGLE", "COMBO"] as const;

export const FNB_CATEGORY_LABEL: Record<(typeof FNB_CATEGORIES)[number], string> = {
  POPCORN: "Bắp rang",
  BEVERAGE: "Nước uống",
  SNACK: "Đồ ăn vặt",
  COMBO: "Combo",
};

export const FNB_TYPE_LABEL: Record<(typeof FNB_TYPES)[number], string> = {
  SINGLE: "Món lẻ",
  COMBO: "Combo",
};

export interface AdminFnbItem {
  id: string;
  sku: string;
  name: string;
  type: string;
  category: string;
  unit: string;
  basePrice: number | string;
  imageUrl: string | null;
  description: string | null;
  isActive: boolean;
}

/** Khớp CreateFnbItemDto ở backend. */
export const fnbFormSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(3, "SKU từ 3 đến 50 ký tự")
    .max(50, "SKU từ 3 đến 50 ký tự")
    .regex(/^[A-Z0-9-]+$/, "Chỉ gồm chữ in hoa, số và dấu gạch ngang"),
  name: z.string().trim().min(2, "Tên từ 2 đến 150 ký tự").max(150, "Tên từ 2 đến 150 ký tự"),
  type: z.enum(FNB_TYPES),
  category: z.enum(FNB_CATEGORIES),
  unit: z.string().trim().min(1, "Nhập đơn vị tính").max(20, "Tối đa 20 ký tự"),
  basePrice: z
    .string()
    .regex(/^\d+$/, "Giá phải là số nguyên không âm (VND)"),
  imageUrl: z
    .string()
    .trim()
    .max(500, "Tối đa 500 ký tự")
    .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "URL không hợp lệ"),
  description: z.string().trim(),
  isActive: z.boolean(),
});

export type FnbFormValues = z.input<typeof fnbFormSchema>;
export type FnbFormErrors = Partial<Record<keyof FnbFormValues, string>>;

export const emptyFnbForm: FnbFormValues = {
  sku: "",
  name: "",
  type: "SINGLE",
  category: "POPCORN",
  unit: "PHẦN",
  basePrice: "",
  imageUrl: "",
  description: "",
  isActive: true,
};

export function fnbItemToForm(item: AdminFnbItem): FnbFormValues {
  return {
    sku: item.sku,
    name: item.name,
    type: (FNB_TYPES as readonly string[]).includes(item.type) ? (item.type as FnbFormValues["type"]) : "SINGLE",
    category: (FNB_CATEGORIES as readonly string[]).includes(item.category)
      ? (item.category as FnbFormValues["category"])
      : "POPCORN",
    unit: item.unit ?? "PHẦN",
    basePrice: String(Math.round(Number(item.basePrice))),
    imageUrl: item.imageUrl ?? "",
    description: item.description ?? "",
    isActive: item.isActive,
  };
}

export function validateFnbForm(values: FnbFormValues):
  | { ok: true; payload: FnbPayload }
  | { ok: false; errors: FnbFormErrors } {
  const parsed = fnbFormSchema.safeParse(values);
  if (!parsed.success) {
    const errors: FnbFormErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof FnbFormValues;
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }
  const v = parsed.data;
  return {
    ok: true,
    payload: {
      sku: v.sku,
      name: v.name,
      type: v.type,
      category: v.category,
      unit: v.unit,
      basePrice: Number(v.basePrice),
      imageUrl: v.imageUrl || undefined,
      description: v.description || undefined,
      isActive: v.isActive,
    },
  };
}

export interface FnbPayload {
  sku: string;
  name: string;
  type: string;
  category: string;
  unit: string;
  basePrice: number;
  imageUrl?: string;
  description?: string;
  isActive: boolean;
}
