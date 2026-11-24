"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "../services/auth.service";
import { useAuthStore } from "@/stores/use-auth-store";
import type { RegisterInput } from "../schemas/auth.schema";
import { registerAndLogin } from "../utils/register-flow";

export function useRegister() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const register = async (data: RegisterInput): Promise<boolean> => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const outcome = await registerAndLogin(authService, data);

      if (outcome.kind === "failed") {
        setErrorMessage(outcome.message);
        return false;
      }

      if (outcome.kind === "logged-in") {
        const { user, accessToken, refreshToken } = outcome.session;
        setAuth(user, accessToken, refreshToken, true);
        router.push("/");
        router.refresh();
        return true;
      }

      // Tài khoản đã tạo nhưng tự đăng nhập lỗi => sang trang đăng nhập
      router.push(`/login?registered=1&email=${encodeURIComponent(outcome.email)}`);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setErrorMessage(null);

  return { register, isLoading, errorMessage, clearError };
}
