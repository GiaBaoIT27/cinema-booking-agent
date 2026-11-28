"use client";

import { useEffect, useState } from "react";
import { Film, Pencil, Plus } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/use-auth-store";
import { usePaged } from "../hooks/use-paged";
import { adminDistributorService } from "../services/admin-master.service";
import { hasPermission } from "../utils/admin-access";
import { MOVIE_STATUS_LABEL } from "../utils/movie-form";
import {
  DISTRIBUTOR_STATUS_LABEL,
  distributorToForm,
  emptyDistributorForm,
  validateDistributorForm,
  type AdminDistributor,
  type DistributorFormValues,
  type DistributorStatusType,
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

export function AdminDistributorPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = hasPermission(user, "distributor:create");
  const canUpdate = hasPermission(user, "distributor:update");

  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminDistributor | "new" | null>(null);
  const [moviesOf, setMoviesOf] = useState<AdminDistributor | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  const { items, totalItems, totalPages, isLoading, error, refetch } =
    usePaged<AdminDistributor>([name, status, page].join("|"), () =>
      adminDistributorService.list({
        page,
        limit: PAGE_SIZE,
        name: name || undefined,
        status: status || undefined,
      }),
    );

  const toggle = async (d: AdminDistributor) => {
    const to: DistributorStatusType =
      d.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    if (
      to === "SUSPENDED" &&
      !window.confirm(
        `Tạm ngưng hợp tác với “${d.name}”? Phim mới sẽ không chọn được nhà phát hành này.`,
      )
    )
      return;
    setBusyId(String(d.id));
    setNotice(null);
    try {
      await adminDistributorService.setStatus(String(d.id), to);
      setNotice({
        kind: "success",
        text: `“${d.name}”: ${DISTRIBUTOR_STATUS_LABEL[to]}`,
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
      <PageHeader
        title="Nhà phát hành"
        subtitle={`${totalItems} đối tác phân phối phim`}
      />

      <Toolbar
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className={toolbarBtn}
            >
              <Plus size={16} /> Thêm nhà phát hành
            </button>
          )
        }
      >
        <SearchBox
          value={name}
          placeholder="Tìm theo tên nhà phát hành..."
          onSearch={(v) => {
            setPage(1);
            setName(v);
          }}
        />
        <select
          aria-label="Trạng thái"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className={filterClass}
        >
          <option value="">Mọi trạng thái</option>
          {(
            Object.keys(DISTRIBUTOR_STATUS_LABEL) as DistributorStatusType[]
          ).map((s) => (
            <option key={s} value={s}>
              {DISTRIBUTOR_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <ClearFilters
          show={!!(name || status)}
          onClear={() => {
            setPage(1);
            setName("");
            setStatus("");
          }}
        />
      </Toolbar>

      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      {error && <Notice kind="error">Không tải được danh sách: {error}</Notice>}

      <div className="overflow-x-auto rounded-xl border border-[#1F2937]">
        <table className="w-full min-w-205 text-sm">
          <thead className="bg-[#0B0F19] text-left text-xs uppercase tracking-wide text-[#6B7280]">
            <tr>
              <th className="px-4 py-3">Nhà phát hành</th>
              <th className="px-4 py-3">Liên hệ</th>
              <th className="px-4 py-3">Ngân hàng</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2937]">
            {isLoading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-[#6B7280]"
                >
                  Đang tải...
                </td>
              </tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-[#6B7280]"
                >
                  Không có nhà phát hành nào khớp bộ lọc.
                </td>
              </tr>
            )}
            {!isLoading &&
              items.map((d) => (
                <tr
                  key={d.id}
                  className={
                    busyId === String(d.id)
                      ? "opacity-50"
                      : "hover:bg-[#0B0F19]/60"
                  }
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-[#6B7280]">MST {d.taxCode}</p>
                  </td>
                  <td className="px-4 py-3 text-[#D1D5DB]">
                    <p>{d.contactPerson}</p>
                    <p className="text-xs text-[#6B7280]">
                      {d.contactEmail} · {d.contactPhone}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[#D1D5DB]">
                    {d.bankName
                      ? `${d.bankName} · ${d.bankAccountNumber ?? ""}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={d.status === "ACTIVE" ? "green" : "gray"}>
                      {DISTRIBUTOR_STATUS_LABEL[
                        d.status as DistributorStatusType
                      ] ?? d.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setMoviesOf(d)}
                        className="rounded p-2 text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white"
                        title="Phim của nhà phát hành"
                      >
                        <Film size={15} />
                      </button>
                      {canUpdate && (
                        <>
                          <button
                            type="button"
                            disabled={busyId === String(d.id)}
                            onClick={() => toggle(d)}
                            className="rounded px-2 py-1 text-xs text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white"
                          >
                            {d.status === "ACTIVE" ? "Tạm ngưng" : "Kích hoạt"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(d)}
                            className="rounded p-2 text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white"
                            title="Sửa"
                          >
                            <Pencil size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pager page={page} totalPages={totalPages} onChange={setPage} />

      {editing && (
        <DistributorFormModal
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(n) => {
            setEditing(null);
            setNotice({ kind: "success", text: `Đã lưu “${n}”` });
            refetch();
          }}
        />
      )}
      {moviesOf && (
        <DistributorMoviesModal
          distributor={moviesOf}
          onClose={() => setMoviesOf(null)}
        />
      )}
    </div>
  );
}

function DistributorMoviesModal({
  distributor,
  onClose,
}: {
  distributor: AdminDistributor;
  onClose: () => void;
}) {
  const [movies, setMovies] = useState<
    { id: string; title: string; status: string }[] | null
  >(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    adminDistributorService
      .movies(String(distributor.id))
      .then((m) => !cancelled && setMovies(m))
      .catch((e: unknown) => !cancelled && setErr(errorText(e)));
    return () => {
      cancelled = true;
    };
  }, [distributor.id]);
  return (
    <Modal title={`Phim của ${distributor.name}`} onClose={onClose}>
      {err && <Notice kind="error">{err}</Notice>}
      {!movies && !err && <p className="text-sm text-[#9CA3AF]">Đang tải...</p>}
      {movies && movies.length === 0 && (
        <p className="text-sm text-[#9CA3AF]">Chưa có phim nào.</p>
      )}
      {movies && movies.length > 0 && (
        <ul className="divide-y divide-[#1F2937] rounded-lg border border-[#1F2937] text-sm">
          {movies.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between px-3 py-2"
            >
              <span>{m.title}</span>
              <span className="text-xs text-[#9CA3AF]">
                {MOVIE_STATUS_LABEL[
                  m.status as keyof typeof MOVIE_STATUS_LABEL
                ] ?? m.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function DistributorFormModal({
  item,
  onClose,
  onSaved,
}: {
  item: AdminDistributor | null;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [values, setValues] = useState<DistributorFormValues>(
    item ? distributorToForm(item) : emptyDistributorForm,
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof DistributorFormValues, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof DistributorFormValues, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const check = validateDistributorForm(values);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setSaving(true);
    try {
      if (item)
        await adminDistributorService.update(String(item.id), check.payload);
      else await adminDistributorService.create(check.payload);
      onSaved(check.payload.name);
    } catch (err) {
      if (err instanceof ApiError) {
        const fe: typeof errors = {};
        for (const x of err.errors ?? [])
          if (x.field && x.field in emptyDistributorForm)
            fe[x.field as keyof DistributorFormValues] = x.message;
        setErrors(fe);
      }
      setFormError(errorText(err, "Lưu nhà phát hành thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const input = (
    k: keyof DistributorFormValues,
    label: string,
    required = false,
    extra: { className?: string; inputMode?: "tel" | "email" | "numeric" } = {},
  ) => (
    <Field
      label={label}
      required={required}
      error={errors[k]}
      className={extra.className}
    >
      <input
        inputMode={extra.inputMode}
        className={inputClass(errors[k])}
        value={values[k]}
        onChange={(e) => set(k, e.target.value)}
      />
    </Field>
  );

  return (
    <Modal
      title={item ? `Sửa “${item.name}”` : "Thêm nhà phát hành"}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && <Notice kind="error">{formError}</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          {input("name", "Tên công ty", true, { className: "sm:col-span-2" })}
          {input("taxCode", "Mã số thuế", true, { inputMode: "numeric" })}
          {input("contactPerson", "Người liên hệ", true)}
          {input("contactEmail", "Email liên hệ", true, { inputMode: "email" })}
          {input("contactPhone", "SĐT liên hệ", true, { inputMode: "tel" })}
          {input("address", "Địa chỉ", true, { className: "sm:col-span-2" })}
          {input("bankName", "Ngân hàng")}
          {input("bankAccountNumber", "Số tài khoản", false, {
            inputMode: "numeric",
          })}
        </div>
        <p className="text-xs text-[#6B7280]">
          Thông tin ngân hàng dùng khi đối soát chia doanh thu vé với nhà phát
          hành.
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
