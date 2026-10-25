import { apiClient } from "@/lib/api-client";
import type { LoginPayload, LoginResponseData } from "../types/auth.type";

export const authService = {
  /**
   * Đăng nhập người dùng bằng email hoặc số điện thoại + mật khẩu
   * POST /api/v1/auth/login
   */
  async login(payload: LoginPayload): Promise<LoginResponseData> {
    return apiClient.post<LoginResponseData>("/auth/login", payload);
  },

  /**
   * Đăng xuất phiên làm việc hiện tại
   */
  async logout(accessToken?: string): Promise<void> {
    try {
      // Backend có thể có endpoint POST /auth/logout
      await apiClient.post("/auth/logout", { accessToken });
    } catch {
      // Best-effort logout, ignore server errors on logout
    }
  },
};

