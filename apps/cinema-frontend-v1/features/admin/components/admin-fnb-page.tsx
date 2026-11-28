"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/use-auth-store";
import { usePaged } from "../hooks/use-paged";
import { adminFnbService } from "../services/admin-catalog.service";
import { hasPermission } from "../utils/admin-access";
import { formatVnd } from "../utils/pagination";
import {
  FNB_CATEGORIES,
  FNB_CATEGORY_LABEL,
  FNB_TYPES,
  FNB_TYPE_LABEL,
  emptyFnbForm,
  fnbItemToForm,
  validateFnbForm,
  type AdminFnbItem,
  type FnbFormErrors,
  type FnbFormValues,
} from "../utils/fnb-form";
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

export function AdminFnbPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = hasPermission(user, "fnb:create");
  const canUpdate = hasPermission(user, "fnb:update");

  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminFnbItem | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const { items, totalItems, totalPages, isLoading, error, refetch } = usePaged<AdminFnbItem>(
    [keyword, category, active, page].join("|"),
    () =>
      adminFnbService.list({
        page,
        limit: PAGE_SIZE,
        keyword: keyword || undefined,
        category: category || undefined,
        isActive: active === "" ? undefined : active === "true",
      }),
  );

  const toggleActive = async (item: AdminFnbItem) => {
    setBusyId(item.id);
    setNotice(null);
    try {
      await adminFnbService.setActive(item.id, !item.isActive);
      setNotice({ kind: "success", text: `${item.isActive ? "Đã ngừng bán" : "Đã mở bán lại"} “${item.name}”` });
      refetch();
    } catch (err) {
      setNotice({ kind: "error", text: errorText(err) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Bắp nước" subtitle={`${totalItems} món`} />

      <Toolbar
        actions={
          canCreate && (
            <button type="button" onClick={() => setEditing("new")} className={toolbarBtn}>
              <Plus size={16} /> Thêm món
            </button>
          )
        }
      >
        <SearchBox value={keyword} placeholder="Tìm theo tên hoặc SKU..." onSearch={(v) => { setPage(1); setKeyword(v); }} />
        <select aria-label="Nhóm món" value={category} onChange={(e) => { setPage(1); setCategory(e.target.value); }} className={filterClass}>
          <option value="">Tất cả nhóm</option>
          {FNB_CATEGORIES.map((c) => (
            <option key={c} value={c}>{FNB_CATEGORY_LABEL[c]}</option>
          ))}
        </select>
        <select aria-label="Trạng thái bán" value={active} onChange={(e) => { setPage(1); setActive(e.target.value as typeof active); }} className={filterClass}>
          <option value="">Mọi trạng thái</option>
          <option value="true">Đang bán</option>
          <option value="false">Ngừng bán</option>
        </select>
        <ClearFilters show={!!(keyword || category || active)} onClear={() => { setPage(1); setKeyword(""); setCategory(""); setActive(""); }} />
      </Toolbar>

      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      {error && <Notice kind="error">Không tải được danh sách: {error}</Notice>}

      <div className="overflow-x-auto rounded-xl border border-[#1F2937]">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[#0B0F19] text-left text-xs uppercase tracking-wide text-[#6B7280]">
            <tr>
              <th className="px-4 py-3">Món</th>
              <th className="px-4 py-3">Nhóm</th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3 text-right">Giá</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2937]">
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[#6B7280]">Đang tải...</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[#6B7280]">Không có món nào khớp bộ lọc.</td></tr>
            )}
            {!isLoading &&
              items.map((item) => (
                <tr key={item.id} className={busyId === item.id ? "opacity-50" : "hover:bg-[#0B0F19]/60"}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- ảnh có thể ở domain bất kỳ do admin nhập
                        <img src={item.imageUrl} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-[#1F2937]" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="text-xs text-[#6B7280]">{item.sku} · {item.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#D1D5DB]">{FNB_CATEGORY_LABEL[item.category as keyof typeof FNB_CATEGORY_LABEL] ?? item.category}</td>
                  <td className="px-4 py-3 text-[#D1D5DB]">{FNB_TYPE_LABEL[item.type as keyof typeof FNB_TYPE_LABEL] ?? item.type}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatVnd(item.basePrice)}</td>
                  <td className="px-4 py-3">
                    {item.isActive ? <Badge tone="green">Đang bán</Badge> : <Badge tone="gray">Ngừng bán</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    {canUpdate && (
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" disabled={busyId === item.id} onClick={() => toggleActive(item)} className="rounded px-2 py-1 text-xs text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white">
                          {item.isActive ? "Ngừng bán" : "Mở bán"}
                        </button>
                        <button type="button" onClick={() => setEditing(item)} className="rounded p-2 text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white" title="Sửa">
                          <Pencil size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pager page={page} totalPages={totalPages} onChange={setPage} />

      {editing && (
        <FnbFormModal
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(name) => {
            setEditing(null);
            setNotice({ kind: "success", text: `Đã lưu “${name}”` });
            refetch();
          }}
        />
      )}
    </div>
  );
}

function FnbFormModal({
  item,
  onClose,
  onSaved,
}: {
  item: AdminFnbItem | null;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [values, setValues] = useState<FnbFormValues>(item ? fnbItemToForm(item) : emptyFnbForm);
  const [errors, setErrors] = useState<FnbFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FnbFormValues>(k: K, v: FnbFormValues[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const check = validateFnbForm(values);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setSaving(true);
    try {
      if (item) await adminFnbService.update(item.id, check.payload);
      else await adminFnbService.create(check.payload);
      onSaved(check.payload.name);
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors: FnbFormErrors = {};
        for (const fe of err.errors ?? []) {
          if (fe.field && fe.field in emptyFnbForm) fieldErrors[fe.field as keyof FnbFormValues] = fe.message;
        }
        setErrors(fieldErrors);
      }
      setFormError(errorText(err, "Lưu món thất bại"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={item ? `Sửa “${item.name}”` : "Thêm món bắp nước"} onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && <Notice kind="error">{formError}</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên món" required error={errors.name} className="sm:col-span-2">
            <input className={inputClass(errors.name)} value={values.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="SKU" required error={errors.sku}>
            <input className={inputClass(errors.sku)} placeholder="FNB-POP-L" value={values.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} />
          </Field>
          <Field label="Giá bán (VND)" required error={errors.basePrice}>
            <input inputMode="numeric" className={inputClass(errors.basePrice)} value={values.basePrice} onChange={(e) => set("basePrice", e.target.value)} />
          </Field>
          <Field label="Nhóm" required error={errors.category}>
            <select className={inputClass(errors.category)} value={values.category} onChange={(e) => set("category", e.target.value as FnbFormValues["category"])}>
              {FNB_CATEGORIES.map((c) => <option key={c} value={c}>{FNB_CATEGORY_LABEL[c]}</option>)}
            </select>
          </Field>
          <Field label="Loại" required error={errors.type}>
            <select className={inputClass(errors.type)} value={values.type} onChange={(e) => set("type", e.target.value as FnbFormValues["type"])}>
              {FNB_TYPES.map((t) => <option key={t} value={t}>{FNB_TYPE_LABEL[t]}</option>)}
            </select>
          </Field>
          <Field label="Đơn vị tính" required error={errors.unit}>
            <input className={inputClass(errors.unit)} value={values.unit} onChange={(e) => set("unit", e.target.value)} />
          </Field>
          <Field label="URL ảnh" error={errors.imageUrl}>
            <input className={inputClass(errors.imageUrl)} placeholder="https://..." value={values.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
          </Field>
          <Field label="Mô tả" error={errors.description} className="sm:col-span-2">
            <textarea rows={3} className={`${inputClass(errors.description)} h-auto py-2`} value={values.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-[#D1D5DB]">
            <input type="checkbox" checked={values.isActive} onChange={(e) => set("isActive", e.target.checked)} className="accent-[#EF4444]" />
            Đang bán
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>Hủy</button>
          <button type="submit" disabled={saving} className={primaryBtn}>{saving ? "Đang lưu..." : "Lưu"}</button>
        </div>
      </form>
    </Modal>
  );
}
