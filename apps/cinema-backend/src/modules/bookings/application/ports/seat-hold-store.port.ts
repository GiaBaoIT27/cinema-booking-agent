/**
 * Kho trạng thái giữ ghế tạm thời (realtime) gồm khóa từng ghế và bảng tra cứu
 * "ghế nào đang được giữ". Application không biết đó là Redis.
 */
export interface ISeatHoldStore {
  /**
   * Khóa tất cả ghế (all-or-nothing: một ghế thất bại thì hoàn trả các ghế đã khóa)
   * rồi ghi trạng thái giữ. Trả về thời điểm hết hạn, hoặc null nếu có ghế đang bị giữ.
   */
  acquire(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    ttlMs: number,
  ): Promise<Date | null>;

  /**
   * Xóa trạng thái giữ của các ghế. Chỉ nhả khóa khi truyền `userId`
   * (khóa chỉ được nhả bởi đúng chủ sở hữu); bảng tra cứu luôn được xóa.
   */
  release(
    showtimeId: string,
    seatIds: string[],
    userId?: string,
  ): Promise<void>;
}

export const SEAT_HOLD_STORE = Symbol('SEAT_HOLD_STORE');
