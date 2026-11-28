"use client";

import { useEffect, useState } from "react";
import { MailWarning, UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { countOf, useStats } from "../hooks/use-stats";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/use-auth-store";
import { usePaged } from "../hooks/use-paged";
import {
  adminShowtimeService,
  adminUserService,
  type Option,
} from "../services/admin-catalog.service";
import { hasPermission } from "../utils/admin-access";
import {
  USER_STATUS_LABEL,
  assignableRoles,
  emptyStaffForm,
  requiresCineplex,
  validateBlockReason,
  validateStaffForm,
  type AdminUserDetail,
  type AdminUserListItem,
  type RoleOption,
  type StaffFormErrors,
  type StaffFormValues,
  type UserStatusType,
} from "../utils/user-admin";
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

const STATUS_TONE: Record<UserStatusType, "green" | "amber" | "red"> = {
  ACTIVE: "green",
  UNVERIFIED: "amber",
  BLOCKED: "red",
};

function StatusBadge({ status }: { status: string }) {
  const s = status as UserStatusType;
  return <Badge tone={STATUS_TONE[s] ?? "amber"}>{USER_STATUS_LABEL[s] ?? status}</Badge>;
}

export function AdminUserPage() {
  const me = useAuthStore((s) => s.user);
  const canCreate = hasPermission(me, "user:create") && hasPermission(me, "role:view");

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const { items, totalItems, totalPages, isLoading, error, refetch, version } = usePaged<AdminUserListItem>(
    [keyword, status, page].join("|"),
    () => adminUserService.list({ page, limit: PAGE_SIZE, keyword: keyword || undefined, status: status || undefined }),
  );

  const stat = useStats(
    {
      all: () => countOf("/users"),
      ACTIVE: () => countOf("/users", { status: "ACTIVE" }),
      UNVERIFIED: () => countOf("/users", { status: "UNVERIFIED" }),
      BLOCKED: () => countOf("/users", { status: "BLOCKED" }),
    },
    version,
  );
  const pick = (s: string) => () => {
    setPage(1);
    setKeyword("");
    setStatus(s);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Người dùng" subtitle={`${totalItems} tài khoản`} />

      <StatCards
        items={[
          { label: "Tổng tài khoản", value: stat("all"), tone: "red", icon: Users, onClick: pick(""), active: !status && !keyword },
          { label: "Đang hoạt động", value: stat("ACTIVE"), tone: "green", icon: UserCheck, onClick: pick("ACTIVE"), active: status === "ACTIVE" },
          { label: "Chưa xác minh", value: stat("UNVERIFIED"), tone: "amber", icon: MailWarning, onClick: pick("UNVERIFIED"), active: status === "UNVERIFIED" },
          { label: "Đã khóa", value: stat("BLOCKED"), tone: "gray", icon: UserX, onClick: pick("BLOCKED"), active: status === "BLOCKED" },
        ]}
      />

      <Toolbar
        actions={
          canCreate && (
            <button type="button" onClick={() => setCreating(true)} className={toolbarBtn}>
              <UserPlus size={16} /> Tạo nhân viên
            </button>
          )
        }
      >
        <SearchBox value={keyword} placeholder="Tìm theo tên, email hoặc SĐT..." onSearch={(v) => { setPage(1); setKeyword(v); }} />
        <select aria-label="Trạng thái" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className={filterClass}>
          <option value="">Tất cả trạng thái</option>
          {(Object.keys(USER_STATUS_LABEL) as UserStatusType[]).map((s) => <option key={s} value={s}>{USER_STATUS_LABEL[s]}</option>)}
        </select>
        <ClearFilters show={!!(keyword || status)} onClear={() => { setPage(1); setKeyword(""); setStatus(""); }} />
      </Toolbar>

      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      {error && <Notice kind="error">Không tải được danh sách: {error}</Notice>}

      <div className="overflow-x-auto rounded-xl border border-[#1F2937]">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-[#0B0F19] text-left text-xs uppercase tracking-wide text-[#6B7280]">
            <tr>
              <th className="px-4 py-3">Người dùng</th>
              <th className="px-4 py-3">SĐT</th>
              <th className="px-4 py-3">Hạng</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2937]">
            {isLoading && <tr><td colSpan={6} className="px-4 py-10 text-center text-[#6B7280]">Đang tải...</td></tr>}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[#6B7280]">Không có tài khoản nào khớp bộ lọc.</td></tr>
            )}
            {!isLoading &&
              items.map((u) => (
                <tr key={u.id} className="hover:bg-[#0B0F19]/60">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.fullName}</p>
                    <p className="text-xs text-[#6B7280]">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[#D1D5DB]">{u.phoneNumber}</td>
                  <td className="px-4 py-3 text-[#D1D5DB]">{u.membershipTier} · {u.loyaltyPoints} điểm</td>
                  <td className="px-4 py-3 text-[#D1D5DB]">{new Date(u.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => setSelected(u.id)} className="rounded px-2 py-1 text-xs text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white">
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pager page={page} totalPages={totalPages} onChange={setPage} />

      {selected && (
        <UserDetailModal
          userId={selected}
          onClose={() => setSelected(null)}
          onChanged={(text) => {
            setNotice({ kind: "success", text });
            refetch();
          }}
        />
      )}
      {creating && (
        <StaffCreateModal
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

/** Danh sách vai trò + cụm rạp dùng chung cho đổi vai trò và tạo nhân viên. */
function useRoleOptions(enabled: boolean) {
  const me = useAuthStore((s) => s.user);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [cineplexes, setCineplexes] = useState<Option[]>([]);
  useEffect(() => {
    if (!enabled) return;
    adminUserService.roles().then((r) => setRoles(assignableRoles(r, me?.roles ?? []))).catch(() => setRoles([]));
    adminShowtimeService.cineplexes().then(setCineplexes).catch(() => setCineplexes([]));
  }, [enabled, me]);
  return { roles, cineplexes };
}

function UserDetailModal({
  userId,
  onClose,
  onChanged,
}: {
  userId: string;
  onClose: () => void;
  onChanged: (text: string) => void;
}) {
  const me = useAuthStore((s) => s.user);
  const canStatus = hasPermission(me, "user:update_status");
  const canAssign = hasPermission(me, "user:assign_role") && hasPermission(me, "role:view");
  const { roles, cineplexes } = useRoleOptions(canAssign);

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [roleId, setRoleId] = useState("");
  const [cineplexId, setCineplexId] = useState("");

  useEffect(() => {
    let cancelled = false;
    adminUserService
      .detail(userId)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setRoleId(d.roles[0] ? String(d.roles[0].roleId) : "");
        setCineplexId(d.roles[0]?.cineplexId ? String(d.roles[0].cineplexId) : "");
      })
      .catch((err: unknown) => !cancelled && setLoadError(errorText(err, "Không tải được tài khoản")));
    return () => {
      cancelled = true;
    };
  }, [userId, reload]);

  const isSelf = me?.id !== undefined && String(me.id) === userId;
  const selectedRole = roles.find((r) => r.id === roleId);

  const run = async (action: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      onChanged(ok);
      setReload((n) => n + 1);
      setReason("");
    } catch (err) {
      setActionError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const block = () => {
    const msg = validateBlockReason(reason);
    setReasonError(msg);
    if (msg || !detail) return;
    run(() => adminUserService.setStatus(userId, "BLOCKED", reason.trim()), `Đã khóa tài khoản ${detail.email}`);
  };

  return (
    <Modal title="Chi tiết tài khoản" onClose={onClose} wide>
      {loadError && <Notice kind="error">{loadError}</Notice>}
      {!detail && !loadError && <p className="text-sm text-[#9CA3AF]">Đang tải...</p>}
      {detail && (
        <div className="space-y-5 text-sm">
          {actionError && <Notice kind="error">{actionError}</Notice>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Họ tên" value={detail.fullName} />
            <Info label="Trạng thái" value={<StatusBadge status={detail.status} />} />
            <Info label="Email" value={detail.email} />
            <Info label="SĐT" value={detail.phoneNumber} />
            <Info label="Hạng thành viên" value={`${detail.membershipTier} · ${detail.loyaltyPoints} điểm`} />
            <Info label="Ngày sinh" value={detail.dateOfBirth ? new Date(detail.dateOfBirth).toLocaleDateString("vi-VN") : "—"} />
            <Info
              label="Vai trò"
              value={
                detail.roles.length === 0
                  ? "Khách hàng"
                  : detail.roles.map((r) => `${r.roleCode}${r.cineplexId ? ` · ${r.cineplexName}` : ""}`).join(", ")
              }
            />
          </div>

          {canStatus && !isSelf && (
            <section className="space-y-3 rounded-lg border border-[#1F2937] p-4">
              <h3 className="font-semibold">Trạng thái tài khoản</h3>
              {detail.status === "BLOCKED" ? (
                <button type="button" disabled={busy} className={secondaryBtn} onClick={() => run(() => adminUserService.setStatus(userId, "ACTIVE"), `Đã mở khóa ${detail.email}`)}>
                  Mở khóa tài khoản
                </button>
              ) : (
                <div className="space-y-2">
                  <Field label="Lý do khóa (10–500 ký tự, lưu để hậu kiểm)" error={reasonError ?? undefined}>
                    <input className={inputClass(reasonError ?? undefined)} value={reason} onChange={(e) => { setReason(e.target.value); setReasonError(null); }} />
                  </Field>
                  <button type="button" disabled={busy} onClick={block} className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-300 hover:bg-red-950/40 disabled:opacity-60">
                    Khóa tài khoản
                  </button>
                </div>
              )}
            </section>
          )}

          {canAssign && !isSelf && (
            <section className="space-y-3 rounded-lg border border-[#1F2937] p-4">
              <h3 className="font-semibold">Phân quyền</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Vai trò">
                  <select className={inputClass()} value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                    <option value="">— Chọn —</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.code} – {r.name}</option>)}
                  </select>
                </Field>
                {requiresCineplex(selectedRole?.code) && (
                  <Field label="Cụm rạp phụ trách">
                    <select className={inputClass()} value={cineplexId} onChange={(e) => setCineplexId(e.target.value)}>
                      <option value="">— Chọn —</option>
                      {cineplexes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                )}
              </div>
              <button
                type="button"
                disabled={busy || !roleId || (requiresCineplex(selectedRole?.code) && !cineplexId)}
                className={primaryBtn}
                onClick={() =>
                  run(
                    () => adminUserService.assignRole(userId, roleId, requiresCineplex(selectedRole?.code) ? cineplexId : undefined),
                    `Đã đổi vai trò của ${detail.email} thành ${selectedRole?.code ?? ""}`,
                  )
                }
              >
                Lưu vai trò
              </button>
              <p className="text-xs text-[#6B7280]">Vai trò mới thay thế vai trò cũ. Người dùng cần đăng nhập lại để nhận quyền mới.</p>
            </section>
          )}
          {isSelf && <p className="text-xs text-[#6B7280]">Đây là tài khoản của bạn: không thể tự khóa hoặc tự đổi vai trò.</p>}
        </div>
      )}
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-[#6B7280]">{label}</p>
      <div className="mt-0.5 text-[#E5E7EB]">{value}</div>
    </div>
  );
}

function StaffCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (text: string) => void }) {
  const { roles, cineplexes } = useRoleOptions(true);
  const staffRoles = roles.filter((r) => r.code !== "CUSTOMER");
  const [values, setValues] = useState<StaffFormValues>(emptyStaffForm);
  const [errors, setErrors] = useState<StaffFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const role = staffRoles.find((r) => r.id === values.roleId);

  const set = <K extends keyof StaffFormValues>(k: K, v: StaffFormValues[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errs = validateStaffForm(values, staffRoles);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      await adminUserService.createStaff({ ...values, cineplexId: requiresCineplex(role?.code) ? values.cineplexId : "" });
      onCreated(`Đã tạo tài khoản ${values.email.trim()} (${role?.code})`);
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors: StaffFormErrors = {};
        for (const fe of err.errors ?? []) {
          if (fe.field && fe.field in emptyStaffForm) fieldErrors[fe.field as keyof StaffFormValues] = fe.message;
        }
        setErrors(fieldErrors);
      }
      setFormError(errorText(err, "Tạo tài khoản thất bại"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Tạo tài khoản nhân viên" onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && <Notice kind="error">{formError}</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ tên" required error={errors.fullName}>
            <input className={inputClass(errors.fullName)} value={values.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </Field>
          <Field label="Email" required error={errors.email}>
            <input type="email" className={inputClass(errors.email)} value={values.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Số điện thoại" required error={errors.phoneNumber}>
            <input inputMode="tel" className={inputClass(errors.phoneNumber)} value={values.phoneNumber} onChange={(e) => set("phoneNumber", e.target.value)} />
          </Field>
          <Field label="Mật khẩu khởi tạo" required error={errors.password}>
            <input type="password" autoComplete="new-password" className={inputClass(errors.password)} value={values.password} onChange={(e) => set("password", e.target.value)} />
          </Field>
          <Field label="Vai trò" required error={errors.roleId}>
            <select className={inputClass(errors.roleId)} value={values.roleId} onChange={(e) => set("roleId", e.target.value)}>
              <option value="">— Chọn —</option>
              {staffRoles.map((r) => <option key={r.id} value={r.id}>{r.code} – {r.name}</option>)}
            </select>
          </Field>
          {requiresCineplex(role?.code) && (
            <Field label="Cụm rạp phụ trách" required error={errors.cineplexId}>
              <select className={inputClass(errors.cineplexId)} value={values.cineplexId} onChange={(e) => set("cineplexId", e.target.value)}>
                <option value="">— Chọn —</option>
                {cineplexes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>Hủy</button>
          <button type="submit" disabled={saving} className={primaryBtn}>{saving ? "Đang tạo..." : "Tạo tài khoản"}</button>
        </div>
      </form>
    </Modal>
  );
}
