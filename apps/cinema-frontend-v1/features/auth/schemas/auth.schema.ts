import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(1, "Vui lòng nhập email hoặc số điện thoại"),
  password: z.string().min(8, "Mật khẩu phải chứa ít nhất 8 ký tự"),
  remember: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Họ và tên tối thiểu 2 ký tự"),
    dateOfBirth: z.string().min(1, "Vui lòng chọn ngày sinh"),
    phone: z
      .string()
      .regex(/(0[3|5|7|8|9])+([0-9]{8})\b/, "Số điện thoại không hợp lệ"),
    email: z.string().email("Email không hợp lệ"),
    password: z
      .string()
      .min(8, "Mật khẩu phải từ 8 ký tự trở lên")
      .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ hoa"),
    confirmPassword: z.string().min(1, "Vui lòng xác thực lại mật khẩu"),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "Bạn cần đồng ý với các điều khoản thành viên",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác thực không khớp",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
