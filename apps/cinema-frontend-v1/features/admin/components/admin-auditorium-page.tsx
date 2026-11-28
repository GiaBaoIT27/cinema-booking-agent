"use client";

import { useEffect, useState } from "react";
import { Grid3x3, Pencil, Plus } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/use-auth-store";
import { usePaged } from "../hooks/use-paged";
import { adminShowtimeService, type Option } from "../services/admin-catalog.service";
import { adminAuditoriumService, type SeatLayout } from "../services/admin-venue.service";
import { hasPermission } from "../utils/admin-access";
import {
  AUDIO_TYPES,
  AUDITORIUM_STATUS_LABEL,
  SCREEN_TYPES,
  auditoriumToForm,
  buildSeatGrid,
  emptyAuditoriumForm,
  rowLetters,
  validateAuditoriumForm,
  validateSeatGrid,
  type AdminAuditorium,
  type AuditoriumFormErrors,
  type AuditoriumFormValues,
  type AuditoriumStatusType,
} from "../utils/venue-form";
import { StatusReasonModal } from "./admin-cineplex-page";
import {
  Badge,
  ClearFilters,
  Field,
  Modal,
  Notice,
  PageHeader,
  Pager,
  Toolbar,
  errorText,
  filterClass,
  inputClass,
  primaryBtn,
  secondaryBtn,
  toolbarBtn,
} from "./admin-ui";

const PAGE_SIZE = 12;
const STATUS_TONE: Record<AuditoriumStatusType, "green" | "amber" | "gray"> = {
  ACTIVE: "green",
  MAINTENANCE: "amber",
  INACTIVE: "gray",
};

export function AdminAuditoriumPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = hasPermission(user, "auditorium:create");
  const canUpdate = hasPermission(user, "auditorium:update");

  const [cineplexes, setCineplexes] = useState<Option[]>([]);
  const [cineplexId, setCineplexId] = useState("");
  const [screenType, setScreenType] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminAuditorium | "new" | null>(null);
  const [seatsOf, setSeatsOf] = useState<AdminAuditorium | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ item: AdminAuditorium; to: AuditoriumStatusType } | null>(null);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    adminShowtimeService.cineplexes().then(setCineplexes).catch(() => setCineplexes([]));
  }, []);

  const { items, totalItems, totalPages, isLoading, error, refetch } = usePaged<AdminAuditorium>(
    [cineplexId, screenType, status, page].join("|"),
    () =>
      adminAuditoriumService.list({
        page,
        limit: PAGE_SIZE,
        cineplexId: cineplexId || undefined,
        screenType: screenType || undefined,
        status,
      }),
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Phòng chiếu" subtitle={`${totalItems} phòng`} />

      <Toolbar
        actions={
          canCreate && (
            <button type="button" onClick={() => setEditing("new")} className={toolbarBtn}>
              <Plus size={16} /> Thêm phòng
            </button>
          )
        }
      >
        <select aria-label="Cụm rạp" value={cineplexId} onChange={(e) => { setPage(1); setCineplexId(e.target.value); }} className={`${filterClass} max-w-64`}>
          <option value="">Tất cả cụm rạp</option>
          {cineplexes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select aria-label="Loại màn hình" value={screenType} onChange={(e) => { setPage(1); setScreenType(e.target.value); }} className={filterClass}>
          <option value="">Mọi loại màn hình</option>
          {SCREEN_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Trạng thái" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className={filterClass}>
          <option value="ALL">Mọi trạng thái</option>
          {(Object.keys(AUDITORIUM_STATUS_LABEL) as AuditoriumStatusType[]).map((s) => <option key={s} value={s}>{AUDITORIUM_STATUS_LABEL[s]}</option>)}
        </select>
        <ClearFilters show={!!(cineplexId || screenType || status !== "ALL")} onClear={() => { setPage(1); setCineplexId(""); setScreenType(""); setStatus("ALL"); }} />
      </Toolbar>

      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      {error && <Notice kind="error">Không tải được danh sách: {error}</Notice>}

      <div className="overflow-x-auto rounded-xl border border-[#1F2937]">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="bg-[#0B0F19] text-left text-xs uppercase tracking-wide text-[#6B7280]">
            <tr>
              <th className="px-4 py-3">Phòng</th>
              <th className="px-4 py-3">Cụm rạp</th>
              <th className="px-4 py-3">Màn hình · Âm thanh</th>
              <th className="px-4 py-3 text-right">Sức chứa</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2937]">
            {isLoading && <tr><td colSpan={6} className="px-4 py-10 text-center text-[#6B7280]">Đang tải...</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[#6B7280]">Không có phòng nào khớp bộ lọc.</td></tr>}
            {!isLoading &&
              items.map((a) => {
                const st = a.status as AuditoriumStatusType;
                return (
                  <tr key={a.id} className="hover:bg-[#0B0F19]/60">
                    <td className="px-4 py-3">
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-[#6B7280]">{a.code}</p>
                    </td>
                    <td className="px-4 py-3 text-[#D1D5DB]">{a.cineplexName ?? cineplexes.find((c) => c.id === String(a.cineplexId))?.name ?? `#${a.cineplexId}`}</td>
                    <td className="px-4 py-3 text-[#D1D5DB]">{a.screenType} · {a.audioType}</td>
                    <td className="px-4 py-3 text-right text-[#D1D5DB]">{a.totalSeats} ghế</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={STATUS_TONE[st] ?? "gray"}>{AUDITORIUM_STATUS_LABEL[st] ?? a.status}</Badge>
                        {canUpdate && (
                          <select
                            value=""
                            onChange={(e) => e.target.value && setStatusTarget({ item: a, to: e.target.value as AuditoriumStatusType })}
                            className="h-7 rounded border border-[#1F2937] bg-[#0B0F19] px-1 text-xs text-[#9CA3AF]"
                            aria-label={`Đổi trạng thái ${a.name}`}
                          >
                            <option value="">Đổi…</option>
                            {(Object.keys(AUDITORIUM_STATUS_LABEL) as AuditoriumStatusType[])
                              .filter((s) => s !== st)
                              .map((s) => <option key={s} value={s}>{AUDITORIUM_STATUS_LABEL[s]}</option>)}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setSeatsOf(a)} className="rounded p-2 text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white" title="Sơ đồ ghế">
                          <Grid3x3 size={15} />
                        </button>
                        {canUpdate && (
                          <button type="button" onClick={() => setEditing(a)} className="rounded p-2 text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white" title="Sửa">
                            <Pencil size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <Pager page={page} totalPages={totalPages} onChange={setPage} />

      {editing && (
        <AuditoriumFormModal
          item={editing === "new" ? null : editing}
          cineplexes={cineplexes}
          onClose={() => setEditing(null)}
          onSaved={(name) => {
            setEditing(null);
            setNotice({ kind: "success", text: `Đã lưu phòng “${name}”` });
            refetch();
          }}
        />
      )}
      {seatsOf && <SeatLayoutModal auditorium={seatsOf} canEdit={canUpdate} onClose={() => setSeatsOf(null)} onSaved={(t) => setNotice({ kind: "success", text: t })} />}
      {statusTarget && (
        <StatusReasonModal
          title={`Chuyển “${statusTarget.item.name}” sang ${AUDITORIUM_STATUS_LABEL[statusTarget.to]}`}
          warning={statusTarget.to !== "ACTIVE" ? "Các suất chiếu sắp tới (đã lên lịch hoặc đang mở bán) của phòng này sẽ bị hệ thống tự hủy." : undefined}
          onClose={() => setStatusTarget(null)}
          onConfirm={async (reason) => {
            await adminAuditoriumService.setStatus(String(statusTarget.item.id), statusTarget.to, reason);
            setNotice({ kind: "success", text: `Đã chuyển “${statusTarget.item.name}” sang ${AUDITORIUM_STATUS_LABEL[statusTarget.to]}` });
            setStatusTarget(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function AuditoriumFormModal({
  item,
  cineplexes,
  onClose,
  onSaved,
}: {
  item: AdminAuditorium | null;
  cineplexes: Option[];
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [values, setValues] = useState<AuditoriumFormValues>(item ? auditoriumToForm(item) : emptyAuditoriumForm);
  const [errors, setErrors] = useState<AuditoriumFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof AuditoriumFormValues>(k: K, v: AuditoriumFormValues[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const check = validateAuditoriumForm(values);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setSaving(true);
    try {
      if (item) await adminAuditoriumService.update(String(item.id), check.payload);
      else await adminAuditoriumService.create(check.payload);
      onSaved(check.payload.name);
    } catch (err) {
      if (err instanceof ApiError) {
        const fe: AuditoriumFormErrors = {};
        for (const x of err.errors ?? []) if (x.field && x.field in emptyAuditoriumForm) fe[x.field as keyof AuditoriumFormValues] = x.message;
        setErrors(fe);
      }
      setFormError(errorText(err, "Lưu phòng chiếu thất bại"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={item ? `Sửa “${item.name}”` : "Thêm phòng chiếu"} onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && <Notice kind="error">{formError}</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cụm rạp" required error={errors.cineplexId} className="sm:col-span-2">
            <select className={inputClass(errors.cineplexId)} value={values.cineplexId} onChange={(e) => set("cineplexId", e.target.value)}>
              <option value="">— Chọn —</option>
              {cineplexes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Tên phòng" required error={errors.name}>
            <input className={inputClass(errors.name)} placeholder="Phòng 05 - IMAX" value={values.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Mã phòng" required error={errors.code}>
            <input className={inputClass(errors.code)} placeholder="CPX-HCM-Q1-HALL-05" value={values.code} onChange={(e) => set("code", e.target.value.toUpperCase())} />
          </Field>
          <Field label="Loại màn hình" required>
            <select className={inputClass()} value={values.screenType} onChange={(e) => set("screenType", e.target.value as AuditoriumFormValues["screenType"])}>
              {SCREEN_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Âm thanh" required>
            <select className={inputClass()} value={values.audioType} onChange={(e) => set("audioType", e.target.value as AuditoriumFormValues["audioType"])}>
              {AUDIO_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Sức chứa tối đa (ghế)" required error={errors.totalSeats}>
            <input inputMode="numeric" className={inputClass(errors.totalSeats)} value={values.totalSeats} onChange={(e) => set("totalSeats", e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>Hủy</button>
          <button type="submit" disabled={saving} className={primaryBtn}>{saving ? "Đang lưu..." : "Lưu"}</button>
        </div>
      </form>
    </Modal>
  );
}

const SEAT_COLOR: Record<string, string> = { NORMAL: "#6B7280", VIP: "#F59E0B", SWEETBOX: "#EC4899" };

/** Xem sơ đồ ghế; phòng chưa có ghế thì cho sinh nhanh một lưới ghế. */
function SeatLayoutModal({
  auditorium,
  canEdit,
  onClose,
  onSaved,
}: {
  auditorium: AdminAuditorium;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const id = String(auditorium.id);
  const [layout, setLayout] = useState<SeatLayout | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [seatTypes, setSeatTypes] = useState<{ id: string; code: string; name: string }[]>([]);
  const [rows, setRows] = useState("8");
  const [perRow, setPerRow] = useState("10");
  const [vipRows, setVipRows] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminAuditoriumService
      .seats(id)
      .then((l) => !cancelled && setLayout(l))
      .catch((e: unknown) => !cancelled && setLoadError(errorText(e, "Không tải được sơ đồ ghế")));
    return () => {
      cancelled = true;
    };
  }, [id, reload]);

  const empty = layout !== null && layout.seats.length === 0;

  useEffect(() => {
    if (empty && canEdit) adminAuditoriumService.seatTypes().then(setSeatTypes).catch(() => setSeatTypes([]));
  }, [empty, canEdit]);

  const generate = async () => {
    const msg = validateSeatGrid(rows, perRow, auditorium.totalSeats);
    setErr(msg);
    const normal = seatTypes.find((t) => t.code === "NORMAL") ?? seatTypes[0];
    const vip = seatTypes.find((t) => t.code === "VIP");
    if (msg || !normal) {
      if (!normal) setErr("Chưa có loại ghế nào trong hệ thống");
      return;
    }
    setBusy(true);
    try {
      const items = buildSeatGrid({
        rows: Number(rows),
        seatsPerRow: Number(perRow),
        normalSeatTypeId: Number(normal.id),
        vipSeatTypeId: vip ? Number(vip.id) : undefined,
        vipRows,
      });
      await adminAuditoriumService.createSeats(id, items);
      onSaved(`Đã tạo ${items.length} ghế cho “${auditorium.name}”`);
      setReload((n) => n + 1);
    } catch (e) {
      setErr(errorText(e, "Tạo sơ đồ ghế thất bại"));
    } finally {
      setBusy(false);
    }
  };

  const cols = layout ? Math.max(1, layout.gridDimensions.maxColumnsX) : 1;

  return (
    <Modal title={`Sơ đồ ghế · ${auditorium.name}`} onClose={onClose} wide>
      {loadError && <Notice kind="error">{loadError}</Notice>}
      {!layout && !loadError && <p className="text-sm text-[#9CA3AF]">Đang tải...</p>}
      {layout && layout.seats.length > 0 && (
        <div className="space-y-3">
          <div className="mx-auto h-1.5 w-2/3 rounded-full bg-[#9CA3AF]/60" />
          <p className="text-center text-[10px] uppercase tracking-widest text-[#6B7280]">Màn hình</p>
          <div className="overflow-x-auto">
            <div className="mx-auto grid w-max gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1.5rem)` }}>
              {layout.seats.map((s) => (
                <div
                  key={s.id}
                  title={`${s.seatNumber} · ${s.seatType.code}${s.status !== "ACTIVE" ? ` · ${s.status}` : ""}`}
                  className="flex h-6 items-center justify-center rounded text-[8px] text-white/80"
                  style={{
                    gridColumn: `${s.coordinates.x + 1} / span ${s.coordinates.gridSpan}`,
                    gridRow: s.coordinates.y + 1,
                    background: s.seatType.colorCode || SEAT_COLOR[s.seatType.code] || "#6B7280",
                    opacity: s.status === "ACTIVE" ? 1 : 0.3,
                  }}
                >
                  {s.seatNumber.length <= 3 ? s.seatNumber : ""}
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-xs text-[#9CA3AF]">{layout.seats.length} ghế · sức chứa thiết kế {auditorium.totalSeats}</p>
        </div>
      )}
      {empty && (
        <div className="space-y-4">
          <Notice kind="error">Phòng chưa có ghế nào nên chưa bán vé được.</Notice>
          {canEdit ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Số hàng (A, B, C…)">
                  <input inputMode="numeric" className={inputClass()} value={rows} onChange={(e) => { setRows(e.target.value); setVipRows([]); }} />
                </Field>
                <Field label="Số ghế mỗi hàng">
                  <input inputMode="numeric" className={inputClass()} value={perRow} onChange={(e) => setPerRow(e.target.value)} />
                </Field>
              </div>
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-[#D1D5DB]">Hàng VIP</p>
                <div className="flex flex-wrap gap-1.5">
                  {rowLetters(Number(rows) || 0).map((r) => {
                    const on = vipRows.includes(r);
                    return (
                      <button key={r} type="button" aria-pressed={on} onClick={() => setVipRows((v) => (on ? v.filter((x) => x !== r) : [...v, r]))}
                        className={`h-7 w-7 rounded text-xs ${on ? "bg-amber-500 text-black" : "border border-[#374151] text-[#9CA3AF]"}`}>
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
              {err && <Notice kind="error">{err}</Notice>}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#9CA3AF]">Tổng {(Number(rows) || 0) * (Number(perRow) || 0)} / {auditorium.totalSeats} ghế</span>
                <button type="button" disabled={busy} onClick={generate} className={primaryBtn}>{busy ? "Đang tạo..." : "Tạo sơ đồ ghế"}</button>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#9CA3AF]">Bạn không có quyền cấu hình ghế.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
