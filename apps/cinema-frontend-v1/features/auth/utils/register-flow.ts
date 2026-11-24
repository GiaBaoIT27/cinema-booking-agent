import { ApiError } from "@/lib/api-client";
import type { RegisterInput } from "../schemas/auth.schema";
import type {
  LoginPayload,
  LoginResponseData,
  RegisterPayload,
  RegisteredUser,
} from "../types/auth.type";

export interface RegisterAuthApi {
  register(payload: RegisterPayload): Promise<RegisteredUser>;
  login(payload: LoginPayload): Promise<LoginResponseData>;
}

export type RegisterOutcome =
  /** Đăng ký và đăng nhập đều xong: có phiên để lưu */
  | { kind: "logged-in"; session: LoginResponseData }
  /** Đã tạo tài khoản nhưng tự đăng nhập lỗi: chuyển sang trang đăng nhập */
  | { kind: "registered"; email: string }
  | { kind: "failed"; message: string };

/** Dữ liệu form -> body backend (backend dùng `phoneNumber`, email viết thường). */
export function toRegisterPayload(input: RegisterInput): RegisterPayload {
  return {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phoneNumber: input.phone.trim(),
    password: input.password,
    dateOfBirth: input.dateOfBirth,
  };
}

/** Thông báo lỗi dễ hiểu: lỗi validate 422 lấy câu của trường đầu tiên thay cho câu chung. */
export function registerErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fieldMessage = error.errors?.find((e) => e?.message)?.message;
    if (error.errorCode === "INVALID_INPUT" && fieldMessage) return fieldMessage;
    return error.message || fieldMessage || "Đăng ký thất bại. Vui lòng thử lại.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Đăng ký thất bại. Vui lòng thử lại.";
}

/** Đăng ký rồi tự đăng nhập bằng email + mật khẩu vừa tạo. */
export async function registerAndLogin(
  api: RegisterAuthApi,
  input: RegisterInput,
): Promise<RegisterOutcome> {
  const payload = toRegisterPayload(input);
  try {
    await api.register(payload);
  } catch (error) {
    return { kind: "failed", message: registerErrorMessage(error) };
  }

  try {
    const session = await api.login({ username: payload.email, password: payload.password });
    return { kind: "logged-in", session };
  } catch {
    return { kind: "registered", email: payload.email };
  }
}
