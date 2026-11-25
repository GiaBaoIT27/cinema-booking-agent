import { describe, expect, it, vi } from "vitest";

import { streamAgentChat } from "./agent.service";

function sseResponse(text: string): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream" } },
  );
}

describe("streamAgentChat", () => {
  it("gửi kèm action khi khách bấm nút trên thẻ xác nhận đơn", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(sseResponse('event: end\ndata: {"status":"COMPLETED"}\n\n'));

    const events = [];
    for await (const ev of streamAgentChat(
      {
        message: "Xác nhận đặt vé",
        sessionId: "session-1234",
        action: { type: "confirm_order", confirmationId: "abc-12345678" },
      },
      fetchImpl as unknown as typeof fetch,
    )) {
      events.push(ev);
    }

    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toEqual({
      message: "Xác nhận đặt vé",
      sessionId: "session-1234",
      action: { type: "confirm_order", confirmationId: "abc-12345678" },
    });
    expect(events).toEqual([{ event: "end", data: { status: "COMPLETED" } }]);
  });

  it("tin nhắn thường không có trường action", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(sseResponse(""));
    const events = [];
    for await (const ev of streamAgentChat({ message: "Xin chào" }, fetchImpl as unknown as typeof fetch)) {
      events.push(ev);
    }
    expect(events).toEqual([]);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).not.toHaveProperty("action");
  });
});
