import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { createBackendClient } from "../src/lib/backend-client.js";
import { createAgentNode, createToolsNode, routeAfterAgent } from "../src/graph/nodes.js";
import { pipeAgentStream } from "../src/stream/pipe-stream.js";
import { startFakeBackend } from "./helpers.js";

let be: Awaited<ReturnType<typeof startFakeBackend>>;
before(async () => (be = await startFakeBackend()));
after(() => be.close());

/** Chạy vòng agent ⇄ tools giống graph thật để kiểm tra nút và trạng thái */
test("vòng agent → tools → agent: cập nhật trạng thái, widget và truyền token/config", async () => {
  const seen: any[] = [];
  const script = [
    new AIMessage({ content: "", tool_calls: [{ id: "c1", name: "get_showtimes", args: { movieId: 6, date: "2026-10-11" } }] }),
    new AIMessage({ content: "Có suất 19:45 nhé." }),
  ];
  const model = { invoke: async (msgs: any[], cfg: any) => { seen.push({ msgs, cfg }); return script.shift(); } };
  const backend = createBackendClient({ baseUrl: be.url });
  const agent = createAgentNode({ model, backend });
  const tools = createToolsNode({ model, backend });
  const config = { configurable: { authToken: "good" } };

  let state: any = { messages: [new HumanMessage("Lật Mặt 8 hôm nay?")], movieId: null, movieTitle: null, showtimeId: null, selectedSeats: [], holdExpiresAt: null, orderId: null, activeWidget: null };
  const merge = (u: any) => { state = { ...state, ...u, messages: state.messages.concat(u.messages ?? []) }; };

  merge(await agent(state, config));
  assert.equal(routeAfterAgent(state), "tools");
  const toolUpdate: any = await tools(state, config);
  merge(toolUpdate);
  assert.equal(state.movieId, 6);
  assert.equal(state.activeWidget.type, "SHOWTIME_SELECTOR");
  assert.equal(state.messages.at(-1).name, "get_showtimes");
  assert.equal(JSON.parse(state.messages.at(-1).content).ok, true);

  merge(await agent(state, config));
  assert.equal(routeAfterAgent(state), "end");
  // system prompt đứng đầu, config chuyển tới mô hình, đã đăng nhập
  assert.equal(seen[0].msgs[0].getType(), "system");
  assert.ok(seen[0].msgs[0].content.includes("Khách đã đăng nhập"));
  assert.equal(seen[0].cfg, config);
  assert.ok(seen[1].msgs[0].content.includes("Lật Mặt 8"));
});

test("pipeAgentStream: token thật, tool_start/tool_end, widget gửi ngay, ngắt đoạn sau tool", async () => {
  const events: Array<[string, any]> = [];
  async function* gen() {
    yield ["messages", [{ content: "Để mình " }, { langgraph_node: "agent" }]];
    yield ["messages", [{ content: "tra cứu." }, { langgraph_node: "agent" }]];
    yield ["updates", { agent: { messages: [{ tool_calls: [{ name: "get_showtimes" }] }] } }];
    yield ["updates", { tools: { messages: [{ name: "get_showtimes", content: JSON.stringify({ ok: true }) }], activeWidget: { type: "SHOWTIME_SELECTOR", title: "t", payload: {} } } }];
    yield ["messages", [{ content: [{ type: "text", text: "Có 1 suất." }] }, { langgraph_node: "agent" }]];
    yield ["messages", [{ content: "bỏ qua" }, { langgraph_node: "tools" }]];
  }
  await pipeAgentStream(gen(), (e, d) => events.push([e, d]));
  assert.deepEqual(events.map((e) => e[0]), ["token", "token", "tool_start", "tool_end", "ui_widget", "token"]);
  assert.equal(events[5][1].text, "\n\nCó 1 suất.");
  assert.equal(events[3][1].ok, true);
});

test("pipeAgentStream: mô hình im lặng thì gửi câu dự phòng", async () => {
  const events: any[] = [];
  async function* empty() {}
  const r = await pipeAgentStream(empty(), (e, d) => events.push([e, d]));
  assert.equal(r.streamedText, false);
  assert.equal(events[0][0], "token");
});
