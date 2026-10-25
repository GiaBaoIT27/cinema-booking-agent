import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createBackendClient } from "../src/lib/backend-client.js";
import { runTool } from "../src/tools/definitions.js";
import { effectsFor } from "../src/tools/tool-effects.js";
import { startFakeBackend } from "./helpers.js";

let be: Awaited<ReturnType<typeof startFakeBackend>>;
let ctx: { backend: ReturnType<typeof createBackendClient>; token?: string };
before(async () => {
  be = await startFakeBackend();
  ctx = { backend: createBackendClient({ baseUrl: be.url, timeoutMs: 2000 }) };
});
after(() => be.close());

const authed = () => ({ ...ctx, token: "good" });

test("search_movies trả danh sách phim từ backend thật", async () => {
  const r: any = await runTool("search_movies", { search: "lật mặt" }, ctx);
  assert.equal(r.ok, true);
  assert.equal(r.data.movies[0].movieId, 6);
  assert.ok(be.calls.at(-1)!.url.includes("status=SHOWING"));
  assert.ok(be.calls.at(-1)!.url.includes("search=l"));
});

test("get_showtimes đổi giờ sang giờ Việt Nam và gom theo rạp", async () => {
  const r: any = await runTool("get_showtimes", { movieId: 6, date: "2026-10-11" }, ctx);
  assert.equal(r.data.cinemas[0].showtimes[0].startTime, "19:45");
  assert.equal(r.data.cinemas[0].cineplexName, "Cinema Star - Phúc Xá");
});

test("get_available_seats chỉ báo ghế trống cho mô hình, giữ sơ đồ đầy đủ cho UI", async () => {
  const r: any = await runTool("get_available_seats", { showtimeId: 897 }, ctx);
  assert.deepEqual(Object.keys(r.data.availableByRow).sort(), ["H", "J"]);
  assert.equal(r.data.availableByRow.H.length, 2);
  assert.equal(r.ui.seatMatrix.length, 4);
});

test("get_fnb_items không lộ imageUrl cho mô hình nhưng giữ cho UI", async () => {
  const r: any = await runTool("get_fnb_items", {}, ctx);
  assert.equal(r.data.items[0].imageUrl, undefined);
  assert.equal(r.ui.items[0].imageUrl, "https://img/x.png");
  const b: any = await runTool("get_fnb_items", { category: "beverage" }, ctx);
  assert.equal(b.data.items.length, 1);
});

test("tool giao dịch từ chối khi chưa đăng nhập và không gọi backend", async () => {
  const before = be.calls.length;
  const r: any = await runTool("hold_seats", { showtimeId: 897, seatLabels: ["H7"] }, ctx);
  assert.equal(r.errorCode, "AUTH_REQUIRED");
  assert.equal(be.calls.length, before);
  assert.equal(effectsFor("hold_seats", {}, r).widget?.type, "LOGIN_REQUIRED");
});

test("hold_seats đổi nhãn ghế sang seatId, gửi JWT, lấy hạn giữ từ backend", async () => {
  const r: any = await runTool("hold_seats", { showtimeId: 897, seatLabels: ["h7", "H8"] }, authed());
  assert.equal(r.ok, true);
  const post = be.calls.filter((c) => c.url === "/bookings/hold").at(-1)!;
  assert.deepEqual(post.body, { showtimeId: 897, seatIds: [11, 12] });
  assert.equal(post.auth, "Bearer good");
  assert.equal(r.data.holdMinutes, 11);
  assert.equal(r.data.totalSeatPrice, 130000);
  const fx = effectsFor("hold_seats", {}, r);
  assert.deepEqual(fx.patch.selectedSeats, [{ seatId: 11, label: "H7" }, { seatId: 12, label: "H8" }]);
  assert.equal(fx.widget?.type, "SEAT_MATRIX_SELECTOR");
});

test("hold_seats báo rõ ghế sai nhãn / đã bán, không gọi hold", async () => {
  const n = be.calls.filter((c) => c.url === "/bookings/hold").length;
  const a: any = await runTool("hold_seats", { showtimeId: 897, seatLabels: ["Z99"] }, authed());
  assert.equal(a.errorCode, "SEAT_NOT_FOUND");
  const b: any = await runTool("hold_seats", { showtimeId: 897, seatLabels: ["H9"] }, authed());
  assert.equal(b.errorCode, "SEAT_TAKEN");
  assert.equal(be.calls.filter((c) => c.url === "/bookings/hold").length, n);
});

test("ghế đôi khớp khi khách chỉ nói một nửa", async () => {
  const r: any = await runTool("hold_seats", { showtimeId: 897, seatLabels: ["J2"] }, authed());
  assert.equal(r.ok, true);
  assert.deepEqual(r.data.heldSeats.map((s: any) => s.seatId), [20]);
});

test("create_order_and_payment: tạo đơn rồi link VNPay, voucher viết hoa", async () => {
  const r: any = await runTool("create_order_and_payment", { showtimeId: 897, seatLabels: ["H7", "H8"], fnbItems: [{ fnbItemId: 2, quantity: 1 }], voucherCode: " cgv50k " }, authed());
  assert.equal(r.ok, true);
  assert.equal(r.data.paymentUrl, "https://vnpay.example/pay?x=1");
  const order = be.calls.filter((c) => c.url === "/orders" && c.method === "POST").at(-1)!;
  assert.deepEqual(order.body, { showtimeId: 897, seatIds: [11, 12], fnbItems: [{ fnbItemId: 2, quantity: 1 }], voucherCode: "CGV50K", channel: "ONLINE_WEB" });
  const pay = be.calls.filter((c) => c.url === "/payments/initiate").at(-1)!;
  assert.deepEqual(pay.body, { orderId: 14, method: "VNPAY" });
  assert.equal(effectsFor("create_order_and_payment", {}, r).widget?.type, "PAYMENT_SUMMARY");
});

test("voucher sai: trả lỗi của backend cho mô hình", async () => {
  const r: any = await runTool("create_order_and_payment", { showtimeId: 897, seatLabels: ["H7"], voucherCode: "BAD" }, authed());
  assert.equal(r.ok, false);
  assert.equal(r.errorCode, "VOUCHER_INVALID");
  assert.equal(r.message, "Mã giảm giá không hợp lệ");
});

test("khởi tạo thanh toán lỗi: tự hủy đơn để nhả ghế", async () => {
  be.setFailPayment(true);
  const r: any = await runTool("create_order_and_payment", { showtimeId: 897, seatLabels: ["H7"] }, authed());
  be.setFailPayment(false);
  assert.equal(r.ok, false);
  assert.equal(r.errorCode, "ORDER_EXPIRED");
  assert.equal(be.calls.at(-1)!.url, "/orders/14/cancel");
});

test("token hết hạn (401) thành AUTH_REQUIRED", async () => {
  const r: any = await runTool("get_my_orders", {}, { ...ctx, token: "expired" });
  assert.equal(r.errorCode, "AUTH_REQUIRED");
});

test("get_my_orders / get_order_status đọc đúng định dạng backend", async () => {
  const a: any = await runTool("get_my_orders", {}, authed());
  assert.equal(a.data.orders[0].orderCode, "ORD-1");
  const b: any = await runTool("get_order_status", { orderId: 14 }, authed());
  assert.equal(b.data.status, "PAID");
  assert.equal(b.data.tickets[0].ticketCode, "T-1");
});

test("tham số sai schema và tool lạ không ném lỗi", async () => {
  const a: any = await runTool("get_showtimes", { movieId: "abc" }, ctx);
  assert.equal(a.errorCode, "INVALID_ARGUMENTS");
  const b: any = await runTool("drop_database", {}, ctx);
  assert.equal(b.errorCode, "UNKNOWN_TOOL");
});

test("backend tắt: báo BACKEND_UNREACHABLE", async () => {
  const dead = createBackendClient({ baseUrl: "http://127.0.0.1:1", timeoutMs: 1000 });
  const r: any = await runTool("search_movies", {}, { backend: dead });
  assert.equal(r.errorCode, "BACKEND_UNREACHABLE");
});
