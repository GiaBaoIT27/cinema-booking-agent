# Cinema Booking Backend Service

Dịch vụ Backend trung tâm của hệ sinh thái **Cinema Booking Agent**, phụ trách quản lý định danh người dùng (Identity), danh mục phim (Catalog), cụm rạp & lịch chiếu (Cinema Core), bán vé & thanh toán phân tán (Sales & Payments), cùng hệ thống giám sát sức khỏe hạ tầng (Health Observability).

Dự án được xây dựng trên nền tảng **NestJS** kết hợp kiến trúc **Domain-Driven Design (DDD)** và **Clean Architecture**, tối ưu hóa khả năng mở rộng, tính chịu tải và toàn vẹn dữ liệu giao dịch đặt vé.

---

## Tính Năng & Điểm Nhấn Kỹ Thuật

- **Domain-Driven Design (DDD):** Tách bạch 4 tầng rõ rệt: _Domain_ (Pure business logic), _Application_ (Use Cases & Orchestration), _Infrastructure_ (TypeORM, Redis, BullMQ), và _Presentation_ (Controllers, DTOs).
- **Public API & Facade Pattern:** Các module nghiệp vụ giao tiếp liên-module thông qua các `Facade` đóng gói chặt chẽ, triệt tiêu phụ thuộc chéo giữa các Bounded Contexts.
- **Xử lý Đặt Ghế Chống Trùng (Concurrency Control):** Kết hợp **Redlock (Distributed Lock)** và Redis TTL (11 phút) để khóa giữ ghế tạm thời, ngăn chặn triệt để tình trạng hai khách hàng đặt cùng một ghế (Overbooking).
- **Thanh toán & Tính Idempotency (VNPay):**
  - Tích hợp cổng thanh toán VNPay với thuật toán bảo mật chữ ký điện tử **HMAC-SHA512**.
  - Xử lý Webhook IPN chuẩn **Idempotent**: Tự động từ chối xử lý lặp lại nếu đơn hàng đã được xác nhận thanh toán trước đó, đảm bảo an toàn tuyệt đối.
- **Hàng Đợi & Tác Vụ Ngầm (BullMQ & Redis):** Tự động quét dọn đơn hàng quá hạn thanh toán và gửi email thông báo vé điện tử bất đồng bộ qua **Nodemailer**.
- **Bảo Mật & Phân Quyền (RBAC):** Xác thực kép qua **JWT (Access + Refresh Token rotation)**, phân quyền theo vai trò (Admin / Staff / Customer) được bảo vệ bằng Global Guards.
- **Hệ Thống Quan Sát (Observability):** Endpoint `@Public() GET /api/v1/health` theo dõi real-time độ trễ kết nối PostgreSQL (`SELECT 1`), Redis (`PING/PONG`), tài nguyên RAM và thời gian Uptime.
- **Tự Động Hóa Kiểm Thử (Vitest):** Đạt 100% pass rate (32/32 tests) bao phủ toàn bộ Domain Rules, Reservation Logic, Payment Webhook và Health Monitoring.

---

## Cấu Trúc Mã Nguồn

```text
src/
├── app.module.ts              # Root NestJS module nạp configs và 4 aggregators
├── main.ts                    # Bootstrap HTTP server, global filters & pipes
├── common/                    # Guards (JWT, RBAC), decorators (@Public), filters
├── config/                    # Cấu hình tập trung (database, redis, jwt, vnpay...)
│   └── data-source.ts         # TypeORM DataSource độc lập phục vụ CLI Migrations
├── core/                      # Hạ tầng kỹ thuật dùng chung
│   ├── event-bus/             # Domain Event Bus (EventEmitter2)
│   ├── health/                # Health check controller & service (PostgreSQL & Redis)
│   ├── logger/                # Winston structured logger
│   ├── mailer/                # Nodemailer email service
│   ├── queue/                 # BullMQ queues & workers
│   ├── redis/                 # ioredis client & lock manager
│   └── storage/               # Cloudinary media storage
├── database/                  # Seeds & database migrations
└── modules/                   # Các Bounded Contexts nghiệp vụ
    ├── aggregators/           # 4 trục ghép nối: Identity, Catalog, CinemaCore, Sales
    ├── auth/ & users/         # Quản lý tài khoản, mật khẩu, JWT & quyền hạn
    ├── bookings/              # Logic giữ ghế (Redis), sinh mã vé TKT-YYYYMMDD-XXXXXX
    ├── cinemas/ & showtimes/  # Cụm rạp, phòng chiếu, ma trận ghế & lịch chiếu
    ├── movies/ & genres/      # Danh mục phim, vòng đời phim (UPCOMING/SHOWING/ENDED)
    ├── orders/                # Quản lý đơn hàng, tính tiền vé + bắp nước (FnB)
    └── payments/              # Tích hợp VNPay, chữ ký điện tử HMAC-SHA512 & IPN webhook
```

---

## Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Yêu cầu môi trường

- **Node.js:** v20+ hoặc v24+
- **Docker & Docker Compose** (chạy PostgreSQL & Redis)

### 2. Khởi động hạ tầng cơ sở dữ liệu

Tại thư mục gốc dự án:

```bash
docker compose up -d postgres redis
```

### 3. Cài đặt thư viện & cấu hình

Tại thư mục `apps/cinema-backend`:

```bash
npm install
```

Sao chép file môi trường (nếu chưa có):

```bash
cp .env.example .env
```

_Lưu ý: Điền các thông tin bí mật về Database, Redis, JWT Secret, Cloudinary và VNPay Sandbox vào file `.env`._

### 4. Nạp dữ liệu mẫu (Seed Data)

```bash
npm run db:seed
```

### 5. Khởi chạy Server

- Chế độ phát triển (Hot reload):
  ```bash
  npm run start:dev
  ```
- Chế độ Production:
  ```bash
  npm run build
  npm run start:prod
  ```

API mặc định khởi chạy tại: `http://localhost:3000/api/v1`

---

## Kiểm Thử (Automated Testing)

Dự án sử dụng **Vitest** với cấu hình tối ưu, cho tốc độ thực thi kiểm thử nhanh hơn đáng kể so với Jest:

| Lệnh                 | Mô tả                                                               |
| :------------------- | :------------------------------------------------------------------ |
| `npm run test`       | Chạy toàn bộ 32 unit test cases                                     |
| `npm run test:cov`   | Chạy kiểm thử và xuất bảng thống kê độ bao phủ mã (Coverage report) |
| `npm run test:watch` | Chạy kiểm thử ở chế độ theo dõi file thay đổi (Watch mode)          |

### Kết quả kiểm thử mẫu:

```text
 ✓ src/modules/bookings/domain/rules/booking-rules.spec.ts (7 tests)
 ✓ src/modules/payments/infrastructure/gateways/vnpay/vnpay-signature.util.spec.ts (6 tests)
 ✓ src/modules/movies/domain/services/movie-status.rules.spec.ts (4 tests)
 ✓ src/modules/bookings/application/services/seat-reservations.service.spec.ts (6 tests)
 ✓ src/core/health/health.service.spec.ts (3 tests)
 ✓ src/modules/payments/application/services/payments.service.spec.ts (6 tests)

 Test Files  6 passed (6)
      Tests  32 passed (32)
   Duration  ~3.4s
```

---

## Quản Lý Schema & TypeORM Migration

Dự án hỗ trợ cả 2 chế độ:

1. **Development:** `synchronize: true` (tự động cập nhật bảng trong DB khi code thay đổi).
2. **Production / Staging:** Quản lý an toàn bằng Migration script:
   ```bash
   # Chạy các file migration chưa được apply
   npm run migration:run

   # Hoàn tác migration gần nhất nếu cần thiết
   npm run migration:revert
   ```

---

## Endpoint Sức Khỏe Hệ Thống (Health Check)

- **URL:** `GET /api/v1/health`
- **Quyền hạn:** `@Public()` (Không yêu cầu JWT token)
- **Cấu trúc phản hồi mẫu:**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-27T02:10:00.000Z",
    "uptimeSeconds": 3600,
    "services": {
      "database": { "status": "up", "latencyMs": 2 },
      "redis": { "status": "up", "latencyMs": 1 }
    },
    "memory": {
      "rssMb": 95.4,
      "heapUsedMb": 52.1,
      "heapTotalMb": 64.8
    }
  }
  ```
