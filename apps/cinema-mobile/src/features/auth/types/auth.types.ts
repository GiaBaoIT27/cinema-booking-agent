/** Hạng thành viên — khớp với enum MembershipTier của backend. */
export type MembershipTier = "MEMBER" | "VIP" | "VVIP";

/** Trạng thái tài khoản — khớp với enum UserStatus của backend. */
export type UserStatus = "ACTIVE" | "UNVERIFIED" | "BLOCKED";

/**
 * Người dùng đi kèm trong response của `POST /auth/login`
 * (đã bóc khỏi envelope `{ success, code, data }`).
 */
export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  membershipTier: MembershipTier;
  roles: string[];
  permissions: string[];
  cineplexId: number | null;
}

/**
 * Hồ sơ đầy đủ từ `GET /users/me` (endpoint được bảo vệ bởi JwtAuthGuard).
 * Khác `AuthUser` ở chỗ có thêm điểm thưởng, ngày sinh và trạng thái tài khoản.
 */
export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  membershipTier: MembershipTier;
  loyaltyPoints: number;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Body của `POST /auth/login`.
 * Backend dùng tên `username` (không phải `email`) vì nhận cả email lẫn số điện thoại.
 */
export interface LoginPayload {
  username: string;
  password: string;
}

/** Data trả về từ `POST /auth/login`. */
export interface LoginResult {
  tokenType: string;
  accessToken: string;
  /** Số giây còn lại của access token (backend trả 1800 = 30 phút). */
  expiresIn: number;
  refreshToken: string;
  user: AuthUser;
}
