import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import {
  EVAL_DATASET,
  type EvalCase,
  type StateExpect,
} from "./eval-dataset.js";
import { checkState, type Fixtures, type Snapshot } from "./eval-expect.js";
import {
  checkFixtures,
  requiredEvalDate,
  resolveSeatId as resolveSeatIdIn,
  vnDate,
  type DbShowtime,
  type SeatReference,
  type SyncFixtures,
} from "./eval-data-sync.js";
import {
  renderMarkdownReport,
  summarize,
  toolFailures,
  type CaseResult,
} from "./eval-scoring.js";

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

type RunResult = CaseResult;

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

const FIXTURES_PATH = "./eval/eval-fixtures.json";

/**
 * Seed dữ liệu eval cho đúng `evalDate` (ngày mai theo giờ VN) rồi chép fixtures từ container
 * ra máy chạy runner – runner và lệnh reset trong container dùng CÙNG một bản fixtures.
 * Truyền EVAL_DATE cụ thể (không dùng offset) để .env trong container không đè được.
 */
function seedEvalData(evalDate: string) {
  console.log(cyan(`   Seed dữ liệu eval cho ngày ${evalDate} (ngày mai, giờ VN)...`));
  execSync(
    `docker exec -e EVAL_DATE=${evalDate} cinema_backend node dist/database/seeds/eval-cli.js seed`,
    { encoding: "utf8", stdio: "pipe" },
  );
  execSync(`docker cp cinema_backend:/app/eval-fixtures.json ${FIXTURES_PATH}`, {
    stdio: "pipe",
  });
}

/** start_time (UTC) của các suất trong fixtures, đọc trực tiếp từ database. */
function fetchDbShowtimes(ids: string[]): DbShowtime[] {
  const idList = ids.map((id) => Number(id)).filter(Number.isInteger);
  if (idList.length === 0) return [];
  const raw = execSync(
    `docker exec cinema_postgres psql -U cinema_admin -d cinema_db -At -F "|" -c "SELECT id, to_char(start_time, 'YYYY-MM-DD\\"T\\"HH24:MI:SS.MS\\"Z\\"') FROM showtimes WHERE id IN (${idList.join(",")})"`,
    { encoding: "utf8", stdio: "pipe" },
  );
  return raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, startTime] = line.split("|");
      return { id, startTime };
    });
}

/** Mọi nhãn ghế dataset dùng để chấm trạng thái DB – phải tra được trong fixtures. */
function collectSeatRefs(cases: EvalCase[]): SeatReference[] {
  const refs: SeatReference[] = [{ caseId: "C02", label: "H9", showtimeKey: "mai-morning" }];
  for (const c of cases) {
    for (const e of c.expectState ?? []) {
      for (const label of e.seatIds ?? []) {
        refs.push({ caseId: c.id, label, showtimeKey: e.showtime });
      }
    }
  }
  return refs;
}

/**
 * Bảo đảm dữ liệu eval khớp database tại thời điểm chạy. Lỗi => dừng NGAY, không chạy
 * 100 case để nhận về FAIL vô nghĩa vì dữ liệu lệch.
 */
function syncEvalData(seed: boolean, cases: EvalCase[]): Fixtures {
  const evalDate = requiredEvalDate(new Date());
  if (seed) seedEvalData(evalDate);

  const fixtures = loadFixtures();
  const sync = fixtures as unknown as SyncFixtures;
  const errors = checkFixtures(
    sync,
    fetchDbShowtimes(sync.showtimes.map((s) => s.id)),
    collectSeatRefs(cases),
    new Date(),
  );
  if (errors.length > 0) {
    console.error(red("\nDữ liệu eval KHÔNG khớp database – dừng trước khi chạy:"));
    for (const e of errors) console.error(red(`  - ${e}`));
    console.error(
      yellow(
        seed
          ? "\nSeed vừa chạy nhưng vẫn lệch: kiểm tra container cinema_backend đã build bản mới chưa."
          : "\nBỏ cờ --no-seed để runner tự seed lại dữ liệu cho đúng ngày.",
      ),
    );
    process.exit(1);
  }
  console.log(
    green(
      `✔ Dữ liệu eval khớp database: ${sync.showtimes.length} suất chiếu ngày ${sync.evalDate}.`,
    ),
  );
  return fixtures;
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

  // Gộp tool/widget của MỌI lần thử: lần thử lỗi giữa chừng (429/503) có thể đã chạy tool
  // và kết quả đã nằm trong lịch sử hội thoại – lần thử lại trả lời luôn mà không gọi lại.
  const toolsAcrossAttempts: string[] = [];
  const widgetsAcrossAttempts: string[] = [];

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
    let sseErrorCode = "";
    const tools = toolsAcrossAttempts;
    const widgets = widgetsAcrossAttempts;

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
            sseErrorCode = payload.code || "";
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

    // Agent phân loại lỗi LLM thành mã (không lộ lỗi gốc ra client):
    //  - LLM_QUOTA_EXHAUSTED: hết quota theo NGÀY => dừng ngay, chờ thêm vài chục giây vô ích
    //  - LLM_UNAVAILABLE: 429/503 tạm thời => chờ rồi thử lại
    if (sseErrorCode === "LLM_QUOTA_EXHAUSTED") {
      throw new Error(
        "LLM_QUOTA_EXHAUSTED: nhà cung cấp LLM đã hết quota theo ngày – dừng thử lại.",
      );
    }
    if (sseError) {
      const isQuota = sseErrorCode === "LLM_UNAVAILABLE";

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
        if (attempt < retries) {
          console.log(
            yellow(
              `    ⚠ [SSE Error] ${sseError}. Thử lại turn sau 5s (lần ${attempt}/${retries})...`,
            ),
          );
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }
        throw new Error(`SSE Agent Error: ${sseError}`);
      }
    }

    return { fullText, tools, widgets, latencyMs };
  }

  throw new Error("sendChatTurn vượt quá số lần thử lại cho phép");
}

// 6. Map nhãn ghế thân thiện (ví dụ H7, H8) sang ID số trong database
// Tra theo phòng của suất chiếu, không id viết cứng. Bước kiểm tra trước khi chạy đã bảo
// đảm mọi nhãn ghế dataset dùng đều tra được => không tìm thấy ở đây là lỗi logic.
function resolveSeatId(
  seatLabel: string,
  fixtures: Fixtures,
  showtimeKey?: string,
): string {
  const id = resolveSeatIdIn(
    fixtures as unknown as SyncFixtures,
    seatLabel,
    showtimeKey,
  );
  if (id === null) {
    throw new Error(
      `Không tra được ghế "${seatLabel}"${showtimeKey ? ` của suất ${showtimeKey}` : ""} trong fixtures`,
    );
  }
  return id;
}

// 7. Chạy 1 Test Case
async function executeCase(
  c: EvalCase,
  fixtures: Fixtures,
  tokens: { user1?: string; user2?: string },
  verbose = false,
): Promise<RunResult> {
  resetDatabaseState();

  // Thiết lập tiền đề riêng cho ca kiểm thử xung đột ghế (C02: Ghế H9 đã được mua trước)
  if (c.id === "C02") {
    try {
      const stId = fixtures.showtimes.find((s) => s.key === "mai-morning")?.id;
      if (!stId) throw new Error("fixtures thiếu suất mai-morning");
      const seatH9 = resolveSeatId("H9", fixtures, "mai-morning");
      execSync(
        `docker exec cinema_postgres psql -U cinema_admin -d cinema_db -c "INSERT INTO showtime_seats (showtime_id, seat_id, status, user_id) VALUES (${stId}, ${seatH9}, 'BOOKED', 4) ON CONFLICT (showtime_id, seat_id) DO UPDATE SET status = 'BOOKED';"`,
        { stdio: "pipe" },
      );
    } catch (e: any) {
      console.error(
        yellow("Không thể thiết lập ghế BOOKED cho C02:"),
        e.message,
      );
    }
  }

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

  // Tool: thiếu tool bắt buộc, gọi tool cấm, tự ý gọi tool hành động (giữ ghế/tạo đơn)
  failures.push(...toolFailures(c, allTools));

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
          seatIds: e.seatIds.map((sid) =>
            resolveSeatId(sid, fixtures, e.showtime),
          ),
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

  const pass = failures.length === 0;
  return {
    caseId: c.id,
    group: c.group,
    title: c.title,
    status: pass ? "PASS" : "FAIL",
    pass,
    latencyMs: totalLatency,
    toolsCalled: allTools,
    widgetsEmitted: allWidgets,
    failures,
    responseText: combinedText,
    runs: 1,
    passedRuns: pass ? 1 : 0,
  };
}

/**
 * Chạy case `repeat` lần (mặc định 1) để đo độ nhất quán: chỉ ĐẠT khi đạt ở MỌI lần.
 * Kết quả đại diện là lần chạy thất bại đầu tiên (nếu có), độ trễ lấy trung bình.
 */
async function executeCaseRepeated(
  c: EvalCase,
  fixtures: Fixtures,
  tokens: { user1?: string; user2?: string },
  verbose = false,
): Promise<RunResult> {
  const runs = Math.max(1, c.repeat ?? 1);
  const all: RunResult[] = [];
  for (let k = 0; k < runs; k++) {
    if (runs > 1 && verbose) console.log(gray(`  [Lần ${k + 1}/${runs}]`));
    all.push(await executeCase(c, fixtures, tokens, verbose));
  }
  if (runs === 1) return all[0];

  const passedRuns = all.filter((r) => r.pass).length;
  const representative = all.find((r) => !r.pass) ?? all[all.length - 1];
  const pass = passedRuns === runs;
  return {
    ...representative,
    status: pass ? "PASS" : "FAIL",
    pass,
    latencyMs: Math.round(all.reduce((a, r) => a + r.latencyMs, 0) / runs),
    failures: all.flatMap((r, k) =>
      r.failures.map((f) => `Lần ${k + 1}/${runs}: ${f}`),
    ),
    runs,
    passedRuns,
  };
}

/** Đọc model đang chạy từ /health của agent – báo cáo ghi đúng model thực tế. */
async function fetchAgentInfo(): Promise<{ model: string; temperature: string }> {
  try {
    const res = await fetch(`${new URL(AGENT_URL).origin}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const j = (await res.json()) as { model?: string; temperature?: number };
    return {
      model: j.model ?? "không rõ",
      temperature:
        j.temperature !== undefined ? String(j.temperature) : "không rõ",
    };
  } catch {
    return {
      model: "không rõ (không đọc được /health của agent)",
      temperature: "không rõ",
    };
  }
}

// 8. Hàm chính điều phối toàn bộ đánh giá
async function main() {
  const args = process.argv.slice(2);
  const targetGroup = args.find((a) => a.startsWith("--group="))?.split("=")[1];
  const targetCase = args.find((a) => a.startsWith("--case="))?.split("=")[1];
  // --cases=A03,A04,F01: chạy lại đúng các case cần (VD: các case FAIL lần trước)
  const targetCases = args
    .find((a) => a.startsWith("--cases="))
    ?.split("=")[1]
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  // --no-seed: dùng dữ liệu đã seed sẵn (VD: tái hiện một lần chạy) – vẫn kiểm tra khớp DB
  const shouldSeed = !args.includes("--no-seed");
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

  // Seed (mặc định) + kiểm tra dữ liệu eval khớp database tại thời điểm chạy
  console.log(cyan("1. Đồng bộ dữ liệu đánh giá với database..."));
  let fixtures = syncEvalData(shouldSeed, EVAL_DATASET);
  let seededForDate = requiredEvalDate(new Date());

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
    testCases = testCases.filter(
      (c) =>
        c.group === targetGroup ||
        c.group.toLowerCase().startsWith(targetGroup.toLowerCase()) ||
        c.group.split("-")[0].toLowerCase() === targetGroup.toLowerCase(),
    );
    console.log(
      yellow(`-> Lọc theo nhóm: ${targetGroup} (${testCases.length} cases)`),
    );
  }
  if (targetCase) {
    testCases = testCases.filter((c) => c.id === targetCase);
    console.log(yellow(`-> Lọc case đơn: ${targetCase}`));
  }
  if (targetCases?.length) {
    const unknown = targetCases.filter(
      (id) => !EVAL_DATASET.some((c) => c.id === id),
    );
    if (unknown.length) {
      console.error(red(`Không có case: ${unknown.join(", ")}`));
      process.exit(1);
    }
    testCases = testCases.filter((c) => targetCases.includes(c.id));
    console.log(yellow(`-> Chạy ${testCases.length} case: ${targetCases.join(",")}`));
  }
  // --from=<caseId>: chạy tiếp từ một case (VD: sau khi hết quota hôm trước)
  const fromCase = args.find((a) => a.startsWith("--from="))?.split("=")[1];
  if (fromCase) {
    const idx = testCases.findIndex((c) => c.id === fromCase);
    if (idx < 0) {
      console.error(red(`Không tìm thấy case --from=${fromCase}`));
      process.exit(1);
    }
    testCases = testCases.slice(idx);
    console.log(
      yellow(`-> Chạy tiếp từ case ${fromCase} (${testCases.length} cases)`),
    );
  }
  const filterDesc = [
    targetGroup && `--group=${targetGroup}`,
    targetCase && `--case=${targetCase}`,
    fromCase && `--from=${fromCase}`,
    targetCases?.length && `--cases=${targetCases.join(",")}`,
    !shouldSeed && "--no-seed",
  ]
    .filter(Boolean)
    .join(" ");
  const agentInfo = await fetchAgentInfo();
  console.log(
    cyan(
      `3. Mô hình đang chạy: ${agentInfo.model} (temperature ${agentInfo.temperature})`,
    ),
  );

  const interCaseDelay = Number(
    args.find((a) => a.startsWith("--delay="))?.split("=")[1] || "3000",
  );
  console.log(
    bold(
      `Bắt đầu chạy đánh giá trên ${testCases.length} kịch bản... (delay giữa cases: ${interCaseDelay}ms)\n`,
    ),
  );

  const results: RunResult[] = [];

  let quotaExhausted = false;
  for (let i = 0; i < testCases.length; i++) {
    const c = testCases[i];
    if (i > 0) {
      await new Promise((r) => setTimeout(r, interCaseDelay));
    }

    // Đợt chạy kéo dài qua nửa đêm (giờ VN): "ngày mai" đã đổi => seed lại trước case này.
    // Mỗi case tự reset DB nên seed giữa chừng không ảnh hưởng case khác.
    const needDate = requiredEvalDate(new Date());
    if (needDate !== seededForDate) {
      if (shouldSeed) {
        console.log(
          yellow(`\n⟳ Đã sang ngày ${vnDate(new Date())} – seed lại dữ liệu eval.`),
        );
        fixtures = syncEvalData(true, EVAL_DATASET);
        seededForDate = needDate;
      } else {
        console.log(
          yellow(
            `\n⚠ Đã sang ngày mới nhưng đang chạy --no-seed: các case sau có thể FAIL vì dữ liệu lệch ngày.`,
          ),
        );
        seededForDate = needDate;
      }
    }
    process.stdout.write(
      `[${i + 1}/${testCases.length}] Case ${bold(c.id)} (${c.group}) - ${c.title}... `,
    );

    let res: RunResult | null = null;
    let lastErr = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await executeCaseRepeated(
          c,
          fixtures,
          { user1: token1, user2: token2 },
          verbose,
        );
        break;
      } catch (e: any) {
        lastErr = e.message;
        if (String(e.message).startsWith("LLM_QUOTA_EXHAUSTED")) {
          quotaExhausted = true;
          break;
        }
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

    if (res) {
      results.push(res);
      const runsInfo = res.runs > 1 ? `, đạt ${res.passedRuns}/${res.runs} lần` : "";
      if (res.pass) {
        console.log(green("PASS") + gray(` (${res.latencyMs}ms${runsInfo})`));
      } else {
        console.log(red("FAIL") + gray(` (${res.latencyMs}ms${runsInfo})`));
        for (const f of res.failures) {
          console.log(red(`    ✖ ${f}`));
        }
      }
    } else {
      // Lỗi hạ tầng (LLM hết quota, mạng…): KHÔNG phải agent trả lời sai => không tính vào TCR
      console.log(yellow("ERROR"));
      console.error(yellow(`    Lỗi hạ tầng, không chấm được: ${lastErr}`));
      results.push({
        caseId: c.id,
        group: c.group,
        title: c.title,
        status: "ERROR",
        pass: false,
        latencyMs: 0,
        toolsCalled: [],
        widgetsEmitted: [],
        failures: [lastErr],
        responseText: "",
        runs: 0,
        passedRuns: 0,
      });
    }

    if (quotaExhausted) {
      console.log(
        red(
          `
⛔ Hết quota LLM theo ngày – dừng sau case ${c.id}. Báo cáo chỉ gồm ${i + 1}/${testCases.length} case đã chạy.` +
            ` Chạy tiếp các case còn lại khi quota được reset.`,
        ),
      );
      testCases = testCases.slice(0, i + 1);
      break;
    }
  }

  // Reset database sạch sau khi kết thúc
  resetDatabaseState();

  // 9. Báo cáo – mọi số liệu và nhận định sinh từ dữ liệu (xem eval-scoring.ts)
  const summary = summarize(testCases, results);
  const pctText = (v: number | null) =>
    v === null ? "N/A" : `${(v * 100).toFixed(1)}%`;

  console.log(
    bold("\n================ BÁO CÁO KẾT QUẢ ĐÁNH GIÁ ================\n"),
  );
  console.log("| Nhóm             | Tổng | Đạt | Không đạt | Lỗi HT | TCR    |");
  console.log("| :--------------- | :--: | :-: | :-------: | :----: | :----: |");
  for (const g of summary.groups) {
    const tcr = g.pass + g.fail > 0 ? g.pass / (g.pass + g.fail) : null;
    console.log(
      `| ${g.group.padEnd(16)} | ${String(g.total).padStart(4)} | ${String(g.pass).padStart(3)} | ${String(g.fail).padStart(9)} | ${String(g.error).padStart(6)} | ${pctText(tcr).padStart(6)} |`,
    );
  }
  console.log(
    bold(
      `\nTCR: ${pctText(summary.taskCompletionRate)} (${summary.pass} đạt / ${summary.pass + summary.fail} chấm được; ${summary.error} lỗi hạ tầng)`,
    ),
  );
  const micro = summary.tools.micro;
  console.log(
    bold(
      `Tool micro-average: precision ${pctText(micro.precision)}, recall ${pctText(micro.recall)}, FP ${micro.fp}, gọi thêm ${micro.extra}`,
    ),
  );

  const meta = {
    date: new Date(),
    model: agentInfo.model,
    temperature: agentInfo.temperature,
    nodeVersion: process.version,
    datasetSize: EVAL_DATASET.length,
    stoppedEarly: quotaExhausted
      ? "nhà cung cấp LLM hết quota theo ngày"
      : undefined,
    filter: filterDesc || undefined,
  };

  const reportPath = "./eval/eval-results.json";
  writeFileSync(reportPath, JSON.stringify({ meta, summary, results }, null, 2));
  console.log(cyan(`\nĐã lưu kết quả chi tiết vào: ${reportPath}`));

  writeFileSync(
    "./eval/eval-report.md",
    renderMarkdownReport(meta, summary, results),
    "utf8",
  );
  console.log(cyan(`Đã xuất báo cáo vào: ./eval/eval-report.md\n`));
}

main().catch((err) => {
  console.error(red("Lỗi thực thi Runner:"), err);
  process.exit(1);
});
