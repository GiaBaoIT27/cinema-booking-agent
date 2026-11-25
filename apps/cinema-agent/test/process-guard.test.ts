import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const child = fileURLToPath(new URL("./fixtures/process-guard-child.ts", import.meta.url));
const run = (mode: string) =>
  spawnSync(process.execPath, ["--import", "tsx", child, mode], { encoding: "utf8", timeout: 20_000 });

test("không có guard: unhandled rejection (luồng Gemini hỏng) làm sập tiến trình – đúng lỗi đã gặp", () => {
  const r = run("none");
  assert.notEqual(r.status, 0);
  assert.doesNotMatch(r.stdout, /ALIVE/);
});

test("có guard: lỗi chỉ được ghi log, tiến trình chạy tiếp", () => {
  const r = run("guard");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /LOGGED/);
  assert.match(r.stdout, /ALIVE/);
});
