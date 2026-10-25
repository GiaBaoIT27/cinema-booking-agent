export interface CheckpointerHandle {
  checkpointer: unknown;
  kind: "memory" | "postgres";
}

/**
 * Nơi lưu hội thoại theo từng phiên.
 * - Có AGENT_DATABASE_URL: Postgres, còn nguyên sau khi khởi động lại.
 * - Không có: RAM (mất khi tắt server).
 */
export async function createCheckpointer(databaseUrl?: string): Promise<CheckpointerHandle> {
  if (!databaseUrl) {
    const { MemorySaver } = await import("@langchain/langgraph");
    return { checkpointer: new MemorySaver(), kind: "memory" };
  }

  // Tên module nằm trong biến để TypeScript không đòi cài gói khi không dùng Postgres
  const pkg = "@langchain/langgraph-checkpoint-postgres";
  let mod: any;
  try {
    mod = await import(pkg);
  } catch {
    throw new Error(`AGENT_DATABASE_URL đã đặt nhưng chưa cài gói lưu hội thoại. Chạy: npm i ${pkg}`);
  }
  const saver = mod.PostgresSaver.fromConnString(databaseUrl);
  await saver.setup();
  return { checkpointer: saver, kind: "postgres" };
}
