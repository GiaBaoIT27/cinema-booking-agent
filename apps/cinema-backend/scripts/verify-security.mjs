// Kiểm chứng các dòng của Bảng 4.6 (báo cáo v4) trên hệ thống đang chạy (chạy BÊN TRONG container backend).
// Secret VNPay chỉ được đọc từ biến môi trường của container để ký IPN giả lập, không in ra.
import { readFileSync } from "node:fs";
import { VnPaySignatureUtil } from "/app/dist/modules/payments/infrastructure/gateways/vnpay/vnpay-signature.util.js";

const API = "http://localhost:3000/api/v1";
const H = { Accept: "application/json", "Content-Type": "application/json" };
const results = [];
const record = (test, expected, observed, pass) => {
  results.push({ test, expected, observed, status: pass ? "PASS" : "FAIL" });
  console.log(`${pass ? "PASS" : "FAIL"} | ${test} | expected: ${expected} | observed: ${observed}`);
};

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { ...H, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
const login = async (u) =>
  (await call("POST", "/auth/login", { body: { username: u, password: "Eval123@Password" } })).json.data.accessToken;

function signedIpnQuery(params) {
  const secret = process.env.VNPAY_HASH_SECRET;
  const sorted = VnPaySignatureUtil.sortObject(params);
  const signData = VnPaySignatureUtil.createSignData(sorted);
  const hash = VnPaySignatureUtil.hmacSha512(secret, signData);
  return `${signData}&vnp_SecureHash=${hash}`;
}
const ipn = async (query) => { const j = await (await fetch(`${API}/payments/vnpay/ipn?${query}`, { headers: { Accept: "application/json" } })).json(); return j?.RspCode ? j : (j?.data ?? j); };

const fx = JSON.parse(readFileSync("/app/eval-fixtures.json", "utf8"));
const st = fx.showtimes.find((s) => s.key === "mai-morning");
const seat = fx.seatsByAuditorium[st.auditoriumCode].NORMAL.find((s) => s.seatNumber === (process.env.SEAT ?? "A6"));
const showtimeId = Number(st.id);
const seatId = Number(seat.id);

const t1 = await login("eval.user1@cinema.com");
const t2 = await login("eval.user2@cinema.com");

// 1. Token không hợp lệ
{
  const r = await call("GET", "/orders/my", { token: "invalid.token.value" });
  const r2 = await call("POST", "/bookings/hold", { body: { showtimeId, seatIds: [seatId] } });
  record("Expired or invalid token", "HTTP 401", `GET /orders/my with invalid JWT -> ${r.status}; POST /bookings/hold without JWT -> ${r2.status}`, r.status === 401 && r2.status === 401);
}

// 2. User 1 giữ ghế, user 2 cố nhả ghế đó
await call("POST", "/bookings/hold", { token: t1, body: { showtimeId, seatIds: [seatId] } });
{
  const rel = await call("POST", "/bookings/release", { token: t2, body: { showtimeId, seatIds: [seatId] } });
  const holds = await call("GET", "/bookings/my-holds", { token: t1 });
  const stillHeld = JSON.stringify(holds.json?.data ?? {}).includes(`"seatId":${seatId}`) || JSON.stringify(holds.json?.data ?? {}).includes(`"seatId":"${seatId}"`);
  record("Seat held by another customer", "HTTP 403; seat stays held by its owner", `user2 release -> HTTP ${rel.status} (${rel.json?.errorCode ?? rel.json?.code}); seat ${seat.seatNumber} still held by user1: ${stillHeld}`, rel.status === 403 && stillHeld);
}

// 3. User 1 tạo đơn và link thanh toán
const order = await call("POST", "/orders", { token: t1, body: { showtimeId, seatIds: [seatId], channel: "ONLINE_WEB" } });
const orderId = order.json?.data?.orderId;
const pay = await call("POST", "/payments/initiate", { token: t1, body: { orderId, method: "VNPAY" } });
const txnRef = pay.json?.data?.gatewayTxnRef;
const amount = Math.round(Number(pay.json?.data?.amount) * 100);
console.log(`setup: order ${orderId} (${order.status}), payment ${txnRef} (${pay.status})`);

// 4. User 2 đọc đơn của user 1
{
  const r = await call("GET", `/orders/${orderId}`, { token: t2 });
  record("Access to another customer's order", "HTTP 404; no data returned", `user2 GET /orders/${orderId} -> HTTP ${r.status} (${r.json?.errorCode ?? r.json?.code}: ${r.json?.message}); data returned: ${Boolean(r.json?.data)}`, r.status === 404 && !r.json?.data);
}

// 5. IPN bị sửa chữ ký / số tiền
const base = { vnp_TxnRef: txnRef, vnp_Amount: amount, vnp_ResponseCode: "00", vnp_TransactionStatus: "00", vnp_TransactionNo: "14000001", vnp_TmnCode: "TEST" };
{
  const tampered = signedIpnQuery(base).replace(/vnp_Amount=\d+/, "vnp_Amount=100");
  const r1 = await ipn(tampered);
  const r2 = await ipn(signedIpnQuery({ ...base, vnp_Amount: 100 }));
  const o = await call("GET", `/orders/${orderId}`, { token: t1 });
  record("Tampered payment notification", "Rejected; order unchanged",
    `changed amount after signing -> RspCode ${r1.RspCode}; correctly signed wrong amount -> RspCode ${r2.RspCode}; order status ${o.json?.data?.status}`,
    r1.RspCode === "97" && r2.RspCode === "04" && o.json?.data?.status === "PENDING");
}

// 6. IPN hợp lệ gửi 2 lần
{
  const q = signedIpnQuery(base);
  const r1 = await ipn(q);
  const r2 = await ipn(q);
  const o = await call("GET", `/orders/${orderId}`, { token: t1 });
  const tickets = (o.json?.data?.tickets ?? []).length;
  record("Duplicate notification", "Second IPN acknowledged; no duplicate ticket",
    `first IPN -> RspCode ${r1.RspCode}; second -> RspCode ${r2.RspCode}; order ${o.json?.data?.status} with ${tickets} ticket(s) for 1 seat`,
    r1.RspCode === "00" && ["00", "02"].includes(r2.RspCode) && o.json?.data?.status === "PAID" && tickets === 1);
}

// 7. Rate limit theo IP
{
  const codes = [];
  for (let i = 0; i < 140; i++) codes.push((await fetch(`${API}/movies`, { headers: { Accept: "application/json" } })).status);
  const first429 = codes.indexOf(429);
  record("Rate limiting", "HTTP 429 Too Many Requests",
    first429 >= 0 ? `140 requests in a few seconds: first HTTP 429 at request ${first429 + 1}` : "no HTTP 429 within 140 requests",
    first429 >= 0);
}

console.log("JSON_RESULTS=" + JSON.stringify(results));
