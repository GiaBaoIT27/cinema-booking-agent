/**
 * Chốt chặn "chỉ giữ ghế khách đã chọn" – quy tắc an toàn được thực thi bằng CODE thay vì
 * chỉ dựa vào prompt.
 *
 * Đánh giá 100 kịch bản cho thấy mô hình đôi khi tự chọn và giữ ghế khi khách chỉ nói
 * "chọn giúp tôi ghế đẹp nhất" hay "book 2 vé" (B03, B07, G06): ghế bị khóa 11 phút với mọi
 * khách khác dù khách chưa từng thấy ghế đó. Quy tắc ở đây:
 *
 *   Một ghế được phép giữ khi
 *     (a) khách đã tự nêu số ghế trong một tin nhắn của khách, hoặc
 *     (b) trợ lý đã đề xuất ghế đó ở một lượt TRƯỚC và khách đã trả lời sau đề xuất ấy.
 *
 * (b) bảo đảm khách đã nhìn thấy ghế và có một lượt để đồng ý/từ chối; mô hình chỉ gọi lại
 * hold_seats khi khách đồng ý. Chốt chặn không đoán ngữ nghĩa câu trả lời của khách.
 */

export interface MessageLike {
  content?: unknown;
  getType?: () => string;
  _getType?: () => string;
}

export interface ToolCallLike {
  id?: string;
  name: string;
  args?: unknown;
}

export interface BlockedHold {
  callId?: string;
  seats: string[];
}

const kindOf = (m: MessageLike) =>
  m.getType ? m.getType() : m._getType ? m._getType() : "";

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) =>
        p && typeof p === "object" && (p as { type?: string }).type === "text"
          ? String((p as { text?: unknown }).text ?? "")
          : "",
      )
      .join(" ");
  }
  return "";
}

/** Bỏ dấu tiếng Việt và viết hoa để so khớp "ghế h7" với nhãn "H7". */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "D")
    .toUpperCase();
}

/**
 * Văn bản có nhắc tới ghế `label` không. "H7" khớp "ghế H7", "h 7", "H7,H8" nhưng không khớp
 * "H70" hay "AH7". Ghế đôi "J1-J2" khớp khi văn bản nhắc tới cả J1 và J2 (VD "J1-J2").
 */
export function mentionsSeat(text: string, label: string): boolean {
  const haystack = normalize(text);
  const parts = normalize(label)
    .split("-")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return false;
  return parts.every((part) => {
    const m = /^([A-Z]+)\s*(\d+)$/.exec(part);
    const pattern = m ? `${m[1]}\\s?${m[2]}` : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^A-Z0-9])${pattern}(?![0-9])`).test(haystack);
  });
}

/** Các ghế trong `labels` mà khách CHƯA chọn theo quy tắc (a)/(b) ở đầu file. */
export function unconfirmedSeats(labels: string[], messages: MessageLike[]): string[] {
  let lastHuman = -1;
  messages.forEach((m, i) => {
    if (kindOf(m) === "human") lastHuman = i;
  });

  const customerText = messages
    .filter((m) => kindOf(m) === "human")
    .map((m) => textOf(m.content))
    .join("\n");
  // Đề xuất của trợ lý ở các lượt trước – khách đã có ít nhất một lượt trả lời sau đó
  const proposedBefore = messages
    .slice(0, Math.max(lastHuman, 0))
    .filter((m) => kindOf(m) === "ai")
    .map((m) => textOf(m.content))
    .join("\n");

  return labels.filter(
    (label) => !mentionsSeat(customerText, label) && !mentionsSeat(proposedBefore, label),
  );
}

/** Tách các lời gọi hold_seats giữ ghế khách chưa chọn. */
export function findUnconfirmedHolds(
  toolCalls: ToolCallLike[] | undefined,
  messages: MessageLike[],
): BlockedHold[] {
  const blocked: BlockedHold[] = [];
  for (const call of toolCalls ?? []) {
    if (call.name !== "hold_seats") continue;
    const raw = (call.args as { seatLabels?: unknown } | undefined)?.seatLabels;
    const labels = Array.isArray(raw) ? raw.map(String) : [];
    const seats = unconfirmedSeats(labels, messages);
    if (seats.length > 0) blocked.push({ callId: call.id, seats });
  }
  return blocked;
}

/** Chỉ dẫn bổ sung cho mô hình khi lời gọi giữ ghế bị chặn. */
export function guardInstruction(blocked: BlockedHold[]): string {
  const seats = [...new Set(blocked.flatMap((b) => b.seats))].join(", ");
  return [
    "CHỐT CHẶN HỆ THỐNG – KHÔNG được giữ ghế lúc này.",
    `Khách chưa tự chọn các ghế: ${seats}. Hệ thống chỉ cho giữ ghế mà khách đã nêu số ghế, hoặc ghế bạn đã đề xuất ở lượt trước và khách đã trả lời.`,
    "Hãy giới thiệu các ghế phù hợp (số ghế, loại ghế, giá) dựa trên dữ liệu ghế trống và hỏi khách có đồng ý không. Không nói rằng đã giữ ghế.",
  ].join("\n");
}

/** Câu trả lời dự phòng nếu mô hình vẫn chỉ trả về lời gọi giữ ghế bị chặn. */
export function fallbackProposal(blocked: BlockedHold[]): string {
  const seats = [...new Set(blocked.flatMap((b) => b.seats))].join(", ");
  return `Mình gợi ý ghế ${seats} cho bạn. Bạn có đồng ý để mình giữ các ghế này không, hay muốn chọn ghế khác?`;
}
