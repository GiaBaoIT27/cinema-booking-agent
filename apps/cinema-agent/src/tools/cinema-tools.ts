import { tool } from "@langchain/core/tools";
import type { BackendClient } from "../lib/backend-client.js";
import { runTool, toolDefinitions } from "./definitions.js";

/**
 * Bọc các tool để gắn vào mô hình (bindTools). Việc thực thi thật nằm ở graph/nodes.ts
 * (để cập nhật trạng thái và widget); hàm bên dưới chỉ chạy khi có ai gọi tool trực tiếp.
 */
export function createLangchainTools(backend: BackendClient) {
  return toolDefinitions.map((def) =>
    tool(
      async (
        input: unknown,
        config?: {
          configurable?: { authToken?: string };
          signal?: AbortSignal;
        },
      ) => {
        const result = await runTool(def.name, input, {
          backend,
          token: config?.configurable?.authToken,
          signal: config?.signal,
        });
        return JSON.stringify(result);
      },
      {
        name: def.name,
        description: def.description,
        schema: def.schema as any,
      },
    ),
  );
}
