"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/use-auth-store";
import { usePaged } from "../hooks/use-paged";
import { adminPromotionService } from "../services/admin-master.service";
import { hasPermission } from "../utils/admin-access";
import { formatVnd } from "../utils/pagination";
import { formatDateTime } from "../utils/showtime-form";
import {
  PROMOTION_PHASE_LABEL,
  emptyPromotionForm,
  promotionPhase,
  promotionToForm,
  validatePromotionForm,
  type AdminPromotion,
  type DiscountType,
  type PromotionFormValues,
  type PromotionPhase,
} from "../utils/master-data-form";
import {
  Badge,
  ClearFilters,
  Field,
  Modal,
  Notice,
  PageHeader,
  Pager,
  SearchBox,
  Toolbar,
  errorText,
  filterClass,
  inputClass,
  primaryBtn,
  secondaryBtn,
  toolbarBtn,
} from "./admin-ui";

const PAGE_SIZE = 10;
const PHASE_TONE: Record<
  PromotionPhase,
  "green" | "blue" | "gray" | "amber" | "red"
> = {
  RUNNING: "green",
  UPCOMING: "blue",
  DISABLED: "gray",
  EXHAUSTED: "amber",
  EXPIRED: "red",
};

const describeDiscount = (p: AdminPromotion) =>
  p.discountType === "PERCENTAGE"
    ? `Giảm ${Number(p.discountValue)}%${p.maxDiscountAmount !== null ? `, tối đa ${formatVnd(p.maxDiscountAmount)}` : ""}`
    : `Giảm ${formatVnd(p.discountValue)}`;

export function AdminPromotionPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = hasPermission(user, "promo:create");
  const canUpdate = hasPermission(user, "promo:update");

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminPromotion | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  const { items, totalItems, totalPages, isLoading, error, refetch } =
    usePaged<AdminPromotion>([code, discountType, active, page].join("|"), () =>
      adminPromotionService.list({
        page,
        limit: PAGE_SIZE,
        code: code || undefined,
        discountType: discountType || undefined,
        isActive: active === "" ? undefined : active === "true",
      }),
    );

  const toggle = async (p: AdminPromotion) => {
    setBusyId(p.id);
    setNotice(null);
    try {
      await adminPromotionService.setActive(p.id, !p.isActive);
      setNotice({
        kind: "success",
        text: `${p.isActive ? "Đã tắt" : "Đã bật"} mã ${p.code}`,
      });
      refetch();
    } catch (e) {
      setNotice({ kind: "error", text: errorText(e) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Khuyến mãi" subtitle={`${totalItems} mã voucher`} />

      <Toolbar
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className={toolbarBtn}
            >
              <Plus size={16} /> Tạo mã
            </button>
          )
        }
      >
        <SearchBox
          value={code}
          placeholder="Tìm theo mã voucher..."
          onSearch={(v) => {
            setPage(1);
            setCode(v.toUpperCase());
          }}
        />
        <select
          aria-label="Kiểu giảm"
          value={discountType}
          onChange={(e) => {
            setPage(1);
            setDiscountType(e.target.value);
          }}
          className={filterClass}
        >
          <option value="">Mọi kiểu giảm</option>
          <option value="PERCENTAGE">Theo %</option>
          <option value="FIXED_AMOUNT">Số tiền cố định</option>
        </select>
        <select
          aria-label="Bật/tắt"
          value={active}
          onChange={(e) => {
            setPage(1);
            setActive(e.target.value as typeof active);
          }}
          className={filterClass}
        >
          <option value="">Bật và tắt</option>
          <option value="true">Đang bật</option>
          <option value="false">Đang tắt</option>
        </select>
        <ClearFilters
          show={!!(code || discountType || active)}
          onClear={() => {
            setPage(1);
            setCode("");
            setDiscountType("");
            setActive("");
          }}
        />
      </Toolbar>

      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      {error && <Notice kind="error">Không tải được danh sách: {error}</Notice>}

      <div className="overflow-x-auto rounded-xl border border-[#1F2937]">
        <table className="w-full min-w-220 text-sm">
          <thead className="bg-[#0B0F19] text-left text-xs uppercase tracking-wide text-[#6B7280]">
            <tr>
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Ưu đãi</th>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Lượt dùng</th>
              <th className="px-4 py-3">Hiệu lực</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2937]">
            {isLoading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-[#6B7280]"
                >
                  Đang tải...
                </td>
              </tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-[#6B7280]"
                >
                  Không có mã nào khớp bộ lọc.
                </td>
              </tr>
            )}
            {!isLoading &&
              items.map((p) => {
                const phase = promotionPhase(p);
                const pct = p.usageLimit
                  ? Math.min(
                      100,
                      Math.round((p.usedCount / p.usageLimit) * 100),
                    )
                  : null;
                return (
                  <tr
                    key={p.id}
                    className={
                      busyId === p.id ? "opacity-50" : "hover:bg-[#0B0F19]/60"
                    }
                  >
                    <td className="px-4 py-3 font-mono font-medium">
                      {p.code}
                    </td>
                    <td className="px-4 py-3 text-[#D1D5DB]">
                      <p>{describeDiscount(p)}</p>
                      <p className="text-xs text-[#6B7280]">
                        Đơn từ {formatVnd(p.minOrderAmount)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#9CA3AF]">
                      <p>{formatDateTime(p.startDate)}</p>
                      <p>→ {formatDateTime(p.endDate)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[#D1D5DB]">
                        {p.usedCount}
                        {p.usageLimit
                          ? ` / ${p.usageLimit}`
                          : " · không giới hạn"}
                      </p>
                      {pct !== null && (
                        <div className="mt-1 h-1 w-24 overflow-hidden rounded bg-[#1F2937]">
                          <div
                            className="h-full bg-[#EF4444]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={PHASE_TONE[phase]}>
                        {PROMOTION_PHASE_LABEL[phase]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {canUpdate && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => toggle(p)}
                            className="rounded px-2 py-1 text-xs text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white"
                          >
                            {p.isActive ? "Tắt" : "Bật"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(p)}
                            className="rounded p-2 text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white"
                            title="Sửa"
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <Pager page={page} totalPages={totalPages} onChange={setPage} />

      {editing && (
        <PromotionFormModal
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(c) => {
            setEditing(null);
            setNotice({ kind: "success", text: `Đã lưu mã ${c}` });
            refetch();
          }}
        />
      )}
    </div>
  );
}

function PromotionFormModal({
  item,
  onClose,
  onSaved,
}: {
  item: AdminPromotion | null;
  onClose: () => void;
  onSaved: (code: string) => void;
}) {
  const [values, setValues] = useState<PromotionFormValues>(
    item ? promotionToForm(item) : emptyPromotionForm,
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof PromotionFormValues, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isPct = values.discountType === "PERCENTAGE";

  const set = <K extends keyof PromotionFormValues>(
    k: K,
    v: PromotionFormValues[K],
  ) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const check = validatePromotionForm(values);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setSaving(true);
    try {
      if (item) await adminPromotionService.update(item.id, check.payload);
      else await adminPromotionService.create(check.payload);
      onSaved(check.payload.code);
    } catch (err) {
      if (err instanceof ApiError) {
        const map: Record<string, keyof PromotionFormValues> = {
          startDate: "startLocal",
          endDate: "endLocal",
        };
        const fe: typeof errors = {};
        for (const x of err.errors ?? []) {
          const key = x.field ? (map[x.field] ?? x.field) : undefined;
          if (key && key in emptyPromotionForm)
            fe[key as keyof PromotionFormValues] = x.message;
        }
        setErrors(fe);
      }
      setFormError(errorText(err, "Lưu mã khuyến mãi thất bại"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={item ? `Sửa mã ${item.code}` : "Tạo mã khuyến mãi"}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && <Notice kind="error">{formError}</Notice>}
        {item && item.usedCount > 0 && (
          <p className="rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
            Mã đã được dùng {item.usedCount} lần. Sửa giá trị giảm chỉ ảnh hưởng
            các đơn tạo sau khi lưu.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mã voucher" required error={errors.code}>
            <input
              className={`${inputClass(errors.code)} font-mono`}
              placeholder="TET2027"
              value={values.code}
              onChange={(e) =>
                set("code", e.target.value.toUpperCase().replace(/\s/g, ""))
              }
            />
          </Field>
          <Field label="Kiểu giảm" required>
            <select
              className={inputClass()}
              value={values.discountType}
              onChange={(e) =>
                set("discountType", e.target.value as DiscountType)
              }
            >
              <option value="FIXED_AMOUNT">Số tiền cố định</option>
              <option value="PERCENTAGE">Theo phần trăm</option>
            </select>
          </Field>
          <Field
            label={isPct ? "Phần trăm giảm (%)" : "Số tiền giảm (VND)"}
            required
            error={errors.discountValue}
          >
            <input
              inputMode="decimal"
              className={inputClass(errors.discountValue)}
              value={values.discountValue}
              onChange={(e) => set("discountValue", e.target.value)}
            />
          </Field>
          <Field
            label="Giảm tối đa (VND)"
            required={isPct}
            error={errors.maxDiscountAmount}
          >
            <input
              inputMode="numeric"
              disabled={!isPct}
              placeholder={isPct ? "" : "Chỉ dùng khi giảm theo %"}
              className={inputClass(errors.maxDiscountAmount)}
              value={isPct ? values.maxDiscountAmount : ""}
              onChange={(e) => set("maxDiscountAmount", e.target.value)}
            />
          </Field>
          <Field
            label="Đơn tối thiểu (VND)"
            required
            error={errors.minOrderAmount}
          >
            <input
              inputMode="numeric"
              className={inputClass(errors.minOrderAmount)}
              value={values.minOrderAmount}
              onChange={(e) => set("minOrderAmount", e.target.value)}
            />
          </Field>
          <Field label="Tổng lượt dùng" error={errors.usageLimit}>
            <input
              inputMode="numeric"
              placeholder="Để trống = không giới hạn"
              className={inputClass(errors.usageLimit)}
              value={values.usageLimit}
              onChange={(e) => set("usageLimit", e.target.value)}
            />
          </Field>
          <Field label="Bắt đầu" required error={errors.startLocal}>
            <input
              type="datetime-local"
              className={`${inputClass(errors.startLocal)} scheme:dark`}
              value={values.startLocal}
              onChange={(e) => set("startLocal", e.target.value)}
            />
          </Field>
          <Field label="Kết thúc" required error={errors.endLocal}>
            <input
              type="datetime-local"
              className={`${inputClass(errors.endLocal)} scheme:dark`}
              value={values.endLocal}
              onChange={(e) => set("endLocal", e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-[#D1D5DB]">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="accent-[#EF4444]"
            />
            Bật ngay sau khi lưu
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Hủy
          </button>
          <button type="submit" disabled={saving} className={primaryBtn}>
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
