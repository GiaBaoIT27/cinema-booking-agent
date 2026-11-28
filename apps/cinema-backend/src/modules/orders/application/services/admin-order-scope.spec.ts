import { describe, it, expect } from 'vitest';
import { canViewOrderOf, resolveOrderScope } from './admin-order-scope.js';

describe('AdminOrderScope', () => {
  it('SUPER_ADMIN xem mọi cụm rạp và được tự lọc', () => {
    expect(resolveOrderScope({ roles: ['SUPER_ADMIN'] })).toEqual({ kind: 'all', cineplexId: undefined });
    expect(resolveOrderScope({ roles: ['SUPER_ADMIN'] }, '3')).toEqual({ kind: 'all', cineplexId: '3' });
  });

  it('manager bị khóa vào cụm rạp của mình, bỏ qua cineplexId yêu cầu', () => {
    expect(resolveOrderScope({ roles: ['CINEMA_MANAGER'], cineplexId: '2' }, '9')).toEqual({
      kind: 'cineplex',
      cineplexId: '2',
    });
  });

  it('không có cụm rạp → không được xem', () => {
    expect(resolveOrderScope({ roles: ['CINEMA_MANAGER'], cineplexId: null })).toBeNull();
  });

  it('chỉ xem chi tiết đơn thuộc phạm vi', () => {
    const scope = resolveOrderScope({ roles: ['CINEMA_MANAGER'], cineplexId: '2' });
    expect(canViewOrderOf(scope, 2)).toBe(true);
    expect(canViewOrderOf(scope, '5')).toBe(false);
    expect(canViewOrderOf(resolveOrderScope({ roles: ['SUPER_ADMIN'] }), 5)).toBe(true);
    expect(canViewOrderOf(null, 2)).toBe(false);
  });
});
