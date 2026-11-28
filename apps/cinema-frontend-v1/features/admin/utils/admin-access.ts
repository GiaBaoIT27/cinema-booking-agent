import type { AuthUser } from "@/features/auth/types/auth.type";

type UserLike = Pick<AuthUser, "roles" | "permissions"> | null | undefined;

export interface AdminSection {
  key: "movies" | "showtimes" | "cineplexes" | "auditoriums" | "fnb" | "orders" | "users";
  href: string;
  label: string;
  /** Quyền tối thiểu để thấy mục này (khớp seed 10-role-permissions). */
  permission: string;
}

export const ADMIN_SECTIONS: AdminSection[] = [
  { key: "movies", href: "/admin/movies", label: "Quản lý phim", permission: "movie:view" },
  { key: "showtimes", href: "/admin/showtimes", label: "Suất chiếu", permission: "showtime:create" },
  { key: "cineplexes", href: "/admin/cineplexes", label: "Rạp chiếu", permission: "cinema:manage" },
  { key: "auditoriums", href: "/admin/auditoriums", label: "Phòng chiếu", permission: "auditorium:view" },
  { key: "fnb", href: "/admin/fnb", label: "Bắp nước", permission: "fnb:update" },
  { key: "orders", href: "/admin/orders", label: "Đơn hàng", permission: "order:manage" },
  { key: "users", href: "/admin/users", label: "Người dùng", permission: "user:view" },
];

export function hasPermission(user: UserLike, permission: string): boolean {
  if (!user) return false;
  return (user.permissions ?? []).includes(permission);
}

export function visibleSections(user: UserLike): AdminSection[] {
  return ADMIN_SECTIONS.filter((s) => hasPermission(user, s.permission));
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
