import { describe, it, expect } from 'vitest';
import { canGrantRole, canManageUser, isSuperAdmin } from './role-hierarchy.rules.js';

describe('RoleHierarchyRules (Domain)', () => {
  it('nhận diện SUPER_ADMIN từ danh sách role của JWT', () => {
    expect(isSuperAdmin(['SUPER_ADMIN'])).toBe(true);
    expect(isSuperAdmin(['CINEMA_MANAGER'])).toBe(false);
    expect(isSuperAdmin(undefined)).toBe(false);
  });

  it('chỉ SUPER_ADMIN được cấp vai trò SUPER_ADMIN', () => {
    expect(canGrantRole(['CINEMA_MANAGER'], 'SUPER_ADMIN')).toBe(false);
    expect(canGrantRole(['SUPER_ADMIN'], 'SUPER_ADMIN')).toBe(true);
    expect(canGrantRole(['CINEMA_MANAGER'], 'CINEMA_STAFF')).toBe(true);
  });

  it('chỉ SUPER_ADMIN được đổi vai trò hoặc khóa tài khoản SUPER_ADMIN', () => {
    expect(canManageUser(['CINEMA_MANAGER'], ['SUPER_ADMIN'])).toBe(false);
    expect(canManageUser(['SUPER_ADMIN'], ['SUPER_ADMIN'])).toBe(true);
    expect(canManageUser(['CINEMA_MANAGER'], ['CUSTOMER'])).toBe(true);
  });
});
