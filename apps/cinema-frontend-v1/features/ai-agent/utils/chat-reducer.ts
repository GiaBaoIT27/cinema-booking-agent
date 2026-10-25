import type { AgentEvent, ChatMessage } from "../types/agent.type";

const TOOL_LABELS: Record<string, string> = {
  search_movies: "Đang tìm phim...",
  get_movie_details: "Đang xem thông tin phim...",
  get_showtimes: "Đang tra lịch chiếu...",
  get_available_seats: "Đang xem ghế trống...",
  get_fnb_items: "Đang lấy danh sách bắp nước...",
  hold_seats: "Đang giữ ghế...",
  release_seats: "Đang trả ghế...",
  create_order_and_payment: "Đang tạo đơn và link thanh toán...",
  get_my_orders: "Đang xem đơn hàng của bạn...",
  get_order_status: "Đang kiểm tra đơn hàng...",
};

export const toolLabel = (name: string) => TOOL_LABELS[name] ?? "Đang xử lý...";

export const nowLabel = () => new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

export function newUserMessage(text: string, id: string): ChatMessage {
  return { id, sender: "user", text, timestamp: nowLabel(), widgets: [], status: null, error: null };
}

export function newAgentMessage(id: string): ChatMessage {
  return { id, sender: "agent", text: "", timestamp: nowLabel(), widgets: [], status: "Đang suy nghĩ...", error: null };
}

/** Áp một sự kiện của agent lên tin nhắn đang được trả lời */
export function applyAgentEvent(messages: ChatMessage[], agentId: string, ev: AgentEvent): ChatMessage[] {
  const patch = (fn: (m: ChatMessage) => ChatMessage) => messages.map((m) => (m.id === agentId ? fn(m) : m));

  switch (ev.event) {
    case "token":
      return patch((m) => ({ ...m, text: m.text + ev.data.text, status: null }));
    case "tool_start":
      return patch((m) => ({ ...m, status: toolLabel(ev.data.name) }));
    case "tool_end":
      return patch((m) => ({ ...m, status: "Đang soạn câu trả lời..." }));
    case "ui_widget":
      return patch((m) => ({ ...m, widgets: [...m.widgets, ev.data] }));
    case "error":
      return patch((m) => ({ ...m, error: ev.data.message, status: null }));
    case "end":
      return patch((m) => ({ ...m, status: null }));
    default:
      return messages;
  }
}

/** Chỉ cho phép chuyển hướng tới http/https (chặn javascript:, data:...) */
export function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
