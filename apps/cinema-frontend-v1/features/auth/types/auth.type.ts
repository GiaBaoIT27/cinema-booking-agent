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

export interface LoginResponseData {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: AuthUser;
}

