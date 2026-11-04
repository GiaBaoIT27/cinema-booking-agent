export class ReleaseSeatsForOrderInputDto {
  showtimeId: string;
  seatIds: string[];
  /** Mã đơn đã gắn ghế – chỉ ghế của đúng đơn này mới được nhả. */
  orderCode: string;
  userId?: string;
}

export class ReserveSeatsForOrderInputDto {
  showtimeId: string;
  seatIds: string[];
  userId: string;
  orderCode: string;
  /** Giữ ghế tới thời điểm này (phải >= hạn thanh toán của đơn). */
  holdUntil: Date;
}

export class OrderSeatsInputDto {
  showtimeId: string;
  seatIds: string[];
  orderCode: string;
  userId?: string;
}
