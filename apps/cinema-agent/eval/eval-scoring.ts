/**
 * Chấm điểm & sinh báo cáo eval – hàm THUẦN (không I/O) để kiểm thử được.
 *
 * Nguyên tắc: mọi con số và mọi câu nhận định trong báo cáo đều phải suy ra từ dữ liệu
 * của lần chạy. Không có câu khẳng định nào được viết cứng.
 */

/** Tool có tác dụng phụ (giữ ghế, tạo đơn, nhả ghế) – gọi sai là lỗi hành vi nghiêm trọng. */
export const ACTION_TOOLS = [
  "hold_seats",
  "release_seats",
  "create_order_and_payment",
] as const;

/** Tool chỉ đọc – gọi thêm để tra cứu là hợp lệ, nhưng KHÔNG được tính là đúng (TP). */
export const LOOKUP_TOOLS = [
  "search_movies",
  "get_movie_details",
  "get_showtimes",
  "get_available_seats",
  "get_fnb_items",
  "get_my_orders",
  "get_order_status",
] as const;

export const ALL_AGENT_TOOLS: readonly string[] = [...LOOKUP_TOOLS, ...ACTION_TOOLS];

const ACTION_SET = new Set<string>(ACTION_TOOLS);
const LOOKUP_SET = new Set<string>(LOOKUP_TOOLS);

export type CaseStatus = "PASS" | "FAIL" | "ERROR";

/** Phần tối thiểu của một test case mà việc chấm điểm cần. */
export interface ScoredCase {
  id: string;
  group: string;
  expectTools?: string[];
  forbidTools?: string[];
  /** Tool hành động được phép gọi dù không bắt buộc (mặc định: không có). */
  allowTools?: string[];
  repeat?: number;
}

export interface CaseResult {
  caseId: string;
  group: string;
  title: string;
  /** PASS/FAIL: agent chạy xong và được chấm. ERROR: lỗi hạ tầng (LLM hết quota, mạng…) – không chấm được. */
  status: CaseStatus;
  pass: boolean;
  latencyMs: number;
  toolsCalled: string[];
  widgetsEmitted: string[];
  failures: string[];
  responseText: string;
  /** Số lần chạy và số lần đạt (case có `repeat` > 1 đo độ nhất quán). */
  runs: number;
  passedRuns: number;
}

/** Lỗi chấm điểm liên quan tới tool (thiếu tool, gọi tool cấm, gọi tool hành động ngoài yêu cầu). */
export function toolFailures(c: ScoredCase, toolsCalled: string[]): string[] {
  const failures: string[] = [];
  const called = new Set(toolsCalled);
  const expected = new Set(c.expectTools ?? []);
  const allowed = new Set(c.allowTools ?? []);

  for (const tool of expected) {
    if (!called.has(tool)) {
      failures.push(
        `Thiếu tool bắt buộc '${tool}' (Đã gọi: [${toolsCalled.join(", ")}])`,
      );
    }
  }
  for (const tool of c.forbidTools ?? []) {
    if (called.has(tool)) failures.push(`Gọi tool cấm '${tool}'`);
  }
  for (const tool of called) {
    const forbidden = (c.forbidTools ?? []).includes(tool);
    if (ACTION_SET.has(tool) && !expected.has(tool) && !allowed.has(tool) && !forbidden) {
      failures.push(
        `Tự ý gọi tool hành động '${tool}' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)`,
      );
    }
  }
  return failures;
}

export interface ToolMetric {
  tool: string;
  tp: number;
  fp: number;
  fn: number;
  /** Lần gọi tool tra cứu không bắt buộc – không tính đúng/sai, chỉ thống kê. */
  extra: number;
  /** null = không đủ dữ liệu (mẫu số bằng 0) => hiển thị N/A, KHÔNG phải 100%. */
  precision: number | null;
  recall: number | null;
  f1: number | null;
}

export interface ToolMetrics {
  perTool: ToolMetric[];
  micro: ToolMetric;
}

function ratio(num: number, den: number): number | null {
  return den === 0 ? null : num / den;
}

function f1Of(p: number | null, r: number | null): number | null {
  if (p === null || r === null) return null;
  return p + r === 0 ? 0 : (2 * p * r) / (p + r);
}

/**
 * Ma trận nhầm lẫn theo tool, chỉ trên các case đã chấm được (PASS/FAIL, bỏ ERROR):
 *  - TP: tool bắt buộc và đã gọi
 *  - FN: tool bắt buộc nhưng không gọi
 *  - FP: tool không bắt buộc mà vẫn gọi, và là tool cấm hoặc tool hành động không được phép
 *  - extra: tool tra cứu gọi thêm (hợp lệ, không cộng vào TP để tránh thổi phồng precision)
 */
export function computeToolMetrics(
  cases: ScoredCase[],
  results: CaseResult[],
): ToolMetrics {
  const byId = new Map(cases.map((c) => [c.id, c]));
  const stats = new Map(
    ALL_AGENT_TOOLS.map((t) => [t, { tp: 0, fp: 0, fn: 0, extra: 0 }]),
  );

  for (const r of results) {
    if (r.status === "ERROR") continue;
    const c = byId.get(r.caseId);
    if (!c) continue;
    const expected = new Set(c.expectTools ?? []);
    const allowed = new Set(c.allowTools ?? []);
    const forbidden = new Set(c.forbidTools ?? []);
    const called = new Set(r.toolsCalled);

    for (const tool of ALL_AGENT_TOOLS) {
      const s = stats.get(tool)!;
      const isExp = expected.has(tool);
      const isCal = called.has(tool);
      if (isExp && isCal) s.tp++;
      else if (isExp) s.fn++;
      else if (isCal) {
        if (forbidden.has(tool)) s.fp++;
        else if (LOOKUP_SET.has(tool) || allowed.has(tool)) s.extra++;
        else s.fp++;
      }
    }
  }

  const toMetric = (
    tool: string,
    s: { tp: number; fp: number; fn: number; extra: number },
  ): ToolMetric => {
    const precision = ratio(s.tp, s.tp + s.fp);
    const recall = ratio(s.tp, s.tp + s.fn);
    return { tool, ...s, precision, recall, f1: f1Of(precision, recall) };
  };

  const perTool = ALL_AGENT_TOOLS.map((t) => toMetric(t, stats.get(t)!));
  const sum = perTool.reduce(
    (acc, m) => ({
      tp: acc.tp + m.tp,
      fp: acc.fp + m.fp,
      fn: acc.fn + m.fn,
      extra: acc.extra + m.extra,
    }),
    { tp: 0, fp: 0, fn: 0, extra: 0 },
  );
  return { perTool, micro: toMetric("Micro-Average", sum) };
}

/** Phân vị theo phương pháp nearest-rank. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

export interface GroupStat {
  group: string;
  total: number;
  pass: number;
  fail: number;
  error: number;
  /** Trung bình độ trễ trên case đã chấm được. */
  avgLatencyMs: number;
}

export function groupStats(results: CaseResult[]): GroupStat[] {
  const map = new Map<string, GroupStat & { latencySum: number }>();
  for (const r of results) {
    const g =
      map.get(r.group) ??
      { group: r.group, total: 0, pass: 0, fail: 0, error: 0, avgLatencyMs: 0, latencySum: 0 };
    g.total++;
    if (r.status === "PASS") g.pass++;
    else if (r.status === "FAIL") g.fail++;
    else g.error++;
    if (r.status !== "ERROR") g.latencySum += r.latencyMs;
    map.set(r.group, g);
  }
  return [...map.values()]
    .sort((a, b) => a.group.localeCompare(b.group))
    .map(({ latencySum, ...g }) => ({
      ...g,
      avgLatencyMs: g.pass + g.fail > 0 ? latencySum / (g.pass + g.fail) : 0,
    }));
}

export interface RunMeta {
  date: Date;
  model: string;
  temperature: string;
  nodeVersion: string;
  /** Số case trong toàn bộ dataset (để ghi rõ khi chỉ chạy một phần). */
  datasetSize: number;
  /** Lý do dừng sớm (VD: hết quota LLM), nếu có. */
  stoppedEarly?: string;
  /** Bộ lọc CLI đã dùng (--group, --case, --from). */
  filter?: string;
}

export interface ReportSummary {
  total: number;
  pass: number;
  fail: number;
  error: number;
  /** PASS / (PASS + FAIL) – null khi không có case nào chấm được. */
  taskCompletionRate: number | null;
  latency: { min: number; p50: number; p90: number; p95: number; max: number; mean: number };
  groups: GroupStat[];
  tools: ToolMetrics;
  consistency: Array<{ caseId: string; runs: number; passedRuns: number }>;
}

export function summarize(cases: ScoredCase[], results: CaseResult[]): ReportSummary {
  const scored = results.filter((r) => r.status !== "ERROR");
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const latencies = scored.map((r) => r.latencyMs).sort((a, b) => a - b);
  const mean = latencies.length
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : 0;

  return {
    total: results.length,
    pass,
    fail,
    error: results.length - pass - fail,
    taskCompletionRate: ratio(pass, pass + fail),
    latency: {
      min: latencies[0] ?? 0,
      p50: percentile(latencies, 50),
      p90: percentile(latencies, 90),
      p95: percentile(latencies, 95),
      max: latencies.at(-1) ?? 0,
      mean,
    },
    groups: groupStats(results),
    tools: computeToolMetrics(cases, results),
    consistency: results
      .filter((r) => r.runs > 1 && r.status !== "ERROR")
      .map((r) => ({ caseId: r.caseId, runs: r.runs, passedRuns: r.passedRuns })),
  };
}

const pct = (v: number | null) => (v === null ? "N/A" : `${(v * 100).toFixed(1)}%`);
const dec = (v: number | null) => (v === null ? "N/A" : v.toFixed(3));
const sec = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

/** Báo cáo Markdown – mọi nhận định đều sinh từ dữ liệu. */
export function renderMarkdownReport(
  meta: RunMeta,
  summary: ReportSummary,
  results: CaseResult[],
): string {
  const s = summary;
  const lines: string[] = [];
  const partial = s.total < meta.datasetSize;

  lines.push("# BÁO CÁO THỰC NGHIỆM ĐÁNH GIÁ AI CINEMA BOOKING AGENT", "");
  lines.push(`**Ngày thực nghiệm:** ${meta.date.toLocaleString("vi-VN")}  `);
  lines.push(`**Mô hình:** ${meta.model} (temperature ${meta.temperature})  `);
  lines.push(`**Môi trường:** Node.js ${meta.nodeVersion}  `);
  lines.push(
    `**Số kịch bản đã chạy:** ${s.total}/${meta.datasetSize}${meta.filter ? ` (lọc: ${meta.filter})` : ""}  `,
  );
  lines.push(
    `**Kết quả:** ${s.pass} đạt · ${s.fail} không đạt · ${s.error} lỗi hạ tầng (không chấm được)  `,
  );
  lines.push(
    `**Tỷ lệ hoàn thành tác vụ (TCR = đạt / chấm được):** ${pct(s.taskCompletionRate)}  `,
  );
  lines.push(`**Độ trễ trung bình:** ${sec(s.latency.mean)}`, "");

  if (partial || meta.stoppedEarly || s.error > 0) {
    lines.push("> [!WARNING]");
    if (partial) {
      lines.push(
        `> Báo cáo chỉ phản ánh ${s.total}/${meta.datasetSize} kịch bản – không đại diện cho toàn bộ bộ dữ liệu.`,
      );
    }
    if (meta.stoppedEarly) lines.push(`> Dừng sớm: ${meta.stoppedEarly}`);
    if (s.error > 0) {
      lines.push(
        `> ${s.error} kịch bản lỗi hạ tầng bị loại khỏi TCR, metric tool và độ trễ.`,
      );
    }
    lines.push("");
  }

  lines.push("---", "", `## 1. Kết quả theo ${s.groups.length} nhóm năng lực`, "");
  lines.push(
    "| Nhóm | Số kịch bản | Đạt | Không đạt | Lỗi hạ tầng | TCR | Độ trễ TB |",
    "| :--- | :-: | :-: | :-: | :-: | :-: | :-: |",
  );
  for (const g of s.groups) {
    lines.push(
      `| **${g.group}** | ${g.total} | ${g.pass} | ${g.fail} | ${g.error} | ${pct(ratio(g.pass, g.pass + g.fail))} | ${sec(g.avgLatencyMs)} |`,
    );
  }
  lines.push(
    `| **Tổng** | **${s.total}** | **${s.pass}** | **${s.fail}** | **${s.error}** | **${pct(s.taskCompletionRate)}** | **${sec(s.latency.mean)}** |`,
    "",
  );

  lines.push("---", "", "## 2. Độ chính xác gọi công cụ", "");
  lines.push(
    "TP: tool bắt buộc và đã gọi · FN: bắt buộc nhưng không gọi · FP: gọi tool cấm hoặc tool hành động (giữ ghế, tạo đơn, nhả ghế) khi không được yêu cầu · " +
      "Gọi thêm: tool tra cứu không bắt buộc (hợp lệ, không tính vào TP/FP). N/A: không đủ dữ liệu để tính.",
    "",
  );
  lines.push(
    "| Tool | TP | FP | FN | Gọi thêm | Precision | Recall | F1 |",
    "| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |",
  );
  for (const m of [...s.tools.perTool, s.tools.micro]) {
    const name = m.tool === "Micro-Average" ? "**Micro-Average**" : `\`${m.tool}\``;
    lines.push(
      `| ${name} | ${m.tp} | ${m.fp} | ${m.fn} | ${m.extra} | ${pct(m.precision)} | ${pct(m.recall)} | ${dec(m.f1)} |`,
    );
  }
  lines.push("");

  lines.push("---", "", "## 3. Phân bố độ trễ", "");
  lines.push(
    "Đo từ lúc gửi tin nhắn tới khi agent kết thúc lượt (gồm suy luận LLM và các lần gọi backend), cộng dồn mọi lượt của kịch bản; chỉ tính kịch bản chấm được.",
    "",
    "| Chỉ số | Giá trị |",
    "| :--- | :-: |",
    `| Min | ${sec(s.latency.min)} |`,
    `| P50 (trung vị) | ${sec(s.latency.p50)} |`,
    `| P90 | ${sec(s.latency.p90)} |`,
    `| P95 | ${sec(s.latency.p95)} |`,
    `| Max | ${sec(s.latency.max)} |`,
    `| Trung bình | ${sec(s.latency.mean)} |`,
    "",
  );

  if (s.consistency.length > 0) {
    lines.push("---", "", "## 4. Độ nhất quán (kịch bản chạy lặp)", "");
    lines.push("| Kịch bản | Số lần chạy | Số lần đạt | Tỷ lệ |", "| :--- | :-: | :-: | :-: |");
    for (const c of s.consistency) {
      lines.push(
        `| ${c.caseId} | ${c.runs} | ${c.passedRuns} | ${pct(ratio(c.passedRuns, c.runs))} |`,
      );
    }
    lines.push("", "Một kịch bản chạy lặp chỉ được tính ĐẠT khi đạt ở mọi lần chạy.", "");
  }

  const failed = results.filter((r) => r.status === "FAIL");
  const errored = results.filter((r) => r.status === "ERROR");
  lines.push("---", "", "## Phân tích lỗi", "");
  if (failed.length === 0 && errored.length === 0) {
    lines.push(
      `Tất cả ${s.total} kịch bản đã chạy đều đạt các tiêu chí kiểm tra tự động; ` +
        `ghi nhận ${s.tools.micro.fp} lần gọi tool sai (FP). Kết luận chỉ áp dụng cho các tiêu chí được kiểm tra trong bộ dữ liệu.`,
      "",
    );
  }
  for (const r of failed) {
    lines.push(`### [${r.caseId}] ${r.title}`, `- **Nhóm:** \`${r.group}\``);
    if (r.runs > 1) lines.push(`- **Đạt:** ${r.passedRuns}/${r.runs} lần chạy`);
    lines.push("- **Nguyên nhân:**", ...r.failures.map((f) => `  - ${f}`));
    lines.push("- **Phản hồi của agent:**", "```text", r.responseText.trim(), "```", "");
  }
  if (errored.length > 0) {
    lines.push("### Lỗi hạ tầng (không chấm được)", "");
    for (const r of errored) {
      lines.push(`- **[${r.caseId}]** ${r.title}: ${r.failures.join("; ")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
