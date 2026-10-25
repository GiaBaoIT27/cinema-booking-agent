/**
 * Địa chỉ backend. Trên điện thoại KHÔNG dùng được localhost của máy tính:
 * đặt EXPO_PUBLIC_API_URL=http://<IP-LAN-của-máy>:3000/api/v1 trong file .env
 * (biến EXPO_PUBLIC_* được nhúng lúc bundle: đổi xong chạy `npx expo start -c`).
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";
