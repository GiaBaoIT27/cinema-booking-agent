export interface RawSseEvent {
  event: string;
  data: string;
}

/**
 * Đọc luồng Server-Sent Events (POST + fetch) và trả từng sự kiện.
 * Bỏ qua dòng chú thích (": ping") dùng làm nhịp giữ kết nối.
 */
export async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<RawSseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const toEvent = (frame: string): RawSseEvent | null => {
    let event = "message";
    const data: string[] = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    return data.length > 0 ? { event, data: data.join("\n") } : null;
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const ev = toEvent(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 2);
        if (ev) yield ev;
      }
    }
    buffer += decoder.decode();
    const last = toEvent(buffer.trim() ? buffer : "");
    if (last) yield last;
  } finally {
    reader.releaseLock();
  }
}
