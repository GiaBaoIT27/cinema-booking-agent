/** Giữ tối đa `max` tin gần nhất, luôn bắt đầu từ tin của người dùng để không cắt đôi cặp gọi tool/kết quả */
export function windowMessages<T extends { _getType?: () => string; getType?: () => string }>(messages: T[], max: number): T[] {
  if (messages.length <= max) return messages;
  const kindOf = (m: T) => (m.getType ? m.getType() : m._getType ? m._getType() : "");
  let start = messages.length - max;
  while (start < messages.length && kindOf(messages[start]) !== "human") start++;
  // Không có tin người dùng nào trong cửa sổ: giữ tin cuối cùng của người dùng
  if (start >= messages.length) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (kindOf(messages[i]) === "human") return messages.slice(i);
    }
    return messages.slice(-max);
  }
  return messages.slice(start);
}
