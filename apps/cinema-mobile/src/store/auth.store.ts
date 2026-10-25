import { create } from "zustand";
import { configureAuthHandlers } from "@/lib/api-client";
import { tokenStorage } from "@/lib/token-storage";
import { authService } from "@/features/auth/services/auth.service";
import type {
  AuthUser,
  LoginPayload,
  UserProfile,
} from "@/features/auth/types/auth.types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  /** Hồ sơ đầy đủ từ `GET /users/me` (null nếu chưa tải được). */
  user: UserProfile | null;
  /** Đang tải hồ sơ (màn hình tài khoản hiển thị spinner). */
  loadingProfile: boolean;
  /** Lỗi khi tải hồ sơ thất bại (mạng chết chẳng hạn). */
  profileError: string | null;
  /** Gọi một lần khi mở app: đọc token đã lưu và nạp hồ sơ. */
  hydrate: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  /** Tải lại hồ sơ từ `GET /users/me`. */
  loadProfile: () => Promise<void>;
  /** Đăng xuất: chỉ xoá phiên cục bộ (backend không có endpoint logout). */
  logout: () => Promise<void>;
}

/** Chuyển user của response login sang dạng hồ sơ để hiển thị ngay. */
function toProfile(user: AuthUser): UserProfile {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    dateOfBirth: null,
    membershipTier: user.membershipTier,
    loyaltyPoints: 0,
    status: "ACTIVE",
    createdAt: "",
    updatedAt: "",
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,
  loadingProfile: false,
  profileError: null,

  async hydrate() {
    // tokenStorage tự loại bỏ phiên đã hết hạn (backend không có refresh endpoint).
    const session = await tokenStorage.getSession();
    if (!session) {
      set({ status: "unauthenticated", user: null });
      return;
    }
    set({ status: "authenticated", user: null });
    await get().loadProfile();
  },

  async login(payload) {
    const result = await authService.login(payload);
    await tokenStorage.set(result);
    set({
      status: "authenticated",
      user: toProfile(result.user),
      profileError: null,
    });
    // Nạp hồ sơ đầy đủ (điểm thưởng, ngày sinh, trạng thái) từ `GET /users/me`.
    await get().loadProfile();
  },

  async loadProfile() {
    if (get().status !== "authenticated") return;
    set({ loadingProfile: true, profileError: null });
    try {
      const profile = await authService.fetchProfile();
      set({ user: profile, loadingProfile: false });
    } catch (error) {
      // Lỗi 401 đã được api-client xử lý (xoá phiên cục bộ + onAuthFailure
      // đặt lại trạng thái) → không gán lỗi để tránh báo sai cho người dùng.
      if (get().status !== "authenticated") return;
      // Lỗi mạng không nên đăng xuất người dùng.
      set({
        loadingProfile: false,
        profileError:
          error instanceof Error ? error.message : "Không tải được hồ sơ.",
      });
    }
  },

  async logout() {
    // Backend không có `POST /auth/logout` → chỉ xoá phiên cục bộ.
    await tokenStorage.clear();
    set({
      status: "unauthenticated",
      user: null,
      loadingProfile: false,
      profileError: null,
    });
  },
}));

configureAuthHandlers({
  onAuthFailure() {
    void tokenStorage.clear();
    useAuthStore.setState({
      status: "unauthenticated",
      user: null,
      loadingProfile: false,
      profileError: null,
    });
  },
});
