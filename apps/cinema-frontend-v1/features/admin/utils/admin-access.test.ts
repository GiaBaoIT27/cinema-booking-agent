import { describe, expect, it } from "vitest";
import {
  canAccessAdmin,
  hasPermission,
  resolvePostLoginRedirect,
  visibleSections,
} from "./admin-access";

const admin = { roles: ["SUPER_ADMIN"], permissions: ["movie:view", "movie:create"] };
const customer = { roles: ["CUSTOMER"], permissions: [] };

describe("admin-access", () => {
  it("chỉ cho vào khu quản trị khi có quyền movie:view", () => {
    expect(canAccessAdmin(admin)).toBe(true);
    expect(canAccessAdmin(customer)).toBe(false);
    expect(canAccessAdmin(null)).toBe(false);
    // Có role tên admin nhưng không có quyền → vẫn không vào
    expect(canAccessAdmin({ roles: ["SUPER_ADMIN"] })).toBe(false);
  });

  it("hasPermission kiểm tra đúng từng quyền", () => {
    expect(hasPermission(admin, "movie:create")).toBe(true);
    expect(hasPermission(admin, "movie:delete")).toBe(false);
  });

  it("chỉ hiện mục quản trị mà tài khoản có quyền", () => {
    const manager = { roles: ["CINEMA_MANAGER"], permissions: ["movie:view", "showtime:create", "user:view"] };
    expect(visibleSections(manager).map((s) => s.key)).toEqual(["movies", "showtimes", "users"]);
    const fnbOnly = { roles: ["X"], permissions: ["fnb:update"] };
    expect(canAccessAdmin(fnbOnly)).toBe(true);
    expect(resolvePostLoginRedirect(null, fnbOnly)).toBe("/admin/fnb");
  });

  it("chọn trang đích sau đăng nhập", () => {
    expect(resolvePostLoginRedirect(null, admin)).toBe("/admin/movies");
    expect(resolvePostLoginRedirect(null, customer)).toBe("/");
    expect(resolvePostLoginRedirect("/booking/checkout", admin)).toBe("/booking/checkout");
    // Chặn open redirect sang domain khác
    expect(resolvePostLoginRedirect("//evil.com", customer)).toBe("/");
    expect(resolvePostLoginRedirect("https://evil.com", customer)).toBe("/");
  });
});
