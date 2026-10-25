import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { handleChat, threadIdFor, type ChatResponse } from "../src/chat-handler.js";
import { RateLimiter } from "../src/lib/rate-limit.js";
import { loadConfig } from "../src/config.js";

const config = loadConfig({ GOOGLE_API_KEY: "k", BACKEND_API_URL: "http://b/api/v1", JWT_SECRET: "s3" });
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (payload: object) => { const h = b64({ alg: "HS256" }); const p = b64(payload); return `${h}.${p}.${createHmac("sha256", "s3").update(`${h}.${p}`).digest("base64url")}`; };

function fakeRes() {
  const r = { code: 200, json: undefined as any, headers: {} as Record<string, any>, out: "", writableEnded: false, closeCb: undefined as undefined | (() => void) } as any;
  const res: ChatResponse = {
    get writableEnded() { return r.writableEnded; },
    status(c) { r.code = c; return res; },
    json(b) { r.json = b; r.writableEnded = true; return res; },
    setHeader(k, v) { r.headers[k] = v; },
    flushHeaders() {},
    write(c) { r.out += c; return true; },
    end() { r.writableEnded = true; },
    on(_e, cb) { r.closeCb = cb; },
  };
  return { res, r };
}

function fakeGraph(captured: any[]) {
  return {
    async stream(input: any, options: any) {
      captured.push({ input, options });
      return (async function* () {
        yield ["messages", [{ content: "Xin chào" }, { langgraph_node: "agent" }]];
      })();
    },
    async getState() { return { values: { movieId: 6, showtimeId: 897, selectedSeats: [{ seatId: 1, label: "H7" }] } }; },
  };
}

const deps = (cap: any[]) => ({ config, graph: fakeGraph(cap), limiter: new RateLimiter(2) });
const events = (out: string) => [...out.matchAll(/event: (\w+)\ndata: (.*)\n/g)].map((m) => [m[1], JSON.parse(m[2])] as [string, any]);

test("luồng SSE đầy đủ: session → token → state_sync → end, JWT được chuyển cho graph", async () => {
  const cap: any[] = [];
  const { res, r } = fakeRes();
  const token = jwt({ userId: "7", exp: Math.floor(Date.now() / 1000) + 60 });
  await handleChat(deps(cap), { body: { message: "  chào  ", sessionId: "abcdefgh12" }, authorization: `Bearer ${token}`, ip: "1.1.1.1" }, res);
  assert.equal(r.headers["Content-Type"], "text/event-stream; charset=utf-8");
  const ev = events(r.out);
  assert.deepEqual(ev.map((e) => e[0]), ["session", "token", "state_sync", "end"]);
  assert.equal(ev[2][1].showtimeId, 897);
  assert.equal(ev[3][1].status, "COMPLETED");
  assert.equal(cap[0].input.messages[0].content, "chào");
  assert.equal(cap[0].options.configurable.authToken, token);
  assert.equal(cap[0].options.configurable.thread_id, threadIdFor("7", "abcdefgh12"));
  assert.notEqual(threadIdFor("7", "abcdefgh12"), threadIdFor("8", "abcdefgh12"));
  assert.deepEqual(cap[0].options.streamMode, ["messages", "updates"]);
  assert.ok(r.writableEnded);
});

test("từ chối tin rỗng, quá dài, token sai; vượt giới hạn tốc độ trả 429", async () => {
  const cap: any[] = [];
  let x = fakeRes();
  await handleChat(deps(cap), { body: {} }, x.res);
  assert.equal(x.r.code, 400);
  x = fakeRes();
  await handleChat(deps(cap), { body: { message: "a".repeat(2001) } }, x.res);
  assert.equal(x.r.code, 400);
  x = fakeRes();
  await handleChat(deps(cap), { body: { message: "hi" }, authorization: "Bearer a.b.c" }, x.res);
  assert.equal(x.r.code, 401);
  assert.equal(cap.length, 0);

  const d = deps(cap);
  for (let i = 0; i < 2; i++) await handleChat(d, { body: { message: "hi" }, ip: "9.9.9.9" }, fakeRes().res);
  x = fakeRes();
  await handleChat(d, { body: { message: "hi" }, ip: "9.9.9.9" }, x.res);
  assert.equal(x.r.code, 429);
});

test("lỗi graph không lộ chi tiết nội bộ; khách ngắt kết nối thì hủy yêu cầu", async () => {
  const bad = { config, limiter: new RateLimiter(5), graph: { async stream() { throw new Error("secret stack key=AIza..."); }, async getState() { return {}; } } };
  const { res, r } = fakeRes();
  await handleChat(bad as any, { body: { message: "hi" } }, res);
  const ev = events(r.out);
  assert.equal(ev.at(-2)![0], "error");
  assert.ok(!r.out.includes("AIza"));
  assert.equal(ev.at(-1)![1].status, "FAILED");

  let signal: AbortSignal | undefined;
  const slow = { config, limiter: new RateLimiter(5), graph: { async stream(_i: any, o: any) { signal = o.signal; return (async function* () { r2.closeCb!(); yield ["messages", [{ content: "x" }, { langgraph_node: "agent" }]]; })(); }, async getState() { return {}; } } };
  const { res: res2, r: r2 } = fakeRes();
  await handleChat(slow as any, { body: { message: "hi" } }, res2);
  assert.equal(signal!.aborted, true);
});
