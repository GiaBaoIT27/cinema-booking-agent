import { registerAs } from '@nestjs/config';

export default registerAs('queue', () => ({
  // Tái sử dụng hoặc tách riêng cấu hình kết nối Redis cho Queue
  connection: {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
  },
  // Bạn có thể thêm cấu hình mặc định cho các Job ở đây nếu cần
  defaultJobOptions: {
    removeOnComplete: true, // Tự động xóa dữ liệu job sau khi chạy xong thành công để nhẹ Redis
    removeOnFail: 1000, // Giữ lại tối đa 1000 job lỗi để bạn tiện debug log
    attempts: 3, // Tự động thử lại tối đa 3 lần nếu job bị lỗi
    backoff: {
      type: 'exponential',
      delay: 5000, // Nếu lỗi, đợi 5 giây rồi thử lại (tăng dần theo cấp số nhân)
    },
  },
}));
