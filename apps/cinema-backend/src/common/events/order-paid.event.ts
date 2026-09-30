/**
 * Integration event: module `orders` phát khi đơn hàng đã thanh toán thành công.
 *
 * Payload là SNAPSHOT tại thời điểm thanh toán và chứa đủ dữ liệu để bên nghe
 * (notifications) không phải gọi ngược sang orders/users/showtimes. Nhờ vậy:
 *  - notifications giữ được vai trò module lá (không phụ thuộc module nào)
 *  - nội dung email luôn đúng với những gì khách đã trả tiền, dù dữ liệu gốc đổi sau đó
 *
 * Thời gian dùng chuỗi ISO 8601 (không dùng Date) để payload luôn serialize an toàn.
 */
export interface OrderPaidEventPayload {
  orderId: string;
  orderCode: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  movieTitle: string;
  cineplexName: string;
  auditoriumName: string;
  startTime: string;
  seats: string[];
  fnbItems: Array<{ name: string; quantity: number }>;
  totalAmount: number; // VND, số nguyên
  paidAt: string;
  tickets: Array<{ ticketCode: string; seatCode: string; qrPayload: string }>;
}
