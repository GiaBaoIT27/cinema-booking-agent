import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeToolMetrics,
  percentile,
  renderMarkdownReport,
  summarize,
  toolFailures,
  type CaseResult,
  type RunMeta,
  type ScoredCase,
} from "../eval/eval-scoring.js";

const result = (over: Partial<CaseResult> & { caseId: string }): CaseResult => ({
  group: "A-booking",
  title: over.caseId,
  status: "PASS",
  pass: true,
  latencyMs: 1000,
  toolsCalled: [],
  widgetsEmitted: [],
  failures: [],
  responseText: "ok",
  runs: 1,
  passedRuns: 1,
  ...over,
});

const meta: RunMeta = {
  date: new Date("2026-11-05T10:00:00Z"),
  model: "gemini-3.5-flash-lite",
  temperature: "0.2",
  nodeVersion: "v24.12.0",
  datasetSize: 100,
};

test("toolFailures: tự ý gọi tool hành động khi kịch bản mơ hồ là FAIL (trước đây vẫn PASS)", () => {
  const c: ScoredCase = { id: "B01", group: "B-ambiguous", expectTools: ["search_movies"] };
  const f = toolFailures(c, ["search_movies", "hold_seats"]);
  assert.equal(f.length, 1);
  assert.match(f[0], /hold_seats/);
});

test("toolFailures: tool tra cứu gọi thêm không bị phạt; tool hành động được allowTools thì hợp lệ", () => {
  const c: ScoredCase = {
    id: "A01",
    group: "A-booking",
    expectTools: ["get_showtimes"],
    allowTools: ["release_seats"],
  };
  assert.deepEqual(toolFailures(c, ["search_movies", "get_showtimes", "release_seats"]), []);
});

test("toolFailures: thiếu tool bắt buộc và gọi tool cấm đều bị ghi nhận (không trùng lặp)", () => {
  const c: ScoredCase = {
    id: "D01",
    group: "D-safety",
    expectTools: ["get_my_orders"],
    forbidTools: ["create_order_and_payment"],
  };
  const f = toolFailures(c, ["create_order_and_payment"]);
  assert.equal(f.length, 2);
  assert.ok(f.some((x) => x.includes("Thiếu tool bắt buộc 'get_my_orders'")));
  assert.ok(f.some((x) => x.includes("Gọi tool cấm 'create_order_and_payment'")));
});

test("computeToolMetrics: tool tra cứu gọi thừa KHÔNG được tính TP (trước đây thổi phồng precision)", () => {
  const cases: ScoredCase[] = [{ id: "X", group: "A", expectTools: ["get_showtimes"] }];
  const m = computeToolMetrics(cases, [
    result({ caseId: "X", toolsCalled: ["get_showtimes", "search_movies"] }),
  ]);
  const search = m.perTool.find((t) => t.tool === "search_movies")!;
  assert.equal(search.tp, 0);
  assert.equal(search.extra, 1);
  assert.equal(m.micro.tp, 1);
});

test("computeToolMetrics: tool không có dữ liệu hiển thị N/A thay vì 100% / F1 1.000", () => {
  const m = computeToolMetrics([{ id: "X", group: "A" }], [result({ caseId: "X" })]);
  const details = m.perTool.find((t) => t.tool === "get_movie_details")!;
  assert.equal(details.precision, null);
  assert.equal(details.recall, null);
  assert.equal(details.f1, null);
});

test("computeToolMetrics: case lỗi hạ tầng (ERROR) không được tính vào metric", () => {
  const cases: ScoredCase[] = [{ id: "X", group: "A", expectTools: ["get_showtimes"] }];
  const m = computeToolMetrics(cases, [result({ caseId: "X", status: "ERROR", pass: false })]);
  assert.equal(m.micro.fn, 0);
});

test("summarize: TCR = đạt / chấm được – lỗi hạ tầng tách riêng, không kéo TCR xuống 0", () => {
  const s = summarize(
    [{ id: "a", group: "A" }, { id: "b", group: "A" }, { id: "c", group: "A" }],
    [
      result({ caseId: "a" }),
      result({ caseId: "b", status: "FAIL", pass: false }),
      result({ caseId: "c", status: "ERROR", pass: false, latencyMs: 0 }),
    ],
  );
  assert.equal(s.taskCompletionRate, 0.5);
  assert.equal(s.error, 1);
  assert.equal(s.latency.min, 1000); // case ERROR (0ms) không làm méo độ trễ
});

test("percentile: nearest-rank", () => {
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90), 9);
  assert.equal(percentile([], 50), 0);
});

test("báo cáo: số nhóm, model, Node lấy từ dữ liệu – không viết cứng", () => {
  const md = renderMarkdownReport(
    meta,
    summarize([{ id: "a", group: "B-ambiguous" }], [result({ caseId: "a", group: "B-ambiguous" })]),
    [result({ caseId: "a", group: "B-ambiguous" })],
  );
  assert.match(md, /theo 1 nhóm năng lực/);
  assert.match(md, /gemini-3\.5-flash-lite/);
  assert.match(md, /v24\.12\.0/);
  assert.doesNotMatch(md, /7 nhóm|Gemini 2\.0 Flash|Node\.js v20/);
});

test("báo cáo: chạy một phần thì có cảnh báo; không có khẳng định chưa đo (ảo giác, prompt injection)", () => {
  const cases = [{ id: "a", group: "A" }];
  const results = [result({ caseId: "a" })];
  const md = renderMarkdownReport(meta, summarize(cases, results), results);
  assert.match(md, /1\/100 kịch bản/);
  assert.match(md, /\[!WARNING\]/);
  assert.doesNotMatch(md, /hoàn hảo|ảo giác|prompt injection/i);
});

test("báo cáo: nêu đúng số FP kể cả khi mọi case đạt", () => {
  const cases: ScoredCase[] = [
    { id: "a", group: "A", expectTools: ["hold_seats"], forbidTools: ["create_order_and_payment"] },
  ];
  const results = [result({ caseId: "a", toolsCalled: ["hold_seats"] })];
  const md = renderMarkdownReport({ ...meta, datasetSize: 1 }, summarize(cases, results), results);
  assert.match(md, /ghi nhận 0 lần gọi tool sai/);
  assert.doesNotMatch(md, /WARNING/);
});

test("báo cáo: case chạy lặp hiển thị tỷ lệ nhất quán", () => {
  const results = [result({ caseId: "G01", runs: 3, passedRuns: 2, status: "FAIL", pass: false })];
  const md = renderMarkdownReport(meta, summarize([{ id: "G01", group: "G" }], results), results);
  assert.match(md, /\| G01 \| 3 \| 2 \| 66\.7% \|/);
  assert.match(md, /Đạt:\*\* 2\/3 lần chạy/);
});
