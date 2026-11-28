export type UserStatusType = "ACTIVE" | "UNVERIFIED" | "BLOCKED";

export const USER_STATUS_LABEL: Record<UserStatusType, string> = {
  ACTIVE: "Hoạt động",
  UNVERIFIED: "Chưa xác minh",
  BLOCKED: "Đã khóa",
};

export interface AdminUserListItem {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  membershipTier: string;
  loyaltyPoints: number;
  status: string;
  createdAt: string;
}

export interface AdminUserRole {
  roleId: string;
  roleCode: string;
  roleName: string;
  cineplexId: number | null;
  cineplexName: string;
}

export interface AdminUserDetail extends AdminUserListItem {
  dateOfBirth?: string | null;
  roles: AdminUserRole[];
}

export interface RoleOption {
  id: string;
  code: string;
  name: string;
}

/** Vai trò nội bộ gắn với một cụm rạp (backend trả CINEPLEX_SCOPE_REQUIRED nếu thiếu). */
export const CINEPLEX_SCOPED_ROLES = ["CINEMA_MANAGER", "CINEMA_STAFF"];

export function requiresCineplex(roleCode: string | undefined): boolean {
  return !!roleCode && CINEPLEX_SCOPED_ROLES.includes(roleCode);
}

/** Người không phải SUPER_ADMIN không được cấp vai trò SUPER_ADMIN (backend cũng chặn). */
export function assignableRoles(roles: RoleOption[], callerRoles: string[]): RoleOption[] {
  const isSuper = callerRoles.includes("SUPER_ADMIN");
  return roles.filter((r) => isSuper || r.code !== "SUPER_ADMIN");
}

/** Lý do khóa bắt buộc 10–500 ký tự (UpdateStatusDto). Trả về thông báo lỗi hoặc null. */
export function validateBlockReason(reason: string): string | null {
  const t = reason.trim();
  if (t.length < 10) return "Lý do khóa cần ít nhất 10 ký tự";
  if (t.length > 500) return "Lý do khóa tối đa 500 ký tự";
  return null;
}

export interface StaffFormValues {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  roleId: string;
  cineplexId: string;
}

export type StaffFormErrors = Partial<Record<keyof StaffFormValues, string>>;

export const emptyStaffForm: StaffFormValues = {
  fullName: "",
  email: "",
  phoneNumber: "",
  password: "",
  roleId: "",
  cineplexId: "",
};

/** Khớp CreateInternalUserDto: SĐT Việt Nam 10 số, mật khẩu có chữ hoa, chữ thường, số. */
export function validateStaffForm(v: StaffFormValues, roles: RoleOption[]): StaffFormErrors {
  const e: StaffFormErrors = {};
  if (v.fullName.trim().length < 2) e.fullName = "Nhập họ tên";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Email không hợp lệ";
  if (!/^0[35789]\d{8}$/.test(v.phoneNumber.trim())) e.phoneNumber = "SĐT gồm 10 số, bắt đầu 03/05/07/08/09";
  if (v.password.length < 8) e.password = "Mật khẩu tối thiểu 8 ký tự";
  else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(v.password)) e.password = "Cần chữ hoa, chữ thường và số";
  if (!v.roleId) e.roleId = "Chọn vai trò";
  const role = roles.find((r) => r.id === v.roleId);
  if (requiresCineplex(role?.code) && !v.cineplexId) e.cineplexId = "Vai trò này cần chọn cụm rạp";
  return e;
}
