/**
 * Phạm vi xem đơn: SUPER_ADMIN xem mọi cụm rạp (có thể tự lọc),
 * vai trò khác (CINEMA_MANAGER) chỉ xem đơn thuộc cụm rạp ghi trong JWT.
 * Trả về null khi người gọi không có cụm rạp nào → không được xem đơn nào.
 */
export type OrderScope =
  | { kind: 'all'; cineplexId?: string }
  | { kind: 'cineplex'; cineplexId: string }
  | null;

export function resolveOrderScope(
  caller: { roles?: string[]; cineplexId?: string | null },
  requestedCineplexId?: string,
): OrderScope {
  if ((caller.roles ?? []).includes('SUPER_ADMIN')) {
    return { kind: 'all', cineplexId: requestedCineplexId || undefined };
  }
  if (!caller.cineplexId) return null;
  return { kind: 'cineplex', cineplexId: String(caller.cineplexId) };
}

export function canViewOrderOf(scope: OrderScope, orderCineplexId: number | string): boolean {
  if (!scope) return false;
  if (scope.kind === 'all') return true;
  return String(orderCineplexId) === scope.cineplexId;
}
