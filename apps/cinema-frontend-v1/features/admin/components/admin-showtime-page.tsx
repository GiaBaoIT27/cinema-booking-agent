"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useAuthStore } from "@/stores/use-auth-store";
import { usePaged } from "../hooks/use-paged";
import { adminShowtimeService, type Option } from "../services/admin-catalog.service";
import { hasPermission } from "../utils/admin-access";
import {
  PROJECTION_TYPES,
  SHOWTIME_STATUS_LABEL,
  emptyShowtimeForm,
  estimateEnd,
  formatDateTime,
  nextShowtimeStatuses,
  validateShowtimeForm,
  type AdminShowtime,
  type ShowtimeFormErrors,
  type ShowtimeFormValues,
  type ShowtimeStatusType,
} from "../utils/showtime-form";
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

const PAGE_SIZE = 15;

const STATUS_TONE: Record<ShowtimeStatusType, "blue" | "green" | "gray" | "red"> = {
  SCHEDULED: "blue",
  OPEN: "green",
  CLOSED: "gray",
  CANCELLED: "red",
};

export function AdminShowtimePage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = hasPermission(user, "showtime:create");
  const canUpdate = hasPermission(user, "showtime:update");

  const [cineplexes, setCineplexes] = useState<Option[]>([]);
  const [cineplexId, setCineplexId] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    adminShowtimeService.cineplexes().then(setCineplexes).catch(() => setCineplexes([]));
  }, []);

  const { items, totalItems, totalPages, isLoading, error, refetch } = usePaged<AdminShowtime>(
    [cineplexId, date, status, page].join("|"),
    () =>
      adminShowtimeService.list({
        page,
        limit: PAGE_SIZE,
        cineplexId: cineplexId || undefined,
        date: date || undefined,
        status: status || undefined,
      }),
  );

  const changeStatus = async (st: AdminShowtime, target: ShowtimeStatusType) => {
    if (target === "CANCELLED" && !window.confirm(`Hủy suất chiếu “${st.movie?.title ?? st.id}” lúc ${formatDateTime(st.startTime)}?`)) return;
    setBusyId(st.id);
    setNotice(null);
    try {
      await adminShowtimeService.setStatus(st.id, target);
      setNotice({ kind: "success", text: `Đã chuyển suất #${st.id} sang “${SHOWTIME_STATUS_LABEL[target]}”` });
      refetch();
    } catch (err) {
      setNotice({ kind: "error", text: errorText(err) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Suất chiếu" subtitle={`${totalItems} suất`} />

      <Toolbar
        actions={
          canCreate && (
            <button type="button" onClick={() => setCreating(true)} className={toolbarBtn}>
              <Plus size={16} /> Tạo suất chiếu
            </button>
          )
        }
      >
        <select aria-label="Cụm rạp" value={cineplexId} onChange={(e) => { setPage(1); setCineplexId(e.target.value); }} className={`${filterClass} max-w-64`}>
          <option value="">Tất cả cụm rạp</option>
          {cineplexes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input aria-label="Ngày chiếu" type="date" value={date} onChange={(e) => { setPage(1); setDate(e.target.value); }} className={filterClass} />
        <select aria-label="Trạng thái" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className={filterClass}>
          <option value="">Tất cả trạng thái</option>
          {(Object.keys(SHOWTIME_STATUS_LABEL) as ShowtimeStatusType[]).map((s) => (
            <option key={s} value={s}>{SHOWTIME_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <ClearFilters show={!!(cineplexId || date || status)} onClear={() => { setPage(1); setCineplexId(""); setDate(""); setStatus(""); }} />
      </Toolbar>

      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      {error && <Notice kind="error">Không tải được danh sách: {error}</Notice>}

      <div className="overflow-x-auto rounded-xl border border-[#1F2937]">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-[#0B0F19] text-left text-xs uppercase tracking-wide text-[#6B7280]">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Phim</th>
              <th className="px-4 py-3">Rạp · Phòng</th>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Định dạng</th>
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2937]">
            {isLoading && <tr><td colSpan={6} className="px-4 py-10 text-center text-[#6B7280]">Đang tải...</td></tr>}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[#6B7280]">Không có suất chiếu nào khớp bộ lọc.</td></tr>
            )}
            {!isLoading &&
              items.map((st) => {
                const targets = nextShowtimeStatuses(st.status);
                const busy = busyId === st.id;
                return (
                  <tr key={st.id} className={busy ? "opacity-50" : "hover:bg-[#0B0F19]/60"}>
                    <td className="px-4 py-3 text-[#6B7280]">{st.id}</td>
                    <td className="px-4 py-3 font-medium">{st.movie?.title ?? `Phim #${st.movieId}`}</td>
                    <td className="px-4 py-3 text-[#D1D5DB]">
                      <p>{st.auditorium?.cineplex?.name ?? "—"}</p>
                      <p className="text-xs text-[#6B7280]">{st.auditorium?.name ?? `Phòng #${st.auditoriumId}`}</p>
                    </td>
                    <td className="px-4 py-3 text-[#D1D5DB]">
                      <p>{formatDateTime(st.startTime)}</p>
                      <p className="text-xs text-[#6B7280]">đến {new Date(st.endTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} (gồm {st.cleaningMinutes}′ dọn phòng)</p>
                    </td>
                    <td className="px-4 py-3 text-[#D1D5DB]">
                      {st.projectionType}
                      <p className="text-xs text-[#6B7280]">{st.audioLanguage}{st.subtitleLanguage ? ` · phụ đề ${st.subtitleLanguage}` : ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={STATUS_TONE[st.status as ShowtimeStatusType] ?? "gray"}>
                          {SHOWTIME_STATUS_LABEL[st.status as ShowtimeStatusType] ?? st.status}
                        </Badge>
                        {canUpdate && targets.length > 0 && (
                          <select
                            value=""
                            disabled={busy}
                            onChange={(e) => e.target.value && changeStatus(st, e.target.value as ShowtimeStatusType)}
                            className="h-7 rounded border border-[#1F2937] bg-[#0B0F19] px-1 text-xs text-[#9CA3AF]"
                            aria-label={`Đổi trạng thái suất ${st.id}`}
                          >
                            <option value="">Đổi…</option>
                            {targets.map((t) => <option key={t} value={t}>{SHOWTIME_STATUS_LABEL[t]}</option>)}
                          </select>
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

      {creating && (
        <ShowtimeCreateModal
          cineplexes={cineplexes}
          onClose={() => setCreating(false)}
          onCreated={(text) => {
            setCreating(false);
            setNotice({ kind: "success", text });
            refetch();
          }}
        />
      )}
    </div>
  );
}

function ShowtimeCreateModal({
  cineplexes,
  onClose,
  onCreated,
}: {
  cineplexes: Option[];
  onClose: () => void;
  onCreated: (text: string) => void;
}) {
  const [values, setValues] = useState<ShowtimeFormValues>(emptyShowtimeForm);
  const [errors, setErrors] = useState<ShowtimeFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [movies, setMovies] = useState<(Option & { durationMinutes: number })[]>([]);
  const [rooms, setRooms] = useState<{ cineplexId: string; list: Option[] } | null>(null);

  useEffect(() => {
    adminShowtimeService.schedulableMovies().then(setMovies).catch(() => setMovies([]));
  }, []);

  useEffect(() => {
    if (!values.cineplexId) return;
    let cancelled = false;
    adminShowtimeService
      .auditoriums(values.cineplexId)
      .then((list) => !cancelled && setRooms({ cineplexId: values.cineplexId, list }))
      .catch(() => !cancelled && setRooms({ cineplexId: values.cineplexId, list: [] }));
    return () => {
      cancelled = true;
    };
  }, [values.cineplexId]);

  const roomOptions = rooms && rooms.cineplexId === values.cineplexId ? rooms.list : [];
  const movie = useMemo(() => movies.find((m) => m.id === values.movieId), [movies, values.movieId]);
  const end = estimateEnd(values.startLocal, movie?.durationMinutes, Number(values.cleaningMinutes) || 0);

  const set = <K extends keyof ShowtimeFormValues>(k: K, v: ShowtimeFormValues[K]) => {
    setValues((s) => ({ ...s, [k]: v, ...(k === "cineplexId" ? { auditoriumId: "" } : {}) }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const check = validateShowtimeForm(values);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setSaving(true);
    try {
      const created = await adminShowtimeService.create(check.payload);
      onCreated(`Đã tạo suất #${created?.id ?? ""} cho “${movie?.name ?? "phim"}” lúc ${formatDateTime(check.payload.startTime)}`);
    } catch (err) {
      // Trùng giờ trong cùng phòng → backend trả lỗi (kiểm tra + ràng buộc EXCLUDE trong PostgreSQL)
      setFormError(errorText(err, "Tạo suất chiếu thất bại"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Tạo suất chiếu" onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && <Notice kind="error">{formError}</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phim" required error={errors.movieId} className="sm:col-span-2">
            <select className={inputClass(errors.movieId)} value={values.movieId} onChange={(e) => set("movieId", e.target.value)}>
              <option value="">— Chọn phim đang/sắp chiếu —</option>
              {movies.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.durationMinutes} phút)</option>)}
            </select>
          </Field>
          <Field label="Cụm rạp" required error={errors.cineplexId}>
            <select className={inputClass(errors.cineplexId)} value={values.cineplexId} onChange={(e) => set("cineplexId", e.target.value)}>
              <option value="">— Chọn —</option>
              {cineplexes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Phòng chiếu" required error={errors.auditoriumId}>
            <select className={inputClass(errors.auditoriumId)} value={values.auditoriumId} disabled={!values.cineplexId} onChange={(e) => set("auditoriumId", e.target.value)}>
              <option value="">{values.cineplexId ? "— Chọn —" : "Chọn cụm rạp trước"}</option>
              {roomOptions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Giờ bắt đầu" required error={errors.startLocal}>
            <input type="datetime-local" className={inputClass(errors.startLocal)} value={values.startLocal} onChange={(e) => set("startLocal", e.target.value)} />
          </Field>
          <Field label="Dọn phòng (phút)" required error={errors.cleaningMinutes}>
            <input inputMode="numeric" className={inputClass(errors.cleaningMinutes)} value={values.cleaningMinutes} onChange={(e) => set("cleaningMinutes", e.target.value)} />
          </Field>
          <Field label="Định dạng" required>
            <select className={inputClass()} value={values.projectionType} onChange={(e) => set("projectionType", e.target.value as ShowtimeFormValues["projectionType"])}>
              {PROJECTION_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Âm thanh" required error={errors.audioLanguage}>
            <input className={inputClass(errors.audioLanguage)} value={values.audioLanguage} onChange={(e) => set("audioLanguage", e.target.value)} />
          </Field>
          <Field label="Phụ đề" error={errors.subtitleLanguage}>
            <input className={inputClass(errors.subtitleLanguage)} placeholder="Để trống nếu không có" value={values.subtitleLanguage} onChange={(e) => set("subtitleLanguage", e.target.value)} />
          </Field>
        </div>
        {end && (
          <p className="text-xs text-[#9CA3AF]">
            Phòng bận đến khoảng <span className="text-white">{end.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span>. Nếu trùng với suất khác trong cùng phòng, hệ thống sẽ từ chối.
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>Hủy</button>
          <button type="submit" disabled={saving} className={primaryBtn}>{saving ? "Đang tạo..." : "Tạo suất"}</button>
        </div>
      </form>
    </Modal>
  );
}
