export interface CheckpointerHandle {
  checkpointer: unknown;
  kind: "memory" | "postgres";
}

/** Schema riêng cho bảng hội thoại – không lẫn với bảng nghiệp vụ của backend (schema public). */
export const DEFAULT_CHECKPOINT_SCHEMA = "agent_memory";

/**
 * Nơi lưu hội thoại theo từng phiên (thread_id).
 * - Có AGENT_DATABASE_URL: Postgres (schema `agent_memory`), còn nguyên sau khi khởi động lại
 *   và dùng chung được giữa nhiều instance agent.
 * - Không có: RAM (mất khi tắt server) – dùng cho test.
 */
export async function createCheckpointer(
  databaseUrl?: string,
  schema: string = DEFAULT_CHECKPOINT_SCHEMA,
): Promise<CheckpointerHandle> {
  if (!databaseUrl) {
    const { MemorySaver } = await import("@langchain/langgraph");
    return { checkpointer: new MemorySaver(), kind: "memory" };
  }

  // Import động: chỉ nạp driver Postgres khi thực sự dùng
  const { PostgresSaver } = await import("@langchain/langgraph-checkpoint-postgres");
  const saver = PostgresSaver.fromConnString(databaseUrl, { schema });
  // Tạo schema + bảng nếu chưa có (lũy đẳng)
  await saver.setup();
  return { checkpointer: saver, kind: "postgres" };
}
