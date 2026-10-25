import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { loadConfig, ConfigError } from "../src/config.js";
import { extractBearer, readAuth } from "../src/lib/jwt.js";
import { RateLimiter } from "../src/lib/rate-limit.js";
import { windowMessages } from "../src/graph/messages.js";
import { buildSystemPrompt } from "../src/graph/prompt.js";
import { vnDate, vnWeekday } from "../src/lib/time.js";

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const sign = (payload: object, secret: string) => {
  const h = b64({ alg: "HS256", typ: "JWT" });
  const p = b64(payload);
  return `${h}.${p}.${createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`;
};

test("config báo thiếu biến bắt buộc và dọn dấu / cuối URL", () => {
  assert.throws(() => loadConfig({}), (e: any) => e instanceof ConfigError && e.message.includes("GOOGLE_API_KEY") && e.message.includes("BACKEND_API_URL"));
  const c = loadConfig({ GOOGLE_API_KEY: "k", BACKEND_API_URL: "http://x/api/v1/" });
  assert.equal(c.backendApiUrl, "http://x/api/v1");
  assert.equal(c.port, 3002);
});

test("jwt: đọc userId, kiểm tra chữ ký và hạn", () => {
  const now = Date.now();
  const good = sign({ userId: "7", exp: Math.floor(now / 1000) + 60 }, "s3");
  assert.deepEqual(readAuth(good, "s3"), { userId: "7" });
  assert.equal(readAuth(good, "other"), null);
  assert.equal(readAuth(sign({ sub: "9", exp: 1 }, "s3"), "s3"), null);
  assert.deepEqual(readAuth(sign({ sub: "9" }, "s3")), { userId: "9" });
  assert.equal(readAuth("abc"), null);
  assert.equal(extractBearer("Bearer abc.def.ghi"), "abc.def.ghi");
  assert.equal(extractBearer("Basic x"), undefined);
});

test("rate limiter cửa sổ trượt", () => {
  const rl = new RateLimiter(2, 1000);
  assert.ok(rl.allow("a", 0) && rl.allow("a", 10));
  assert.equal(rl.allow("a", 20), false);
  assert.ok(rl.allow("b", 20));
  assert.ok(rl.allow("a", 1100));
});

test("windowMessages bắt đầu từ tin người dùng, không cắt cặp tool", () => {
  const m = (t: string) => ({ getType: () => t });
  const msgs = [m("human"), m("ai"), m("tool"), m("ai"), m("human"), m("ai"), m("tool"), m("ai")];
  const w = windowMessages(msgs, 5);
  assert.equal(w[0].getType(), "human");
  assert.equal(w.length, 4);
  assert.equal(windowMessages(msgs, 20).length, 8);
});

test("prompt có ngày hôm nay theo giờ VN và trạng thái đăng nhập/ghế", () => {
  const d = new Date("2026-10-11T18:30:00Z"); // đã sang 12/10 ở Việt Nam
  assert.equal(vnDate(d), "2026-10-12");
  assert.equal(vnWeekday(d), "Thứ hai");
  const s = buildSystemPrompt({ movieId: 6, movieTitle: "Lật Mặt 8", showtimeId: 897, selectedSeats: [{ seatId: 1, label: "H7" }], holdExpiresAt: "t", orderId: null, activeWidget: null }, false, d);
  assert.ok(s.includes("2026-10-12") && s.includes("CHƯA đăng nhập") && s.includes("H7") && s.includes("Lật Mặt 8"));
});
