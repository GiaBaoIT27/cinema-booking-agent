export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  membershipTier?: string;
  roles: string[];
  permissions?: string[];
  cineplexId?: number | null;
}

export interface LoginPayload {
  username: string; // email hoặc số điện thoại
  password: string;
}

/** Body của POST /api/v1/auth/register (tên trường theo backend) */
export interface RegisterPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  dateOfBirth: string; // YYYY-MM-DD
}

/** Dữ liệu trả về khi đăng ký thành công (backend không cấp token ở bước này) */
export interface RegisteredUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  status: string;
  roles: string[];
}

export interface LoginResponseData {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: AuthUser;
}

