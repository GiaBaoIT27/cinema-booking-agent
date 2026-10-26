/**
 * Địa chỉ cinema-agent. Trên điện thoại KHÔNG dùng localhost: dùng IP LAN của máy chạy agent.
 * Ví dụ EXPO_PUBLIC_AGENT_URL=http://192.168.1.23:3002 (đổi xong chạy `npx expo start -c`).
 */
export const AGENT_URL = (
  process.env.EXPO_PUBLIC_AGENT_URL ?? "http://localhost:3002"
).replace(/\/$/, "");
