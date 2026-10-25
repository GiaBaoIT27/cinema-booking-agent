"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "../services/auth.service";
import { useAuthStore } from "@/stores/use-auth-store";
import { ApiError } from "@/lib/api-client";
import type { LoginInput } from "../schemas/auth.schema";

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const login = async (data: LoginInput): Promise<boolean> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await authService.login({
        username: data.identifier.trim(),
        password: data.password,
      });

      // Lưu trữ user và tokens vào Zustand store & Web Storage
      setAuth(
        response.user,
        response.accessToken,
        response.refreshToken,
        data.remember,
      );

      // Chuyển hướng người dùng (nếu có callback URL từ query params hoặc về trang chủ)
      const redirectUrl = searchParams.get("redirect") || "/";
      router.push(redirectUrl);
      router.refresh();

      return true;
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setErrorMessage(null);

  return {
    login,
    isLoading,
    errorMessage,
    clearError,
  };
}

