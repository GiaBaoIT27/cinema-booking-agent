import http from "node:http";
import type { AddressInfo } from "node:net";

export interface Recorded { method: string; url: string; auth?: string; body?: any }

/** Backend NestJS giả: trả đúng bọc { success, data } và lỗi như backend thật */
export async function startFakeBackend() {
  const calls: Recorded[] = [];
  const seats = [
    { seatId: 11, rowLabel: "H", columnNumber: 7, seatNumber: "H7", seatType: "NORMAL", status: "AVAILABLE", price: 65000 },
    { seatId: 12, rowLabel: "H", columnNumber: 8, seatNumber: "H8", seatType: "NORMAL", status: "AVAILABLE", price: 65000 },
    { seatId: 13, rowLabel: "H", columnNumber: 9, seatNumber: "H9", seatType: "NORMAL", status: "BOOKED", price: 65000 },
    { seatId: 20, rowLabel: "J", columnNumber: 1, seatNumber: "J1-J2", seatType: "SWEETBOX", status: "AVAILABLE", price: 150000 },
  ];
  let failPayment = false;

  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const u = new URL(req.url!, "http://x");
      const rec: Recorded = { method: req.method!, url: u.pathname + u.search, auth: req.headers.authorization, body: raw ? JSON.parse(raw) : undefined };
      calls.push(rec);
      const ok = (data: unknown, status = 200) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, code: "OK", message: "ok", data }));
      };
      const err = (status: number, code: string, message: string) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, code, message }));
      };
      const p = u.pathname;
      const needAuth = () => {
        if (rec.auth !== "Bearer good") { err(401, "UNAUTHORIZED", "Unauthorized"); return false; }
        return true;
      };

      if (p === "/movies") return ok([{ id: "6", title: "Lật Mặt 8", durationMinutes: 120, ageRating: "T13", status: "SHOWING", posterUrl: null, releaseDate: "2026-10-01" }]);
      if (p === "/movies/6") return ok({ id: "6", title: "Lật Mặt 8", description: "Mô tả", genres: [{ name: "Hành động" }], durationMinutes: 120, ageRating: "T13" });
      if (p === "/movies/6/showtimes") return ok({ movieId: 6, movieTitle: "Lật Mặt 8", showtimesByCinema: [{ cineplexId: 1, cineplexName: "Cinema Star - Phúc Xá", showtimes: [{ showtimeId: 897, auditoriumName: "Room 1", projectionType: "IMAX", startTime: "2026-10-11T12:45:00.000Z", endTime: "2026-10-11T14:45:00.000Z" }] }] });
      if (p === "/showtimes/897/seats") return ok({ showtimeId: 897, auditoriumName: "Room 1", totalSeats: 4, availableSeats: 3, seatMatrix: seats });
      if (p === "/fnb-items") return ok([{ id: 2, name: "Combo Solo", category: "COMBO", basePrice: 75000, imageUrl: "https://img/x.png", description: "1 bắp 1 nước" }, { id: 3, name: "Coca", category: "BEVERAGE", basePrice: 35000, imageUrl: null }]);
      if (p === "/bookings/hold") { if (!needAuth()) return; return ok({ showtimeId: 897, heldSeats: rec.body.seatIds.map((id: number) => ({ seatId: id, rowLabel: "H", seatNumber: "?" })), holdExpiresAt: "2026-10-11T13:00:00.000Z", holdDurationMs: 660000, message: "ok" }); }
      if (p === "/bookings/release") { if (!needAuth()) return; return ok({ showtimeId: 897, releasedSeatIds: rec.body.seatIds, message: "ok" }); }
      if (p === "/orders" && req.method === "POST") {
        if (!needAuth()) return;
        if (rec.body.voucherCode === "BAD") return err(400, "VOUCHER_INVALID", "Mã giảm giá không hợp lệ");
        return ok({ orderId: 14, orderCode: "ORD-1", showtimeId: 897, seatIds: rec.body.seatIds, channel: "ONLINE_WEB", pricing: { subtotalTickets: 130000, subtotalFnb: 0, discountAmount: 0, finalAmount: 130000 }, status: "PENDING", expiresAt: "2026-10-11T13:10:00.000Z" }, 201);
      }
      if (p === "/payments/initiate") { if (!needAuth()) return; if (failPayment) return err(400, "ORDER_EXPIRED", "Đơn hàng đã hết hạn"); return ok({ orderId: rec.body.orderId, orderCode: "ORD-1", gatewayTxnRef: "ORD-1_1", amount: 130000, paymentUrl: "https://vnpay.example/pay?x=1" }); }
      if (p === "/orders/14/cancel") { if (!needAuth()) return; return ok({ orderId: 14, status: "CANCELLED" }); }
      if (p === "/orders/my") { if (!needAuth()) return; return ok({ data: [{ orderId: 14, orderCode: "ORD-1", status: "PAID", showtimeId: 897, pricing: { finalAmount: 130000 }, createdAt: "x" }] }); }
      if (p === "/orders/14") { if (!needAuth()) return; return ok({ orderId: 14, orderCode: "ORD-1", status: "PAID", pricing: { finalAmount: 130000 }, tickets: [{ ticketCode: "T-1", price: 65000, status: "VALID" }] }); }
      err(404, "NOT_FOUND", "Không tìm thấy");
    });
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as AddressInfo).port;
  return { url: `http://127.0.0.1:${port}`, calls, setFailPayment: (v: boolean) => (failPayment = v), close: () => new Promise<void>((r) => server.close(() => r())) };
}
