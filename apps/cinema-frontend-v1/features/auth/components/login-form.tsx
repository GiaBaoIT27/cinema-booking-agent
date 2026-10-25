"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, LoaderCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "../schemas/auth.schema";
import { useLogin } from "../hooks/use-login";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, errorMessage, clearError } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
      remember: true,
    },
  });

  const isBusy = isSubmitting || isLoading;

  const onSubmit: SubmitHandler<LoginInput> = async (data) => {
    clearError();
    await login(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Server Error Alert Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-950/40 p-3.5 text-red-200 backdrop-blur-sm animate-in fade-in"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
          <div className="flex-1 text-[13px] leading-relaxed">
            <p className="font-medium text-red-300">Đăng nhập không thành công</p>
            <p className="mt-0.5 text-red-200/90">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Identifier field */}
      <div className="space-y-2">
        <label
          htmlFor="identifier"
          className="block text-[14px] font-medium text-[#F3F4F6]"
        >
          Email hoặc số điện thoại
        </label>
        <Input
          id="identifier"
          placeholder="Nhập email hoặc số điện thoại"
          autoComplete="username"
          disabled={isBusy}
          error={errors.identifier?.message}
          {...register("identifier", {
            onChange: () => {
              if (errorMessage) clearError();
            },
          })}
        />
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-[14px] font-medium text-[#F3F4F6]"
        >
          Mật khẩu
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            disabled={isBusy}
            className="pr-11"
            error={errors.password?.message}
            {...register("password", {
              onChange: () => {
                if (errorMessage) clearError();
              },
            })}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isBusy}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute right-3 top-3.5 text-[#6B7280] hover:text-white transition disabled:opacity-50"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            disabled={isBusy}
            {...register("remember")}
            className="h-4 w-4 rounded border-[#374151] bg-[#0B0F19] accent-[#EF4444]"
          />
          <span className="text-[12px] text-[#9CA3AF]">Ghi nhớ đăng nhập</span>
        </label>

        <Link
          href="/forgot-password"
          className="text-[12px] font-medium text-[#EF4444] hover:text-[#F87171]"
        >
          Quên mật khẩu?
        </Link>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isBusy}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#EF4444] text-[16px] font-bold text-white transition hover:bg-[#F87171] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {isBusy ? (
          <>
            <LoaderCircle size={18} className="animate-spin" />
            Đang đăng nhập...
          </>
        ) : (
          "Đăng nhập"
        )}
      </button>

      {/* Security note */}
      <div className="mt-6 border-t border-[#1F2937] pt-5 text-center">
        <p className="text-[11px] leading-5 text-[#6B7280]">
          Bằng việc đăng nhập, bạn đồng ý với{" "}
          <Link
            href="/terms"
            className="text-[#9CA3AF] underline underline-offset-2 hover:text-white"
          >
            Điều khoản sử dụng
          </Link>{" "}
          của chúng tôi.
        </p>
      </div>
    </form>
  );
}
