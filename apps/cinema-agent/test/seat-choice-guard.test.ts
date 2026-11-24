import { test } from "node:test";
import assert from "node:assert/strict";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import {
  findUnconfirmedHolds,
  mentionsSeat,
  unconfirmedSeats,
} from "../src/graph/seat-choice-guard.js";
import { createAgentNode } from "../src/graph/nodes.js";
import { pipeAgentStream } from "../src/stream/pipe-stream.js";

const hold = (seatLabels: string[], id = "h1") => ({
  id,
  name: "hold_seats",
  args: { showtimeId: 897, seatLabels },
});

test("nhận ra số ghế khách gõ, kể cả chữ thường, có dấu cách, ghế đôi", () => {
  assert.equal(mentionsSeat("giữ giúp tôi ghế h7 nhé", "H7"), true);
  assert.equal(mentionsSeat("cho mình H 8 với", "H8"), true);
  assert.equal(mentionsSeat("ghế H7,H8", "H8"), true);
  assert.equal(mentionsSeat("Giữ giúp tôi ghế đôi J1-J2 suất đó nhé", "J1-J2"), true);
  // không nhầm H70 với H7, AH7 với H7, chỉ J1 với ghế đôi J1-J2
  assert.equal(mentionsSeat("ghế H70", "H7"), false);
  assert.equal(mentionsSeat("mã AH7", "H7"), false);
  assert.equal(mentionsSeat("ghế J1", "J1-J2"), false);
});

test("tái hiện B03: khách nhờ 'chọn ghế đẹp nhất' => mọi ghế mô hình tự chọn đều bị chặn", () => {
  const messages = [new HumanMessage("Suất 10:00 ngày mai phim Mai chọn cho tôi 2 ghế ở vị trí đẹp nhất rạp")];
  assert.deepEqual(findUnconfirmedHolds([hold(["F6", "F7"])], messages), [
    { callId: "h1", seats: ["F6", "F7"] },
  ]);
});

test("khách tự nêu số ghế => được giữ (luồng đặt vé bình thường không bị ảnh hưởng)", () => {
  const messages = [new HumanMessage("Tôi muốn giữ ghế H7 suất 10:00 ngày mai phim Mai")];
  assert.deepEqual(findUnconfirmedHolds([hold(["H7"])], messages), []);
});

test("trợ lý đề xuất ở lượt trước, khách đã trả lời => được giữ", () => {
  const messages = [
    new HumanMessage("chọn giúp mình 2 ghế đẹp"),
    new AIMessage("Mình gợi ý F6 và F7 (VIP, 88.000đ/ghế). Bạn đồng ý không?"),
    new HumanMessage("ok giữ luôn"),
  ];
  assert.deepEqual(unconfirmedSeats(["F6", "F7"], messages), []);
});

test("đề xuất trong CHÍNH lượt hiện tại (khách chưa kịp trả lời) => vẫn bị chặn", () => {
  const messages = [
    new HumanMessage("chọn giúp mình 2 ghế đẹp"),
    new AIMessage({ content: "Ghế F6, F7 là đẹp nhất.", tool_calls: [{ id: "s", name: "get_available_seats", args: {} }] }),
    new ToolMessage({ content: "{}", tool_call_id: "s", name: "get_available_seats" }),
  ];
  assert.deepEqual(unconfirmedSeats(["F6", "F7"], messages), ["F6", "F7"]);
});

test("chỉ chặn ghế khách chưa chọn: khách nêu H7 nhưng mô hình giữ H7 và H8", () => {
  const messages = [new HumanMessage("giữ ghế H7")];
  assert.deepEqual(findUnconfirmedHolds([hold(["H7", "H8"])], messages), [{ callId: "h1", seats: ["H8"] }]);
});

test("agent node: lời gọi giữ ghế khách chưa chọn bị bỏ, mô hình được hỏi lại và đề xuất ghế", async () => {
  const seen: any[] = [];
  const script = [
    new AIMessage({ content: "", tool_calls: [hold(["F6", "F7"])] }),
    new AIMessage({ content: "Mình gợi ý F6, F7 (VIP). Bạn đồng ý không?" }),
  ];
  const model = { invoke: async (msgs: any[]) => { seen.push(msgs); return script.shift(); } };
  const agent = createAgentNode({ model, backend: {} as any });
  const state: any = {
    messages: [new HumanMessage("chọn cho tôi 2 ghế đẹp nhất")],
    movieId: null, movieTitle: null, showtimeId: null, selectedSeats: [], holdExpiresAt: null, orderId: null, activeWidget: null,
  };

  const update: any = await agent(state, { configurable: { authToken: "good" } });

  assert.equal(seen.length, 2, "mô hình được gọi lại đúng một lần");
  assert.ok(seen[1][0].content.includes("CHỐT CHẶN HỆ THỐNG"), "chỉ dẫn nằm trong system prompt");
  assert.equal(update.messages[0].tool_calls?.length ?? 0, 0, "không còn lời gọi hold_seats");
  assert.deepEqual(update.guardBlocked, [{ seats: ["F6", "F7"] }]);
});

test("agent node: mô hình cố giữ lần nữa => bỏ lời gọi, giữ các tool khác, trả lời dự phòng", async () => {
  const script = [
    new AIMessage({ content: "", tool_calls: [hold(["F6"], "a")] }),
    new AIMessage({ content: "", tool_calls: [hold(["F6"], "b"), { id: "f", name: "get_fnb_items", args: {} }] }),
  ];
  const model = { invoke: async () => script.shift() };
  const agent = createAgentNode({ model, backend: {} as any });
  const state: any = { messages: [new HumanMessage("book 1 vé")], selectedSeats: [] };

  const update: any = await agent(state, {});
  const msg = update.messages[0];
  assert.deepEqual(msg.tool_calls.map((c: any) => c.name), ["get_fnb_items"]);
  assert.ok(String(msg.content).includes("F6"));
  assert.equal(update.guardBlocked.length, 2);
});

test("agent node: tắt chốt chặn (thí nghiệm so sánh) => giữ nguyên lời gọi của mô hình", async () => {
  const call = new AIMessage({ content: "", tool_calls: [hold(["F6"])] });
  const model = { invoke: async () => call };
  const agent = createAgentNode({ model, backend: {} as any, seatChoiceGuard: false });
  const update: any = await agent({ messages: [new HumanMessage("book 1 vé")], selectedSeats: [] } as any, {});
  assert.equal(update.messages[0], call);
  assert.equal(update.guardBlocked, undefined);
});

test("pipeAgentStream báo guard_blocked và KHÔNG báo tool_start cho lời gọi đã bị bỏ", async () => {
  const events: Array<[string, any]> = [];
  async function* stream() {
    yield ["updates", { agent: { messages: [new AIMessage("Mình gợi ý F6")], guardBlocked: [{ seats: ["F6"] }] } }];
  }
  await pipeAgentStream(stream(), (e, d) => events.push([e, d]));
  assert.deepEqual(events.find(([e]) => e === "guard_blocked")?.[1], { tool: "hold_seats", seats: ["F6"] });
  assert.equal(events.some(([e]) => e === "tool_start"), false);
});
