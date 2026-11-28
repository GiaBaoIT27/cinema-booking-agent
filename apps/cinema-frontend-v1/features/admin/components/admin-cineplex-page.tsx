"use client";

import { useEffect, useState } from "react";
import { Ban, Building2, CheckCircle2, Pencil, Plus, Wrench } from "lucide-react";
import { countOf, useStats } from "../hooks/use-stats";
import { ApiError } from "@/lib/api-client";
import { usePaged } from "../hooks/use-paged";
import type { Option } from "../services/admin-catalog.service";
import { adminCineplexService } from "../services/admin-venue.service";
import {
  CINEPLEX_STATUS_LABEL,
  cineplexToForm,
  emptyCineplexForm,
  validateCineplexForm,
  type AdminCineplex,
  type CineplexFormErrors,
  type CineplexFormValues,
  type CineplexStatusType,
} from "../utils/venue-form";
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
  StatCards,
} from "./admin-ui";

const PAGE_SIZE = 10;
const STATUS_TONE: Record<CineplexStatusType, "green" | "amber" | "red"> = {
  ACTIVE: "green",
  MAINTENANCE: "amber",
  CLOSED: "red",
};

export function AdminCineplexPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [provinceId, setProvinceId] = useState("");
  const [page, setPage] = useState(1);
  const [provinces, setProvinces] = useState<Option[]>([]);
  const [editing, setEditing] = useState<AdminCineplex | "new" | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    item: AdminCineplex;
    to: CineplexStatusType;
  } | null>(null);
  const [notice, setNotice] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    adminCineplexService
      .provinces()
      .then(setProvinces)
      .catch(() => setProvinces([]));
  }, []);

  const { items, totalItems, totalPages, isLoading, error, refetch, version } =
    usePaged<AdminCineplex>([search, status, provinceId, page].join("|"), () =>
      adminCineplexService.list({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status,
        provinceId: provinceId || undefined,
      }),
    );

  const provinceName = (id: string | number) =>
    provinces.find((p) => p.id === String(id))?.name ?? "";

  const stat = useStats(
    {
      ALL: () => countOf("/cineplexes", { status: "ALL" }),
      ACTIVE: () => countOf("/cineplexes", { status: "ACTIVE" }),
      MAINTENANCE: () => countOf("/cineplexes", { status: "MAINTENANCE" }),
      CLOSED: () => countOf("/cineplexes", { status: "CLOSED" }),
    },
    version,
  );
  const pick = (s: string) => () => {
    setPage(1);
    setStatus(s);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Rạp chiếu" subtitle={`${totalItems} cụm rạp`} />

      <StatCards
        items={[
          { label: "Tổng cụm rạp", value: stat("ALL"), tone: "red", icon: Building2, onClick: pick("ALL"), active: status === "ALL" },
          { label: "Đang hoạt động", value: stat("ACTIVE"), tone: "green", icon: CheckCircle2, onClick: pick("ACTIVE"), active: status === "ACTIVE" },
          { label: "Bảo trì", value: stat("MAINTENANCE"), tone: "amber", icon: Wrench, onClick: pick("MAINTENANCE"), active: status === "MAINTENANCE" },
          { label: "Đóng cửa", value: stat("CLOSED"), tone: "gray", icon: Ban, onClick: pick("CLOSED"), active: status === "CLOSED" },
        ]}
      />

      <Toolbar
        actions={
          <button
            type="button"
            onClick={() => setEditing("new")}
            className={toolbarBtn}
          >
            <Plus size={16} /> Thêm cụm rạp
          </button>
        }
      >
        <SearchBox
          value={search}
          placeholder="Tìm theo tên cụm rạp..."
          onSearch={(v) => {
            setPage(1);
            setSearch(v);
          }}
        />
        <select
          aria-label="Tỉnh/thành"
          value={provinceId}
          onChange={(e) => {
            setPage(1);
            setProvinceId(e.target.value);
          }}
          className={filterClass}
        >
          <option value="">Mọi tỉnh/thành</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Trạng thái"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className={filterClass}
        >
          <option value="ALL">Mọi trạng thái</option>
          {(Object.keys(CINEPLEX_STATUS_LABEL) as CineplexStatusType[]).map(
            (s) => (
              <option key={s} value={s}>
                {CINEPLEX_STATUS_LABEL[s]}
              </option>
            ),
          )}
        </select>
        <ClearFilters
          show={!!(search || provinceId || status !== "ALL")}
          onClear={() => {
            setPage(1);
            setSearch("");
            setProvinceId("");
            setStatus("ALL");
          }}
        />
      </Toolbar>

      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      {error && <Notice kind="error">Không tải được danh sách: {error}</Notice>}

      <div className="overflow-x-auto rounded-xl border border-[#1F2937]">
        <table className="w-full min-w-190 text-sm">
          <thead className="bg-[#0B0F19] text-left text-xs uppercase tracking-wide text-[#6B7280]">
            <tr>
              <th className="px-4 py-3">Cụm rạp</th>
              <th className="px-4 py-3">Địa chỉ</th>
              <th className="px-4 py-3">Hotline</th>
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
                  Không có cụm rạp nào khớp bộ lọc.
                </td>
              </tr>
            )}
            {!isLoading &&
              items.map((c) => {
                const st = c.status as CineplexStatusType;
                return (
                  <tr key={c.id} className="hover:bg-[#0B0F19]/60">
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-[#6B7280]">{c.code}</p>
                    </td>
                    <td className="px-4 py-3 text-[#D1D5DB]">
                      <p className="line-clamp-1">{c.address}</p>
                      <p className="text-xs text-[#6B7280]">
                        {provinceName(c.provinceId)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#D1D5DB]">
                      {c.phoneNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={STATUS_TONE[st] ?? "amber"}>
                          {CINEPLEX_STATUS_LABEL[st] ?? c.status}
                        </Badge>
                        <select
                          value=""
                          onChange={(e) =>
                            e.target.value &&
                            setStatusTarget({
                              item: c,
                              to: e.target.value as CineplexStatusType,
                            })
                          }
                          className="h-7 rounded border border-[#1F2937] bg-[#0B0F19] px-1 text-xs text-[#9CA3AF]"
                          aria-label={`Đổi trạng thái ${c.name}`}
                        >
                          <option value="">Đổi…</option>
                          {(
                            Object.keys(
                              CINEPLEX_STATUS_LABEL,
                            ) as CineplexStatusType[]
                          )
                            .filter((s) => s !== st)
                            .map((s) => (
                              <option key={s} value={s}>
                                {CINEPLEX_STATUS_LABEL[s]}
                              </option>
                            ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className="rounded p-2 text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white"
                        title="Sửa"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <Pager page={page} totalPages={totalPages} onChange={setPage} />

      {editing && (
        <CineplexFormModal
          item={editing === "new" ? null : editing}
          provinces={provinces}
          onClose={() => setEditing(null)}
          onSaved={(name) => {
            setEditing(null);
            setNotice({ kind: "success", text: `Đã lưu cụm rạp “${name}”` });
            refetch();
          }}
        />
      )}
      {statusTarget && (
        <StatusReasonModal
          title={`Chuyển “${statusTarget.item.name}” sang ${CINEPLEX_STATUS_LABEL[statusTarget.to]}`}
          warning={
            statusTarget.to !== "ACTIVE" &&
            statusTarget.item.status === "ACTIVE"
              ? "Các suất chiếu đang mở bán sắp tới của cụm rạp này sẽ bị hệ thống tự hủy."
              : undefined
          }
          onClose={() => setStatusTarget(null)}
          onConfirm={async (reason) => {
            await adminCineplexService.setStatus(
              String(statusTarget.item.id),
              statusTarget.to,
              reason,
            );
            setNotice({
              kind: "success",
              text: `Đã chuyển “${statusTarget.item.name}” sang ${CINEPLEX_STATUS_LABEL[statusTarget.to]}`,
            });
            setStatusTarget(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

/** Hộp xác nhận đổi trạng thái kèm lý do (tùy chọn, tối đa 255 ký tự) — dùng chung cho rạp và phòng chiếu. */
export function StatusReasonModal({
  title,
  warning,
  onClose,
  onConfirm,
}: {
  title: string;
  warning?: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        {warning && <Notice kind="error">{warning}</Notice>}
        {err && <Notice kind="error">{err}</Notice>}
        <Field label="Lý do (tùy chọn)">
          <input
            maxLength={255}
            className={inputClass()}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Hủy
          </button>
          <button
            type="button"
            disabled={busy}
            className={primaryBtn}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await onConfirm(reason.trim());
              } catch (e) {
                setErr(errorText(e));
                setBusy(false);
              }
            }}
          >
            {busy ? "Đang lưu..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CineplexFormModal({
  item,
  provinces,
  onClose,
  onSaved,
}: {
  item: AdminCineplex | null;
  provinces: Option[];
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [values, setValues] = useState<CineplexFormValues>(
    item ? cineplexToForm(item) : emptyCineplexForm,
  );
  const [errors, setErrors] = useState<CineplexFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [wards, setWards] = useState<{
    provinceId: string;
    list: Option[];
  } | null>(null);

  useEffect(() => {
    if (!values.provinceId) return;
    let cancelled = false;
    adminCineplexService
      .wards(values.provinceId)
      .then(
        (list) =>
          !cancelled && setWards({ provinceId: values.provinceId, list }),
      )
      .catch(
        () =>
          !cancelled && setWards({ provinceId: values.provinceId, list: [] }),
      );
    return () => {
      cancelled = true;
    };
  }, [values.provinceId]);

  const wardOptions =
    wards && wards.provinceId === values.provinceId ? wards.list : [];

  const set = <K extends keyof CineplexFormValues>(
    k: K,
    v: CineplexFormValues[K],
  ) => {
    setValues((s) => ({
      ...s,
      [k]: v,
      ...(k === "provinceId" ? { wardId: "" } : {}),
    }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const check = validateCineplexForm(values);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setSaving(true);
    try {
      if (item)
        await adminCineplexService.update(String(item.id), check.payload);
      else await adminCineplexService.create(check.payload);
      onSaved(check.payload.name);
    } catch (err) {
      if (err instanceof ApiError) {
        const fe: CineplexFormErrors = {};
        for (const x of err.errors ?? [])
          if (x.field && x.field in emptyCineplexForm)
            fe[x.field as keyof CineplexFormValues] = x.message;
        setErrors(fe);
      }
      setFormError(errorText(err, "Lưu cụm rạp thất bại"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={item ? `Sửa “${item.name}”` : "Thêm cụm rạp"}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && <Notice kind="error">{formError}</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Tên cụm rạp"
            required
            error={errors.name}
            className="sm:col-span-2"
          >
            <input
              className={inputClass(errors.name)}
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field label="Mã" required error={errors.code}>
            <input
              className={inputClass(errors.code)}
              placeholder="CPX-HCM-Q1"
              value={values.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Hotline" error={errors.phoneNumber}>
            <input
              inputMode="tel"
              className={inputClass(errors.phoneNumber)}
              value={values.phoneNumber}
              onChange={(e) => set("phoneNumber", e.target.value)}
            />
          </Field>
          <Field label="Tỉnh/thành" required error={errors.provinceId}>
            <select
              className={inputClass(errors.provinceId)}
              value={values.provinceId}
              onChange={(e) => set("provinceId", e.target.value)}
            >
              <option value="">— Chọn —</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Phường/xã" required error={errors.wardId}>
            <select
              className={inputClass(errors.wardId)}
              value={values.wardId}
              disabled={!values.provinceId}
              onChange={(e) => set("wardId", e.target.value)}
            >
              <option value="">
                {values.provinceId ? "— Chọn —" : "Chọn tỉnh/thành trước"}
              </option>
              {wardOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Địa chỉ"
            required
            error={errors.address}
            className="sm:col-span-2"
          >
            <input
              className={inputClass(errors.address)}
              value={values.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
          <Field label="Vĩ độ" error={errors.latitude}>
            <input
              inputMode="decimal"
              className={inputClass(errors.latitude)}
              placeholder="10.7812"
              value={values.latitude}
              onChange={(e) => set("latitude", e.target.value)}
            />
          </Field>
          <Field label="Kinh độ" error={errors.longitude}>
            <input
              inputMode="decimal"
              className={inputClass(errors.longitude)}
              placeholder="106.6991"
              value={values.longitude}
              onChange={(e) => set("longitude", e.target.value)}
            />
          </Field>
        </div>
        <p className="text-xs text-[#6B7280]">
          Tọa độ dùng để khách tìm rạp gần nhất trên bản đồ.
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
