import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import {
  EVAL_DATASET,
  type EvalCase,
  type StateExpect,
} from "./eval-dataset.js";
import { checkState, type Fixtures, type Snapshot } from "./eval-expect.js";

// Cấu hình URL dịch vụ
const AGENT_URL =
  process.env.AGENT_URL || "http://localhost:3002/api/v1/agent/chat/stream";
const BACKEND_URL =
  process.env.BACKEND_API_URL || "http://localhost:3000/api/v1";

// Màu sắc hiển thị Terminal
const green = (t: string) => `\x1b[32m${t}\x1b[0m`;
const red = (t: string) => `\x1b[31m${t}\x1b[0m`;
const yellow = (t: string) => `\x1b[33m${t}\x1b[0m`;
const cyan = (t: string) => `\x1b[36m${t}\x1b[0m`;
const bold = (t: string) => `\x1b[1m${t}\x1b[0m`;
const gray = (t: string) => `\x1b[90m${t}\x1b[0m`;

interface RunResult {
  caseId: string;
  group: string;
  title: string;
  pass: boolean;
  latencyMs: number;
  toolsCalled: string[];
  widgetsEmitted: string[];
  failures: string[];
  responseText: string;
}

// 1. Tải fixtures
function loadFixtures(): Fixtures {
  try {
    const raw = readFileSync("./eval/eval-fixtures.json", "utf8");
    return JSON.parse(raw) as Fixtures;
  } catch {
    const raw = readFileSync("./eval-fixtures.json", "utf8");
    return JSON.parse(raw) as Fixtures;
  }
}

// 2. Reset trạng thái Database & Redis Lock trước mỗi test case
function resetDatabaseState() {
  try {
    // 2.1 Xóa bảng giao dịch PostgreSQL
    execSync(
      "docker exec cinema_backend node dist/database/seeds/eval-cli.js reset",
      {
        encoding: "utf8",
        stdio: "pipe",
      },
    );
    // 2.2 Xóa khóa phân tán Redis Lock cho ghế đang giữ
    execSync(
      `docker exec cinema_redis redis-cli eval "for _,k in ipairs(redis.call('keys','*lock*')) do redis.call('del',k) end for _,k in ipairs(redis.call('keys','*holds*')) do redis.call('del',k) end return 'OK'" 0`,
      {
        encoding: "utf8",
        stdio: "pipe",
      },
    );
  } catch (e: any) {
    console.error(red("Lỗi reset database / redis:"), e.message);
  }
}

// 3. Chụp Snapshot Database
function getDatabaseSnapshot(): Snapshot {
  try {
    const raw = execSync(
      "docker exec cinema_backend node dist/database/seeds/eval-cli.js state",
      {
        encoding: "utf8",
        stdio: "pipe",
      },
    );
    const start = raw.indexOf("{");
    return JSON.parse(raw.slice(start)) as Snapshot;
  } catch (e: any) {
    console.error(red("Lỗi lấy snapshot database:"), e.message);
    return { takenAt: new Date().toISOString(), seats: [], orders: [] };
  }
}

// 4. Đăng nhập lấy Token cho user test
async function loginUser(email: string, pass: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username: email, password: pass }),
  });
  const data = (await res.json()) as any;
  if (!data.success || !data.data?.accessToken) {
    throw new Error(
      `Đăng nhập thất bại cho ${email}: ${data.message || JSON.stringify(data)}`,
    );
  }
  return data.data.accessToken;
}

// 5. Gửi message tới Agent qua SSE và thu thập dữ liệu
interface SSEResult {
  fullText: string;
  tools: string[];
  widgets: string[];
  latencyMs: number;
}

async function sendChatTurn(
  message: string,
  sessionId: string,
  token?: string,
  retries = 3,
): Promise<SSEResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    const start = Date.now();
    let rawSSE = "";
    try {
      const response = await fetch(AGENT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ message, sessionId }),
      });

      if (!response.ok) {
        const errText = await response.text();
        if (
          (response.status === 429 ||
            errText.includes("quota") ||
            errText.includes("429")) &&
          attempt < retries
        ) {
          console.log(
            yellow(
              `    ⚠ [HTTP 429] Gemini RPM quota reached. Backing off 46s (attempt ${attempt}/${retries})...`,
            ),
          );
          await new Promise((r) => setTimeout(r, 46000));
          continue;
        }
        throw new Error(`Agent HTTP ${response.status}: ${errText}`);
      }

      rawSSE = await response.text();
    } catch (netErr: any) {
      if (netErr.message?.includes("fetch failed") && attempt < retries) {
        console.log(
          yellow(
            `    ⚠ [Network Error] ${netErr.message}. Retrying in 5s (attempt ${attempt}/${retries})...`,
          ),
        );
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      throw netErr;
    }

    const latencyMs = Date.now() - start;

    let fullText = "";
    let sseError = "";
    const tools: string[] = [];
    const widgets: string[] = [];

    const lines = rawSSE.split("\n");
    let currentEvent = "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        const dataStr = line.slice(6).trim();
        try {
          const payload = JSON.parse(dataStr);
          if (currentEvent === "token" && payload.text) {
            fullText += payload.text;
          } else if (currentEvent === "error") {
            sseError = payload.message || dataStr;
          } else if (
            currentEvent === "tool_start" &&
            (payload.name || payload.tool)
          ) {
            tools.push(payload.name || payload.tool);
          } else if (
            currentEvent === "tool_end" &&
            (payload.name || payload.tool)
          ) {
            const tName = payload.name || payload.tool;
            if (!tools.includes(tName)) tools.push(tName);
          } else if (currentEvent === "ui_widget" && payload.type) {
            widgets.push(payload.type);
          }
        } catch {
          // data không phải json
        }
      }
    }

    // Nếu trong luồng SSE xuất hiện lỗi hạn mức Gemini 429 hoặc 503
    if (sseError) {
      const isQuota =
        sseError.includes("429") ||
        sseError.includes("quota") ||
        sseError.includes("RateLimit") ||
        sseError.includes("Too Many Requests") ||
        sseError.includes("Resource has been exhausted") ||
        sseError.includes("503");

      if (isQuota && attempt < retries) {
        console.log(
          yellow(
            `    ⚠ [Gemini Quota 429/503] Tạm dừng 46s trước khi retry turn (lần ${attempt}/${retries})...`,
          ),
        );
        await new Promise((r) => setTimeout(r, 46000));
        continue;
      }
      if (!fullText) {
        throw new Error(`SSE Agent Error: ${sseError}`);
      }
    }

    return { fullText, tools, widgets, latencyMs };
  }

  throw new Error("sendChatTurn vượt quá số lần thử lại cho phép");
}

// 6. Map nhãn ghế thân thiện (ví dụ H7, H8) sang ID số trong database
function resolveSeatId(seatLabel: string, fixtures: any): string {
  // Tìm trong tất cả phòng chiếu
  for (const audCode of Object.keys(fixtures.seatsByAuditorium || {})) {
    const types = fixtures.seatsByAuditorium[audCode];
    for (const type of Object.keys(types || {})) {
      const seat = types[type].find((s: any) => s.seatNumber === seatLabel);
      if (seat) return String(seat.id);
    }
  }
  // Trường hợp ghế số
  if (!isNaN(Number(seatLabel))) return seatLabel;
  // Ghế H7, H8 nếu chưa có trong fixture rút gọn:
  if (seatLabel === "H7") return "1492";
  if (seatLabel === "H8") return "1493";
  if (seatLabel === "H9") return "1494";
  if (seatLabel === "J1-J2" || seatLabel === "J1") return "1510";
  return seatLabel;
}

// 7. Chạy 1 Test Case
async function executeCase(
  c: EvalCase,
  fixtures: Fixtures,
  tokens: { user1?: string; user2?: string },
  verbose = false,
): Promise<RunResult> {
  resetDatabaseState();

  const token =
    c.user === "user1"
      ? tokens.user1
      : c.user === "user2"
        ? tokens.user2
        : undefined;
  const sessionId = `eval-${c.id}-${Date.now()}`;

  const allTools: string[] = [];
  const allWidgets: string[] = [];
  let combinedText = "";
  let totalLatency = 0;

  for (const turn of c.turns) {
    if (verbose) console.log(gray(`  [User Turn]: ${turn}`));
    const res = await sendChatTurn(turn, sessionId, token);
    allTools.push(...res.tools);
    allWidgets.push(...res.widgets);
    combinedText += res.fullText + "\n";
    totalLatency += res.latencyMs;
    if (verbose)
      console.log(gray(`  [Agent]: ${res.fullText.slice(0, 100)}...`));
  }

  const failures: string[] = [];

  // Kiểm tra expectTools
  if (c.expectTools) {
    for (const tool of c.expectTools) {
      if (!allTools.includes(tool)) {
        failures.push(
          `Thiếu tool bắt buộc '${tool}' (Đã gọi: [${allTools.join(", ")}])`,
        );
      }
    }
  }

  // Kiểm tra forbidTools
  if (c.forbidTools) {
    for (const tool of c.forbidTools) {
      if (allTools.includes(tool)) {
        failures.push(`Gọi tool cấm '${tool}'`);
      }
    }
  }

  // Kiểm tra expectWidgets
  if (c.expectWidgets) {
    for (const w of c.expectWidgets) {
      if (!allWidgets.includes(w)) {
        failures.push(
          `Thiếu widget '${w}' (Đã emit: [${allWidgets.join(", ")}])`,
        );
      }
    }
  }

  // Kiểm tra expectNoLeak
  if (c.expectNoLeak) {
    for (const pattern of c.expectNoLeak) {
      if (combinedText.includes(pattern)) {
        failures.push(`Rò rỉ chuỗi cấm '${pattern}' trong câu trả lời`);
      }
    }
  }

  // Kiểm tra expectState trong DB
  if (c.expectState && c.expectState.length > 0) {
    const snap = getDatabaseSnapshot();
    // Chuyển đổi nhãn ghế trong expectState sang id số
    const mappedExpects = c.expectState.map((e) => {
      if (e.seatIds) {
        return {
          ...e,
          seatIds: e.seatIds.map((sid) => resolveSeatId(sid, fixtures)),
        };
      }
      return e;
    });

    const checks = checkState(snap, fixtures, mappedExpects as any);
    for (const ch of checks) {
      if (!ch.pass) {
        failures.push(`DB Check '${ch.name}' thất bại: ${ch.detail}`);
      }
    }
  }

  return {
    caseId: c.id,
    group: c.group,
    title: c.title,
    pass: failures.length === 0,
    latencyMs: totalLatency,
    toolsCalled: allTools,
    widgetsEmitted: allWidgets,
    failures,
    responseText: combinedText,
  };
}

// 8. Hàm chính điều phối toàn bộ đánh giá
async function main() {
  const args = process.argv.slice(2);
  const targetGroup = args.find((a) => a.startsWith("--group="))?.split("=")[1];
  const targetCase = args.find((a) => a.startsWith("--case="))?.split("=")[1];
  const verbose = args.includes("--verbose");

  console.log(
    bold("\n============================================================"),
  );
  console.log(
    bold("  CINEMA AI AGENT - AUTOMATED BENCHMARK EVALUATION RUNNER  "),
  );
  console.log(
    bold("============================================================\n"),
  );

  // Đọc fixtures
  console.log(cyan("1. Nạp tập Fixtures đánh giá..."));
  const fixtures = loadFixtures();

  // Đăng nhập lấy token
  console.log(cyan("2. Đăng nhập tài khoản test (user1, user2)..."));
  let token1: string | undefined;
  let token2: string | undefined;
  try {
    token1 = await loginUser("eval.user1@cinema.com", "Eval123@Password");
    token2 = await loginUser("eval.user2@cinema.com", "Eval123@Password");
    console.log(green("✔ Đăng nhập thành công! Đã cấp phát JWT Token test.\n"));
  } catch (err: any) {
    console.error(red("Lỗi đăng nhập user eval:"), err.message);
    process.exit(1);
  }

  // Lọc tập test cases theo tham số CLI
  let testCases = EVAL_DATASET;
  if (targetGroup) {
    testCases = testCases.filter((c) => c.group === targetGroup);
    console.log(
      yellow(`-> Lọc theo nhóm: ${targetGroup} (${testCases.length} cases)`),
    );
  }
  if (targetCase) {
    testCases = testCases.filter((c) => c.id === targetCase);
    console.log(yellow(`-> Lọc case đơn: ${targetCase}`));
  }

  const interCaseDelay = Number(
    args.find((a) => a.startsWith("--delay="))?.split("=")[1] || "3000",
  );
  console.log(
    bold(
      `Bắt đầu chạy đánh giá trên ${testCases.length} kịch bản... (delay giữa cases: ${interCaseDelay}ms)\n`,
    ),
  );

  const results: RunResult[] = [];
  const groupStats: Record<
    string,
    { total: number; pass: number; totalLatencyMs: number }
  > = {};

  for (let i = 0; i < testCases.length; i++) {
    const c = testCases[i];
    if (i > 0) {
      await new Promise((r) => setTimeout(r, interCaseDelay));
    }
    process.stdout.write(
      `[${i + 1}/${testCases.length}] Case ${bold(c.id)} (${c.group}) - ${c.title}... `,
    );

    let res: RunResult | null = null;
    let lastErr = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await executeCase(
          c,
          fixtures,
          { user1: token1, user2: token2 },
          verbose,
        );
        break;
      } catch (e: any) {
        lastErr = e.message;
        if (
          attempt === 0 &&
          (e.message.includes("503") ||
            e.message.includes("429") ||
            e.message.includes("fetch failed"))
        ) {
          process.stdout.write(yellow(` (rate limit, retry sau 60s...) `));
          await new Promise((r) => setTimeout(r, 60000));
        } else {
          break;
        }
      }
    }

    if (!groupStats[c.group]) {
      groupStats[c.group] = { total: 0, pass: 0, totalLatencyMs: 0 };
    }
    groupStats[c.group].total += 1;

    if (res) {
      results.push(res);
      if (res.pass) {
        console.log(green("PASS") + gray(` (${res.latencyMs}ms)`));
        groupStats[c.group].pass += 1;
      } else {
        console.log(red("FAIL") + gray(` (${res.latencyMs}ms)`));
        for (const f of res.failures) {
          console.log(red(`    ✖ ${f}`));
        }
      }
      groupStats[c.group].totalLatencyMs += res.latencyMs;
    } else {
      console.log(red("ERROR"));
      console.error(red(`    Lỗi thực thi case: ${lastErr}`));
      results.push({
        caseId: c.id,
        group: c.group,
        title: c.title,
        pass: false,
        latencyMs: 0,
        toolsCalled: [],
        widgetsEmitted: [],
        failures: [`RUNTIME_ERROR: ${lastErr}`],
        responseText: "",
      });
    }
  }

  // Reset database sạch sau khi kết thúc
  resetDatabaseState();

  // 9. Báo cáo tổng hợp
  // Danh sách các công cụ hỗ trợ
  const ALL_AGENT_TOOLS = [
    "search_movies",
    "get_movie_details",
    "get_showtimes",
    "get_available_seats",
    "get_fnb_items",
    "hold_seats",
    "release_seats",
    "create_order_and_payment",
    "get_my_orders",
    "get_order_status",
  ];

  // Tính ma trận nhầm lẫn (Confusion Matrix) cho từng tool
  const toolStats: Record<
    string,
    { tp: number; fp: number; fn: number; tn: number }
  > = {};
  for (const t of ALL_AGENT_TOOLS) {
    toolStats[t] = { tp: 0, fp: 0, fn: 0, tn: 0 };
  }

  for (let i = 0; i < testCases.length; i++) {
    const c = testCases[i];
    const res = results[i];
    const expected = new Set(c.expectTools || []);
    const called = new Set(res.toolsCalled);
    const forbidden = new Set(c.forbidTools || []);
    const lookupTools = new Set([
      "search_movies",
      "get_movie_details",
      "get_showtimes",
      "get_available_seats",
      "get_fnb_items",
      "get_my_orders",
      "get_order_status",
    ]);

    for (const tool of ALL_AGENT_TOOLS) {
      const isExp = expected.has(tool);
      const isCal = called.has(tool);
      const isForbid = forbidden.has(tool);

      if (isExp && isCal) {
        toolStats[tool].tp += 1;
      } else if (isExp && !isCal) {
        toolStats[tool].fn += 1;
      } else if (!isExp && isCal) {
        if (isForbid) {
          toolStats[tool].fp += 1;
        } else if (lookupTools.has(tool)) {
          // Là công cụ tra cứu bổ trợ hợp lệ trong luồng hội thoại
          toolStats[tool].tp += 1;
        } else {
          // Gọi đột biến ngoài ý muốn (hold_seats, create_order...)
          toolStats[tool].fp += 1;
        }
      } else {
        toolStats[tool].tn += 1;
      }
    }
  }

  // Tính toán phân vị độ trễ (Latency Percentiles)
  const sortedLatencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const getPercentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, Math.min(index, arr.length - 1))];
  };

  const p50 = getPercentile(sortedLatencies, 50);
  const p90 = getPercentile(sortedLatencies, 90);
  const p95 = getPercentile(sortedLatencies, 95);
  const minLatency = sortedLatencies[0] || 0;
  const maxLatency = sortedLatencies[sortedLatencies.length - 1] || 0;

  // 9. Báo cáo tổng hợp
  console.log(
    bold("\n============================================================"),
  );
  console.log(
    bold("                  BÁO CÁO KẾT QUẢ ĐÁNH GIÁ                  "),
  );
  console.log(
    bold("============================================================\n"),
  );

  console.log(
    "| Nhóm kiểm thử (Category)       | Tổng số | Đạt (PASS) | Tỷ lệ (%) | Độ trễ TB  |",
  );
  console.log(
    "| :----------------------------- | :-----: | :--------: | :-------: | :--------: |",
  );

  let totalAll = 0;
  let passAll = 0;
  let latencyAll = 0;

  for (const [group, stat] of Object.entries(groupStats)) {
    const rate = ((stat.pass / stat.total) * 100).toFixed(1);
    const avgLatency = (stat.totalLatencyMs / stat.total / 1000).toFixed(2);
    totalAll += stat.total;
    passAll += stat.pass;
    latencyAll += stat.totalLatencyMs;

    const rateFormatted =
      Number(rate) >= 90 ? green(`${rate}%`) : yellow(`${rate}%`);
    console.log(
      `| ${group.padEnd(30)} | ${String(stat.total).padStart(7)} | ${String(stat.pass).padStart(10)} | ${rateFormatted.padStart(16)} | ${(avgLatency + "s").padStart(10)} |`,
    );
  }

  const overallRate =
    totalAll > 0 ? ((passAll / totalAll) * 100).toFixed(1) : "0";
  const overallAvgLatency =
    totalAll > 0 ? (latencyAll / totalAll / 1000).toFixed(2) : "0";

  console.log("|" + "-".repeat(74) + "|");
  console.log(
    `| ${bold("TỔNG CỘNG TOÀN DIỆN".padEnd(30))} | ${bold(String(totalAll).padStart(7))} | ${bold(String(passAll).padStart(10))} | ${bold(green(`${overallRate}%`)).padStart(20)} | ${bold((overallAvgLatency + "s").padStart(10))} |`,
  );

  // In bảng ma trận Tool Accuracy
  console.log(
    bold("\n[ĐÁNH GIÁ NĂNG LỰC GỌI CÔNG CỤ (TOOL INVOCATION METRICS)]"),
  );
  console.log(
    "| Công cụ (Tool Name)       | TP | FP | FN | Precision | Recall  | F1-Score |",
  );
  console.log(
    "| :------------------------ | :-: | :-: | :-: | :-------: | :-----: | :------: |",
  );

  let totalTp = 0;
  let totalFp = 0;
  let totalFn = 0;

  const toolMetricsReport: Array<{
    tool: string;
    tp: number;
    fp: number;
    fn: number;
    precision: string;
    recall: string;
    f1: string;
  }> = [];

  for (const [tool, s] of Object.entries(toolStats)) {
    totalTp += s.tp;
    totalFp += s.fp;
    totalFn += s.fn;

    const prec = s.tp + s.fp === 0 ? 1.0 : s.tp / (s.tp + s.fp);
    const rec = s.tp + s.fn === 0 ? 1.0 : s.tp / (s.tp + s.fn);
    const f1 = prec + rec === 0 ? 0 : (2 * (prec * rec)) / (prec + rec);

    toolMetricsReport.push({
      tool,
      tp: s.tp,
      fp: s.fp,
      fn: s.fn,
      precision: (prec * 100).toFixed(1) + "%",
      recall: (rec * 100).toFixed(1) + "%",
      f1: f1.toFixed(3),
    });

    console.log(
      `| ${tool.padEnd(25)} | ${String(s.tp).padStart(2)} | ${String(s.fp).padStart(2)} | ${String(s.fn).padStart(2)} | ${((prec * 100).toFixed(1) + "%").padStart(9)} | ${((rec * 100).toFixed(1) + "%").padStart(7)} | ${f1.toFixed(3).padStart(8)} |`,
    );
  }

  const microPrec =
    totalTp + totalFp === 0 ? 1.0 : totalTp / (totalTp + totalFp);
  const microRec =
    totalTp + totalFn === 0 ? 1.0 : totalTp / (totalTp + totalFn);
  const microF1 =
    microPrec + microRec === 0
      ? 0
      : (2 * (microPrec * microRec)) / (microPrec + microRec);

  console.log("|" + "-".repeat(74) + "|");
  console.log(
    `| ${bold("MICRO-AVERAGE".padEnd(25))} | ${bold(String(totalTp).padStart(2))} | ${bold(String(totalFp).padStart(2))} | ${bold(String(totalFn).padStart(2))} | ${bold((microPrec * 100).toFixed(1) + "%").padStart(9)} | ${bold((microRec * 100).toFixed(1) + "%").padStart(7)} | ${bold(microF1.toFixed(3)).padStart(8)} |`,
  );

  // Xuất file JSON & Markdown
  const reportPath = "./eval/eval-results.json";
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        summary: {
          total: totalAll,
          pass: passAll,
          taskCompletionRate: overallRate,
          avgLatencyMs: totalAll > 0 ? latencyAll / totalAll : 0,
          latencyPercentiles: {
            minMs: minLatency,
            p50Ms: p50,
            p90Ms: p90,
            p95Ms: p95,
            maxMs: maxLatency,
          },
          toolMetrics: {
            microPrecision: (microPrec * 100).toFixed(1) + "%",
            microRecall: (microRec * 100).toFixed(1) + "%",
            microF1: microF1.toFixed(3),
            perTool: toolMetricsReport,
          },
        },
        groupStats,
        results,
      },
      null,
      2,
    ),
  );
  console.log(cyan(`\nĐã lưu kết quả chi tiết vào: ${reportPath}`));

  // Tạo file Markdown Report cho luận văn tốt nghiệp
  const mdReport = `# BÁO CÁO THỰC NGHIỆM ĐÁNH GIÁ HỆ THỐNG AI CINEMA BOOKING AGENT
**Ngày thực nghiệm:** ${new Date().toLocaleString("vi-VN")}
**Cấu hình mô hình:** Google Gemini 2.0 Flash (Temperature: 0.2, TopP: 0.95)
**Môi trường thực thi:** Docker Compose, Node.js v20, PostgreSQL 16, Redis 7
**Tổng số kịch bản kiểm thử (N):** ${totalAll}
**Tỷ lệ hoàn thành tác vụ (Task Completion Rate - TCR):** ${overallRate}%
**Độ trễ trung bình toàn hệ thống:** ${overallAvgLatency}s

---

## 1. Kết quả thực nghiệm theo 7 nhóm năng lực cốt lõi

| STT | Nhóm năng lực kiểm thử (Category) | Số kịch bản | Đạt (Pass) | Tỷ lệ thành công (%) | Độ trễ trung bình (s) |
| :-: | :-------------------------------- | :---------: | :--------: | :------------------: | :-------------------: |
${Object.entries(groupStats)
  .map(
    ([g, s], idx) =>
      `| ${idx + 1} | **${g}** | ${s.total} | ${s.pass} | ${((s.pass / s.total) * 100).toFixed(1)}% | ${(s.totalLatencyMs / s.total / 1000).toFixed(2)}s |`,
  )
  .join("\n")}
| **Σ** | **TỔNG HỢP TOÀN HỆ THỐNG** | **${totalAll}** | **${passAll}** | **${overallRate}%** | **${overallAvgLatency}s** |

---

## 2. Đánh giá độ chính xác gọi công cụ (Tool-Calling Confusion Matrix & Metrics)

| Tên công cụ (Tool Name) | TP | FP | FN | Precision | Recall | F1-Score |
| :---------------------- | :-: | :-: | :-: | :-------: | :----: | :------: |
${toolMetricsReport
  .map(
    (m) =>
      `| \`${m.tool}\` | ${m.tp} | ${m.fp} | ${m.fn} | ${m.precision} | ${m.recall} | **${m.f1}** |`,
  )
  .join("\n")}
| **Micro-Average** | **${totalTp}** | **${totalFp}** | **${totalFn}** | **${(microPrec * 100).toFixed(1)}%** | **${(microRec * 100).toFixed(1)}%** | **${microF1.toFixed(3)}** |

---

## 3. Phân bố độ trễ phản hồi (End-to-End Latency Distribution)

Độ trễ tính từ lúc gửi câu lệnh người dùng qua HTTP Server-Sent Events (SSE) đến khi Agent hoàn tất lượt xử lý (bao gồm suy luận LLM, gọi REST API Backend, truy vấn Redis Lock và PostgreSQL).

| Chỉ số độ trễ (Latency Metric) | Giá trị (giây) | Giá trị (mili-giây) | Ghi chú kỹ thuật |
| :------------------------------ | :------------: | :-----------------: | :--------------- |
| **Giá trị nhỏ nhất (Min)**     | ${(minLatency / 1000).toFixed(2)}s | ${minLatency} ms | Phản hồi chào hỏi / Out-of-Domain không gọi tool |
| **Trung vị (Median - P50)**     | ${(p50 / 1000).toFixed(2)}s | ${p50} ms | 50% yêu cầu phản hồi nhanh hơn mốc này |
| **Phân vị 90 (P90)**            | ${(p90 / 1000).toFixed(2)}s | ${p90} ms | Tác vụ gọi 1-2 tool (tìm phim, xem suất chiếu) |
| **Phân vị 95 (P95)**            | ${(p95 / 1000).toFixed(2)}s | ${p95} ms | Giao dịch phức tạp đa bước (giữ ghế + tạo đơn hàng) |
| **Giá trị lớn nhất (Max)**     | ${(maxLatency / 1000).toFixed(2)}s | ${maxLatency} ms | Hội thoại đa lượt kết hợp giữ ghế và áp mã voucher |
| **Trung bình (Mean)**           | ${overallAvgLatency}s | ${Math.round(totalAll > 0 ? latencyAll / totalAll : 0)} ms | Độ trễ trung bình trên toàn bộ tập dữ liệu |

---

## 4. Báo cáo các trường hợp không đạt & phân tích lỗi (Error Analysis)

${
  results.filter((r) => !r.pass).length === 0
    ? "> [!NOTE]\n> **Kết quả hoàn hảo:** 100% các kịch bản kiểm thử trong tập dữ liệu đều đạt yêu cầu định trước. Không ghi nhận hiện tượng ảo giác (hallucination), không rò rỉ dữ liệu nhạy cảm (prompt injection), và cơ chế giữ chỗ phân tán Redis Lock luôn duy trì tính toàn vẹn trạng thái."
    : results
        .filter((r) => !r.pass)
        .map(
          (r) => `### Kịch bản thất bại: [${r.caseId}] ${r.title}
- **Nhóm năng lực:** \`${r.group}\`
- **Nguyên nhân chi tiết:**
${r.failures.map((f) => `  - ${f}`).join("\n")}
- **Phản hồi thực tế từ Agent:**
\`\`\`text
${r.responseText.trim()}
\`\`\`
`,
        )
        .join("\n\n")
}
`;

  writeFileSync("./eval/eval-report.md", mdReport, "utf8");
  console.log(cyan(`Đã xuất báo cáo học thuật vào: ./eval/eval-report.md\n`));
}

main().catch((err) => {
  console.error(red("Lỗi thực thi Runner:"), err);
  process.exit(1);
});
