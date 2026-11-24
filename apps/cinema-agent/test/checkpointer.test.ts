import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { AIMessage, HumanMessage } from "@langchain/core/messages";

import { createCheckpointer } from "../src/graph/checkpointer.js";
import { buildAgentGraph } from "../src/graph/agent-graph.js";
import { createBackendClient } from "../src/lib/backend-client.js";

test("không có AGENT_DATABASE_URL => lưu hội thoại trong RAM", async () => {
  const { kind } = await createCheckpointer(undefined);
  assert.equal(kind, "memory");
});

// Chạy khi có Postgres (VD: AGENT_TEST_DATABASE_URL=postgres://cinema_admin:cinema_password@localhost:5433/cinema_db)
const DB_URL = process.env.AGENT_TEST_DATABASE_URL;

test(
  "Postgres: hội thoại còn nguyên khi tạo checkpointer mới (tương đương khởi động lại agent)",
  { skip: DB_URL ? false : "chưa đặt AGENT_TEST_DATABASE_URL" },
  async () => {
    const schema = `agent_memory_test_${Date.now()}`;
    const model = { invoke: async () => new AIMessage({ content: "Chào bạn, mình giúp gì được?" }) };
    const backend = createBackendClient({ baseUrl: "http://127.0.0.1:1" });
    const threadId = randomUUID();
    const config = { configurable: { thread_id: threadId } };

    // "Lần chạy 1": ghi hội thoại
    const first = await createCheckpointer(DB_URL, schema);
    assert.equal(first.kind, "postgres");
    const graph1 = buildAgentGraph({ model: model as any, backend, checkpointer: first.checkpointer });
    await graph1.invoke({ messages: [new HumanMessage("Xin chào")] }, config);

    // "Lần chạy 2": checkpointer mới, đọc lại đúng thread
    const second = await createCheckpointer(DB_URL, schema);
    const graph2 = buildAgentGraph({ model: model as any, backend, checkpointer: second.checkpointer });
    const state = await graph2.getState(config);
    const texts = (state.values.messages as Array<{ content: unknown }>).map((m) => m.content);
    assert.deepEqual(texts, ["Xin chào", "Chào bạn, mình giúp gì được?"]);

    // Dọn schema test (dùng kết nối của checkpointer, không phụ thuộc trực tiếp vào pg)
    const pool = (second.checkpointer as any).pool;
    await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await (first.checkpointer as any).end();
    await (second.checkpointer as any).end();
  },
);
