"use client";

import { useEffect, useState } from "react";
import { BadgePercent, Pencil, Plus, Sofa, Trash2, Users } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/use-auth-store";
import { adminSeatTypeService } from "../services/admin-master.service";
import { hasPermission } from "../utils/admin-access";
import { formatVnd } from "../utils/pagination";
import {
  emptySeatTypeForm,
  seatPrice,
  seatTypeToForm,
  validateSeatTypeForm,
  type AdminSeatType,
  type SeatTypeFormValues,
} from "../utils/master-data-form";
import {
  Field,
  Modal,
  Notice,
  PageHeader,
  Toolbar,
  errorText,
  inputClass,
  primaryBtn,
  secondaryBtn,
  toolbarBtn,
  StatCards,
} from "./admin-ui";

/** Giá gốc minh họa để admin thấy ngay hệ số + phụ thu ra giá bao nhiêu. */
const SAMPLE_BASE = 90000;

export function AdminSeatTypePage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = hasPermission(user, "seat_type:create");
  const canUpdate = hasPermission(user, "seat_type:update");
  const canDelete = hasPermission(user, "seat_type:delete");

  const [items, setItems] = useState<AdminSeatType[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<AdminSeatType | "new" | null>(null);
  const [notice, setNotice] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminSeatTypeService
      .list()
      .then((l) => !cancelled && setItems(l))
      .catch(
        (e: unknown) =>
          !cancelled && setLoadError(errorText(e, "Không tải được loại ghế")),
      );
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const remove = async (t: AdminSeatType) => {
    if (!window.confirm(`Xóa loại ghế “${t.name}”?`)) return;
    setNotice(null);
    try {
      await adminSeatTypeService.remove(t.id);
      setNotice({ kind: "success", text: `Đã xóa loại ghế “${t.name}”` });
      setReload((n) => n + 1);
    } catch (e) {
      // SEAT_TYPE_HAS_ASSOCIATED_SEATS: loại ghế đang được dùng trong sơ đồ phòng
      setNotice({ kind: "error", text: errorText(e) });
    }
  };

  const multiSeat = items?.filter((t) => t.seatCount > 1).length;
  const priciest = items?.length
    ? items.reduce((a, b) => (seatPrice(SAMPLE_BASE, Number(b.priceMultiplier), Number(b.surchargeAmount)) > seatPrice(SAMPLE_BASE, Number(a.priceMultiplier), Number(a.surchargeAmount)) ? b : a))
    : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Loại ghế"
        subtitle={`${items?.length ?? 0} loại · giá ghế = giá gốc × hệ số + phụ thu`}
      />

      <StatCards
        items={[
          { label: "Số loại ghế", value: items ? items.length : loadError ? null : undefined, tone: "red", icon: Sofa },
          { label: "Ghế nhiều chỗ", value: items ? multiSeat : loadError ? null : undefined, tone: "violet", icon: Users, hint: "ghế đôi, sofa…" },
          {
            label: "Giá cao nhất (ví dụ)",
            value: priciest ? formatVnd(seatPrice(SAMPLE_BASE, Number(priciest.priceMultiplier), Number(priciest.surchargeAmount))) : items ? "—" : undefined,
            tone: "amber",
            icon: BadgePercent,
            hint: priciest ? `${priciest.name} · giá gốc ${formatVnd(SAMPLE_BASE)}` : undefined,
          },
        ]}
      />

      <Toolbar
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className={toolbarBtn}
            >
              <Plus size={16} /> Thêm loại ghế
            </button>
          )
        }
      >
        <p className="px-2 text-xs text-[#9CA3AF]">
          Ví dụ giá với suất có giá gốc {formatVnd(SAMPLE_BASE)}
        </p>
      </Toolbar>

      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      {loadError && <Notice kind="error">{loadError}</Notice>}

      <div className="overflow-x-auto rounded-xl border border-[#1F2937]">
        <table className="w-full min-w-190 text-sm">
          <thead className="bg-[#0B0F19] text-left text-xs uppercase tracking-wide text-[#6B7280]">
            <tr>
              <th className="px-4 py-3">Loại ghế</th>
              <th className="px-4 py-3 text-right">Hệ số</th>
              <th className="px-4 py-3 text-right">Phụ thu</th>
              <th className="px-4 py-3 text-right">Giá ví dụ</th>
              <th className="px-4 py-3 text-right">Số chỗ</th>
              <th className="px-4 py-3 text-right">Thứ tự</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2937]">
            {!items && !loadError && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-[#6B7280]"
                >
                  Đang tải...
                </td>
              </tr>
            )}
            {items?.map((t) => (
              <tr key={t.id} className="hover:bg-[#0B0F19]/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-6 w-6 shrink-0 rounded"
                      style={{ background: t.colorCode }}
                    />
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-[#6B7280]">{t.code}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  × {Number(t.priceMultiplier).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatVnd(t.surchargeAmount)}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatVnd(
                    seatPrice(
                      SAMPLE_BASE,
                      Number(t.priceMultiplier),
                      Number(t.surchargeAmount),
                    ),
                  )}
                </td>
                <td className="px-4 py-3 text-right">{t.seatCount}</td>
                <td className="px-4 py-3 text-right text-[#9CA3AF]">
                  {t.displayOrder}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => setEditing(t)}
                        className="rounded p-2 text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white"
                        title="Sửa"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => remove(t)}
                        className="rounded p-2 text-[#9CA3AF] hover:bg-red-950/40 hover:text-red-400"
                        title="Xóa"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <SeatTypeFormModal
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(name) => {
            setEditing(null);
            setNotice({ kind: "success", text: `Đã lưu loại ghế “${name}”` });
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

function SeatTypeFormModal({
  item,
  onClose,
  onSaved,
}: {
  item: AdminSeatType | null;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [values, setValues] = useState<SeatTypeFormValues>(
    item ? seatTypeToForm(item) : emptySeatTypeForm,
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof SeatTypeFormValues, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof SeatTypeFormValues>(
    k: K,
    v: SeatTypeFormValues[K],
  ) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const preview = seatPrice(
    SAMPLE_BASE,
    Number(values.priceMultiplier) || 0,
    Number(values.surchargeAmount) || 0,
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const check = validateSeatTypeForm(values);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setSaving(true);
    try {
      if (item) await adminSeatTypeService.update(item.id, check.payload);
      else await adminSeatTypeService.create(check.payload);
      onSaved(check.payload.name);
    } catch (err) {
      if (err instanceof ApiError) {
        const fe: typeof errors = {};
        for (const x of err.errors ?? [])
          if (x.field && x.field in emptySeatTypeForm)
            fe[x.field as keyof SeatTypeFormValues] = x.message;
        setErrors(fe);
      }
      setFormError(errorText(err, "Lưu loại ghế thất bại"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={item ? `Sửa “${item.name}”` : "Thêm loại ghế"}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && <Notice kind="error">{formError}</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên loại ghế" required error={errors.name}>
            <input
              className={inputClass(errors.name)}
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field label="Mã" required error={errors.code}>
            <input
              className={inputClass(errors.code)}
              placeholder="ROYAL_BED"
              value={values.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
            />
          </Field>
          <Field
            label="Hệ số giá (1.00–10.00)"
            required
            error={errors.priceMultiplier}
          >
            <input
              inputMode="decimal"
              className={inputClass(errors.priceMultiplier)}
              value={values.priceMultiplier}
              onChange={(e) => set("priceMultiplier", e.target.value)}
            />
          </Field>
          <Field label="Phụ thu (VND)" required error={errors.surchargeAmount}>
            <input
              inputMode="numeric"
              className={inputClass(errors.surchargeAmount)}
              value={values.surchargeAmount}
              onChange={(e) => set("surchargeAmount", e.target.value)}
            />
          </Field>
          <Field
            label="Số chỗ mỗi ghế (ghế đôi = 2)"
            required
            error={errors.seatCount}
          >
            <select
              className={inputClass(errors.seatCount)}
              value={values.seatCount}
              onChange={(e) => set("seatCount", e.target.value)}
            >
              {["1", "2", "3", "4"].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Màu trên sơ đồ" required error={errors.colorCode}>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label="Chọn màu"
                className="h-10 w-12 shrink-0 cursor-pointer rounded border border-[#1F2937] bg-transparent"
                value={
                  /^#[0-9A-Fa-f]{6}$/.test(values.colorCode)
                    ? values.colorCode
                    : "#C0C0C0"
                }
                onChange={(e) => set("colorCode", e.target.value.toUpperCase())}
              />
              <input
                className={inputClass(errors.colorCode)}
                value={values.colorCode}
                onChange={(e) => set("colorCode", e.target.value)}
              />
            </div>
          </Field>
          <Field label="Thứ tự hiển thị" required error={errors.displayOrder}>
            <input
              inputMode="numeric"
              className={inputClass(errors.displayOrder)}
              value={values.displayOrder}
              onChange={(e) => set("displayOrder", e.target.value)}
            />
          </Field>
          <Field
            label="Mô tả"
            error={errors.description}
            className="sm:col-span-2"
          >
            <input
              maxLength={255}
              className={inputClass(errors.description)}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
        </div>
        <p className="text-xs text-[#9CA3AF]">
          Với suất có giá gốc {formatVnd(SAMPLE_BASE)}, ghế loại này có giá{" "}
          <span className="font-medium text-white">{formatVnd(preview)}</span>.
          Giá mới chỉ áp dụng cho suất chiếu sinh bảng giá sau khi lưu.
        </p>
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
