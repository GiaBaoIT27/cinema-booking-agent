export type SendEvent = (event: string, data: unknown) => void;

const FALLBACK_TEXT = "Xin lỗi, mình chưa có câu trả lời phù hợp. Bạn có thể nói rõ hơn được không?";

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (p && typeof p === "object" && (p as any).type === "text" ? String((p as any).text ?? "") : ""))
      .join("");
  }
  return "";
}

/**
 * Chuyển luồng của graph (streamMode: ["messages","updates"]) thành sự kiện SSE:
 *  token       – từng đoạn chữ thật do mô hình sinh ra
 *  tool_start  – mô hình vừa quyết định gọi công cụ
 *  tool_end    – công cụ chạy xong (ok hay lỗi)
 *  ui_widget   – widget giao diện, gửi ngay khi công cụ cho ra dữ liệu
 */
export async function pipeAgentStream(stream: AsyncIterable<unknown>, send: SendEvent): Promise<{ streamedText: boolean }> {
  let streamedText = false;
  let breakBeforeNextText = false;

  for await (const item of stream) {
    if (!Array.isArray(item) || item.length < 2) continue;
    const [mode, payload] = item as [string, any];

    if (mode === "messages") {
      const [chunk, meta] = payload as [any, any];
      if (meta?.langgraph_node !== "agent") continue;
      const text = textOf(chunk?.content);
      if (!text) continue;
      send("token", { text: breakBeforeNextText && streamedText ? `\n\n${text}` : text });
      breakBeforeNextText = false;
      streamedText = true;
    } else if (mode === "updates") {
      for (const [node, update] of Object.entries(payload ?? {}) as Array<[string, any]>) {
        if (node === "agent") {
          const calls = update?.messages?.[0]?.tool_calls ?? [];
          for (const c of calls) send("tool_start", { name: c.name });
        } else if (node === "tools") {
          for (const m of update?.messages ?? []) {
            let ok = true;
            try {
              ok = JSON.parse(String(m.content)).ok !== false;
            } catch {
              ok = false;
            }
            send("tool_end", { name: m.name, ok });
          }
          if (update?.activeWidget) send("ui_widget", update.activeWidget);
          breakBeforeNextText = true;
        }
      }
    }
  }

  if (!streamedText) send("token", { text: FALLBACK_TEXT });
  return { streamedText };
}
