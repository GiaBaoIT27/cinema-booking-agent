"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Eye, EyeOff, LoaderCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { registerSchema, type RegisterInput } from "../schemas/auth.schema";

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const onSubmit: SubmitHandler<RegisterInput> = async (data) => {
    try {
      // TODO: Gọi API Đăng ký tại đây
      console.log("Register Payload:", data);
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Họ và tên */}
      <div className="space-y-1.5">
        <label
          htmlFor="fullName"
          className="block text-[13px] font-medium text-[#F3F4F6]"
        >
          Họ và tên <span className="text-[#EF4444]">*</span>
        </label>
        <Input
          id="fullName"
          placeholder="Ví dụ: Nguyễn Văn A"
          error={errors.fullName?.message}
          {...register("fullName")}
        />
      </div>

      {/* Ngày sinh */}
      <div className="space-y-1.5">
        <label
          htmlFor="dateOfBirth"
          className="block text-[13px] font-medium text-[#F3F4F6]"
        >
          Ngày sinh <span className="text-[#EF4444]">*</span>
        </label>
        <div className="relative">
          <Input
            id="dateOfBirth"
            type="date"
            placeholder="dd/mm/yyyy"
            className="pr-10 scheme:dark"
            error={errors.dateOfBirth?.message}
            {...register("dateOfBirth")}
          />
          <Calendar
            size={18}
            className="pointer-events-none absolute right-3 top-3.5 text-[#6B7280]"
          />
        </div>
      </div>

      {/* Số điện thoại */}
      <div className="space-y-1.5">
        <label
          htmlFor="phone"
          className="block text-[13px] font-medium text-[#F3F4F6]"
        >
          Số điện thoại <span className="text-[#EF4444]">*</span>
        </label>
        <Input
          id="phone"
          type="tel"
          placeholder="Ví dụ: 0912xxxxxx"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-[13px] font-medium text-[#F3F4F6]"
        >
          Email <span className="text-[#EF4444]">*</span>
        </label>
        <Input
          id="email"
          type="email"
          placeholder="example@gmail.com"
          error={errors.email?.message}
          {...register("email")}
        />
      </div>

      {/* Mật khẩu */}
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-[13px] font-medium text-[#F3F4F6]"
        >
          Mật khẩu <span className="text-[#EF4444]">*</span>
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Tối thiểu 8 ký tự, có 1 chữ hoa"
            className="pr-11"
            error={errors.password?.message}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-3.5 text-[#6B7280] transition hover:text-white"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Xác thực mật khẩu */}
      <div className="space-y-1.5">
        <label
          htmlFor="confirmPassword"
          className="block text-[13px] font-medium text-[#F3F4F6]"
        >
          Xác thực mật khẩu <span className="text-[#EF4444]">*</span>
        </label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Nhập lại mật khẩu phía trên"
            className="pr-11"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute right-3 top-3.5 text-[#6B7280] transition hover:text-white"
            aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Điều khoản */}
      <div className="pt-2">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            {...register("acceptTerms")}
            className="mt-0.5 h-4 w-4 rounded border-[#374151] bg-[#0B0F19] accent-[#EF4444]"
          />
          <span className="text-[12px] leading-5 text-[#9CA3AF]">
            Khách hàng đã đồng ý các điều khoản, điều kiện của thành viên Cinema
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="mt-1 text-[12px] text-red-500">
            {errors.acceptTerms.message}
          </p>
        )}
      </div>

      {/* Nút Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#EF4444] text-[15px] font-bold tracking-wide text-white transition hover:bg-[#F87171] active:scale-[0.99] disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <LoaderCircle size={16} className="animate-spin" />
            Đang xử lý...
          </>
        ) : (
          "Đăng ký"
        )}
      </button>
    </form>
  );
}
