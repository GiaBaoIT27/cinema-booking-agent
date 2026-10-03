/**
 * Port kiểm tra loại ghế có đang được module khác sử dụng hay không.
 * seat-types KHÔNG được biết bảng `seats` của module khác – việc đó
 * thuộc về adapter trong infrastructure.
 */
export interface ISeatTypeUsageChecker {
  isInUse(seatTypeId: string): Promise<boolean>;
}

export const SEAT_TYPE_USAGE_CHECKER = Symbol('SEAT_TYPE_USAGE_CHECKER');
