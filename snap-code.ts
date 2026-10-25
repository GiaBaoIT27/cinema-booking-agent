export async function createCheckpointer(databaseUrl?: string) {
  if (!databaseUrl) {
    const { MemorySaver } = await import("@langchain/langgraph");
    return { checkpointer: new MemorySaver(), kind: "memory" };
  }
  const mod = await import("@langchain/langgraph-checkpoint-postgres");
  const saver = mod.PostgresSaver.fromConnString(databaseUrl);
  await saver.setup();
  return { checkpointer: saver, kind: "postgres" };
}
