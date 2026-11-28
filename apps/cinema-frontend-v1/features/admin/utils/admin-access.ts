import type { AuthUser } from "@/features/auth/types/auth.type";

type UserLike = Pick<AuthUser, "roles" | "permissions"> | null | undefined;

export type AdminGroup = "Nội dung" | "Rạp" | "Kinh doanh" | "Hệ thống";

export interface AdminSection {
  key:
    | "movies"
    | "showtimes"
    | "distributors"
    | "cineplexes"
    | "auditoriums"
    | "seatTypes"
    | "fnb"
    | "promotions"
    | "orders"
    | "users";
  href: string;
  label: string;
  group: AdminGroup;
  /** Quyền tối thiểu để thấy mục này (khớp seed 10-role-permissions). */
  permission: string;
}

export const ADMIN_SECTIONS: AdminSection[] = [
  { key: "movies", href: "/admin/movies", label: "Quản lý phim", group: "Nội dung", permission: "movie:view" },
  { key: "showtimes", href: "/admin/showtimes", label: "Suất chiếu", group: "Nội dung", permission: "showtime:create" },
  { key: "distributors", href: "/admin/distributors", label: "Nhà phát hành", group: "Nội dung", permission: "distributor:view" },
  { key: "cineplexes", href: "/admin/cineplexes", label: "Rạp chiếu", group: "Rạp", permission: "cinema:manage" },
  { key: "auditoriums", href: "/admin/auditoriums", label: "Phòng chiếu", group: "Rạp", permission: "auditorium:view" },
  { key: "seatTypes", href: "/admin/seat-types", label: "Loại ghế", group: "Rạp", permission: "seat_type:update" },
  { key: "fnb", href: "/admin/fnb", label: "Bắp nước", group: "Kinh doanh", permission: "fnb:update" },
  { key: "promotions", href: "/admin/promotions", label: "Khuyến mãi", group: "Kinh doanh", permission: "promo:view" },
  { key: "orders", href: "/admin/orders", label: "Đơn hàng", group: "Kinh doanh", permission: "order:manage" },
  { key: "users", href: "/admin/users", label: "Người dùng", group: "Hệ thống", permission: "user:view" },
];

export function hasPermission(user: UserLike, permission: string): boolean {
  if (!user) return false;
  return (user.permissions ?? []).includes(permission);
}

export function visibleSections(user: UserLike): AdminSection[] {
  return ADMIN_SECTIONS.filter((s) => hasPermission(user, s.permission));
}

/** Gom theo nhóm, giữ thứ tự xuất hiện; nhóm không còn mục nào thì bỏ. */
export function groupSections(sections: AdminSection[]): [AdminGroup, AdminSection[]][] {
  const map = new Map<AdminGroup, AdminSection[]>();
  for (const s of sections) map.set(s.group, [...(map.get(s.group) ?? []), s]);
  return [...map.entries()];
}

/**
 * Chỉ để ẩn/hiện giao diện. Backend vẫn kiểm tra quyền ở từng API
 * (PermissionsGuard + @RequirePermissions), nên sửa localStorage cũng không gọi được API.
 */
export function canAccessAdmin(user: UserLike): boolean {
  return visibleSections(user).length > 0;
}

/** Trang đích sau khi đăng nhập: redirect trong URL được ưu tiên, sau đó tới mục quản trị đầu tiên. */
export function resolvePostLoginRedirect(
  redirectParam: string | null,
  user: UserLike,
): string {
  if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
    return redirectParam;
  }
  return visibleSections(user)[0]?.href ?? "/";
}
