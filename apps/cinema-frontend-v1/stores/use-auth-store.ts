import { create } from "zustand";
import type { AuthUser } from "@/features/auth/types/auth.type";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  setAuth: (
    user: AuthUser,
    accessToken: string,
    refreshToken?: string,
    remember?: boolean,
  ) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: (user, accessToken, refreshToken, remember = true) => {
    if (typeof window !== "undefined") {
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem("accessToken", accessToken);
      if (refreshToken) {
        storage.setItem("refreshToken", refreshToken);
      }
      storage.setItem("authUser", JSON.stringify(user));
    }
    set({
      user,
      accessToken,
      refreshToken: refreshToken ?? null,
      isAuthenticated: true,
      isInitialized: true,
    });
  },

  setTokens: (accessToken, refreshToken) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }
    }
    set((state) => ({
      ...state,
      accessToken,
      refreshToken: refreshToken ?? state.refreshToken,
    }));
  },

  updateUser: (partialUser) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updated = { ...currentUser, ...partialUser };
    if (typeof window !== "undefined") {
      localStorage.setItem("authUser", JSON.stringify(updated));
    }
    set({ user: updated });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("authUser");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
      sessionStorage.removeItem("authUser");
    }
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitialized: true,
    });
  },

  initAuth: () => {
    if (typeof window === "undefined" || get().isInitialized) return;

    try {
      const token =
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("accessToken");
      const refreshToken =
        localStorage.getItem("refreshToken") ||
        sessionStorage.getItem("refreshToken");
      const rawUser =
        localStorage.getItem("authUser") ||
        sessionStorage.getItem("authUser");

      if (token && rawUser) {
        const user = JSON.parse(rawUser) as AuthUser;
        set({
          user,
          accessToken: token,
          refreshToken: refreshToken ?? null,
          isAuthenticated: true,
          isInitialized: true,
        });
        return;
      }
    } catch {
      // Ignored if JSON parsing fails
    }

    set({ isInitialized: true });
  },
}));
