//Decorator này dùng để định nghĩa quyền hạn (Scope) yêu cầu tại mỗi Controller hoặc Endpoint.
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
