/**
 * Không để một lỗi bất đồng bộ không được bắt làm sập cả agent service.
 *
 * Thư viện @google/generative-ai chia luồng phản hồi của Gemini thành hai nhánh; khi Gemini
 * trả về luồng hỏng ("Failed to parse stream"), nhánh không được đọc ném lỗi mà không ai bắt.
 * Mặc định Node.js tắt tiến trình khi có unhandled rejection => mọi cuộc chat đang chạy của
 * các khách khác bị ngắt. Request gặp lỗi vẫn nhận lỗi qua nhánh còn lại (chat-handler trả
 * sự kiện "error"), nên ở đây chỉ cần ghi log và giữ tiến trình chạy tiếp.
 */
export function installProcessGuard(log: (msg: string, err?: unknown) => void = console.error): void {
  process.on("unhandledRejection", (reason) => {
    log("[process] Unhandled rejection (đã chặn, service tiếp tục chạy):", reason);
  });
}
