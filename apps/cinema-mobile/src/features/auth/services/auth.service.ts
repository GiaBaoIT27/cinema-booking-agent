import { apiClient } from "@/lib/api-client";
import type { LoginPayload, LoginResult, UserProfile } from "../types/auth.types";

/**
 * Endpoint đúng theo backend (prefix chung đã nằm trong API_URL = /api/v1):
 * - `POST /auth/login` (public)          → accessToken + user
 * - `GET  /users/me`   (cần Bearer token) → hồ sơ đầy đủ
 *
 * Backend KHÔNG có `/auth/refresh` và `/auth/logout`, nên không gọi hai route đó.
 */
const ENDPOINTS = {
  login: "/auth/login",
  me: "/users/me",
} as const;

export const authService = {
  /**
   * `POST /api/v1/auth/login`
   * @param payload `username` = email hoặc số điện thoại, `password` tối thiểu 8 ký tự.
   */
  async login(payload: LoginPayload): Promise<LoginResult> {
    const result = await apiClient.post<LoginResult>(ENDPOINTS.login, payload, {
      auth: false,
    });
    if (!result?.accessToken) {
      throw new Error("Phản hồi đăng nhập không hợp lệ: thiếu accessToken.");
    }
    return result;
  },

  /**
   * `GET /api/v1/users/me` — endpoint được bảo vệ, api-client tự gắn
   * header `Authorization: Bearer <accessToken>`.
   */
  fetchProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>(ENDPOINTS.me);
  },
};
