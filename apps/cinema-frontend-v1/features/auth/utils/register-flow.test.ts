import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api-client";
import type { RegisterInput } from "../schemas/auth.schema";
import { registerSchema } from "../schemas/auth.schema";
import {
  registerAndLogin,
  registerErrorMessage,
  toRegisterPayload,
  type RegisterAuthApi,
} from "./register-flow";

const input: RegisterInput = {
  fullName: "  Khách Test ",
  dateOfBirth: "2000-01-01",
  phone: "0399999123",
  email: " Khach.Test@Example.com ",
  password: "Test1234a",
  confirmPassword: "Test1234a",
  acceptTerms: true,
};

const api = (over: Partial<Record<keyof RegisterAuthApi, unknown>> = {}) =>
  ({
    register: vi.fn().mockResolvedValue({ id: "5" }),
    login: vi.fn().mockResolvedValue({ accessToken: "a", refreshToken: "r", user: { id: "5" } }),
    ...over,
  }) as unknown as RegisterAuthApi & {
    register: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
  };

describe("toRegisterPayload", () => {
  it("đổi tên trường theo backend (phone -> phoneNumber), email viết thường, bỏ confirmPassword", () => {
    expect(toRegisterPayload(input)).toEqual({
      fullName: "Khách Test",
      email: "khach.test@example.com",
      phoneNumber: "0399999123",
      password: "Test1234a",
      dateOfBirth: "2000-01-01",
    });
  });
});

describe("registerAndLogin", () => {
  it("đăng ký xong thì tự đăng nhập bằng email + mật khẩu vừa tạo", async () => {
    const a = api();
    const out = await registerAndLogin(a, input);
    expect(out.kind).toBe("logged-in");
    expect(a.login).toHaveBeenCalledWith({ username: "khach.test@example.com", password: "Test1234a" });
  });

  it("backend báo email/số điện thoại đã tồn tại => trả đúng thông báo, không đăng nhập", async () => {
    const a = api({
      register: vi.fn().mockRejectedValue(
        new ApiError("Số điện thoại này đã được đăng ký sử dụng trong hệ thống.", 400, "AUTH_PHONE_ALREADY_EXISTS"),
      ),
    });
    const out = await registerAndLogin(a, input);
    expect(out).toEqual({ kind: "failed", message: "Số điện thoại này đã được đăng ký sử dụng trong hệ thống." });
    expect(a.login).not.toHaveBeenCalled();
  });

  it("đăng ký được nhưng đăng nhập lỗi => báo đã tạo tài khoản để chuyển sang trang đăng nhập", async () => {
    const out = await registerAndLogin(api({ login: vi.fn().mockRejectedValue(new Error("x")) }), input);
    expect(out).toEqual({ kind: "registered", email: "khach.test@example.com" });
  });
});

describe("registerErrorMessage", () => {
  it("lỗi validate 422 lấy câu của trường đầu tiên thay cho câu chung", () => {
    const err = new ApiError("Dữ liệu đầu vào không hợp lệ", 422, "INVALID_INPUT", [
      { field: "password", message: "Mật khẩu bắt buộc phải chứa ít nhất một chữ hoa, một chữ thường và một ký số." },
    ]);
    expect(registerErrorMessage(err)).toBe(
      "Mật khẩu bắt buộc phải chứa ít nhất một chữ hoa, một chữ thường và một ký số.",
    );
  });
});

describe("registerSchema (khớp quy tắc của backend)", () => {
  const valid: RegisterInput = { ...input, fullName: "Khách Test", email: "khach.test@example.com" };

  it("mật khẩu thiếu chữ thường hoặc chữ số bị từ chối ngay trên form", () => {
    expect(registerSchema.safeParse({ ...valid, password: "TESTTEST1", confirmPassword: "TESTTEST1" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: "Testtesta", confirmPassword: "Testtesta" }).success).toBe(false);
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("ngày sinh là hôm nay hoặc tương lai bị từ chối", () => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(registerSchema.safeParse({ ...valid, dateOfBirth: iso }).success).toBe(false);
  });
});
