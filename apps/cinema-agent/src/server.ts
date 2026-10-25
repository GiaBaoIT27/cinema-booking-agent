import "dotenv/config";
import express from "express";
import cors from "cors";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ConfigError, loadConfig } from "./config.js";
import { createBackendClient } from "./lib/backend-client.js";
import { RateLimiter } from "./lib/rate-limit.js";
import { createLangchainTools } from "./tools/cinema-tools.js";
import { createCheckpointer } from "./graph/checkpointer.js";
import { buildAgentGraph } from "./graph/agent-graph.js";
import type { ModelLike } from "./graph/nodes.js";
import { handleChat } from "./chat-handler.js";

async function main() {
  const config = loadConfig(process.env);
  const backend = createBackendClient({
    baseUrl: config.backendApiUrl,
    timeoutMs: config.backendTimeoutMs,
  });

  const llm = new ChatGoogleGenerativeAI({
    model: config.model,
    apiKey: config.googleApiKey,
    temperature: 0.2,
    maxRetries: 2,
  });
  const model = llm.bindTools(createLangchainTools(backend));

  const { checkpointer, kind } = await createCheckpointer(config.databaseUrl);
  const graph = buildAgentGraph({
    model: model as unknown as ModelLike,
    backend,
    checkpointer,
  });
  const limiter = new RateLimiter(config.rateLimitPerMinute);

  const app = express();
  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(express.json({ limit: "32kb" }));

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "cinema-agent-service",
      model: config.model,
      sessionStore: kind,
    });
  });

  app.post("/api/v1/agent/chat/stream", (req, res) => {
    void handleChat(
      {
        config,
        graph: graph as any,
        limiter,
        log: (m, e) => console.error(m, e),
      },
      {
        body: req.body,
        authorization: req.header("authorization"),
        ip: req.ip,
      },
      res as any,
    );
  });

  app.listen(config.port, () => {
    console.log(
      `Cinema AI Agent chạy tại cổng ${config.port} (model ${config.model}, lưu phiên: ${kind})`,
    );
    console.log(
      `SSE: POST http://localhost:${config.port}/api/v1/agent/chat/stream`,
    );
  });
}

main().catch((e) => {
  console.error(e instanceof ConfigError ? `Lỗi cấu hình: ${e.message}` : e);
  process.exit(1);
});
