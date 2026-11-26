import { test } from "node:test";
import assert from "node:assert/strict";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { RunnableLambda } from "@langchain/core/runnables";

import { withModelFallback } from "../src/lib/model-fallback.js";
import { loadConfig } from "../src/config.js";
import { createAgentNode } from "../src/graph/nodes.js";
import { createBackendClient } from "../src/lib/backend-client.js";

const base = { GOOGLE_API_KEY: "k", BACKEND_API_URL: "http://b/api/v1" };

test("config: đọc GEMINI_FALLBACK_MODEL; bỏ qua nếu trống hoặc trùng model chính", () => {
  assert.equal(
    loadConfig({ ...base, GEMINI_MODEL: "gemini-3.5-flash-lite", GEMINI_FALLBACK_MODEL: "gemini-3.1-flash-lite" }).fallbackModel,
    "gemini-3.1-flash-lite",
  );
  assert.equal(loadConfig({ ...base, GEMINI_MODEL: "gemini-3.5-flash-lite" }).fallbackModel, undefined);
  assert.equal(
    loadConfig({ ...base, GEMINI_MODEL: "gemini-3.5-flash-lite", GEMINI_FALLBACK_MODEL: "gemini-3.5-flash-lite" }).fallbackModel,
    undefined,
  );
});

const failing = (message: string) =>
  RunnableLambda.from(async (): Promise<AIMessage> => {
    throw new Error(message);
  });
const answering = (text: string) => RunnableLambda.from(async () => new AIMessage(text));

test("model chính lỗi (quota 429 / luồng hỏng) => dùng model dự phòng", async () => {
  for (const err of ["[429 Too Many Requests] quota exceeded", "[GoogleGenerativeAI Error]: Failed to parse stream"]) {
    const model = withModelFallback<unknown, AIMessage>(failing(err), answering("Trả lời từ model dự phòng"));
    const out = await model.invoke([new HumanMessage("Xin chào")]);
    assert.equal(out.content, "Trả lời từ model dự phòng");
  }
});

test("model chính chạy bình thường => không gọi model dự phòng", async () => {
  let fallbackCalls = 0;
  const fallback = RunnableLambda.from(async () => {
    fallbackCalls += 1;
    return new AIMessage("dự phòng");
  });
  const out = await withModelFallback<unknown, AIMessage>(answering("chính"), fallback).invoke([]);
  assert.equal(out.content, "chính");
  assert.equal(fallbackCalls, 0);
});

test("không cấu hình dự phòng => lỗi của model chính được báo như cũ", async () => {
  await assert.rejects(withModelFallback<unknown, AIMessage>(failing("503 Service Unavailable")).invoke([]), /503/);
});

test("agent node dùng model có dự phòng: model chính sập thì khách vẫn nhận câu trả lời", async () => {
  const model = withModelFallback<unknown, AIMessage>(failing("Failed to parse stream"), answering("Phim Mai có suất 19:30."));
  const agent = createAgentNode({ model: model as any, backend: createBackendClient({ baseUrl: "http://127.0.0.1:1" }) });
  const state: any = {
    messages: [new HumanMessage("Phim Mai tối nay?")],
    movieId: null,
    movieTitle: null,
    showtimeId: null,
    selectedSeats: [],
    holdExpiresAt: null,
    orderId: null,
    activeWidget: null,
  };
  const update: any = await agent(state, {});
  assert.equal(update.messages[0].content, "Phim Mai có suất 19:30.");
});
