# 07 — Guides: Local Development

Tài liệu hướng dẫn chi tiết quy trình thiết lập môi trường phát triển cục bộ (Local Development) cho toàn bộ 4 ứng dụng trong monorepo **Cinema Booking Agent**.

---

## 💻 Yêu Cầu Môi Trường (Prerequisites)

- **Node.js:** Phiên bản `>= 20.x` (Khuyến nghị Node `22.x` hoặc `24.x`).
- **npm / pnpm:** Quản lý gói thư viện (`npm >= 10.x` hoặc `pnpm >= 9.x`).
- **Docker Desktop:** Phiên bản mới nhất (hỗ trợ Docker Compose v2) để chạy PostgreSQL 16 và Redis 7.
- **Git:** Đã cài đặt và cấu hình SSH / HTTPS GitHub.

---

## 🚀 Lựa Chọn 1: Chạy Siêu Tốc Bằng Docker Compose (Khuyên dùng)

Cách nhanh nhất để kiểm thử toàn bộ hệ thống (PostgreSQL, Redis, RedisInsight, Backend, Agent, Frontend):

```bash
# 1. Khởi chạy toàn bộ stack ngầm
docker compose up -d --build

# 2. Kiểm tra trạng thái các container
docker compose ps
```

**Các cổng dịch vụ đã được cấu hình sẵn:**
- 🌐 Frontend Web: [http://localhost:3001](http://localhost:3001)
- ⚡ Backend REST API: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)
- 🤖 AI Agent Service: [http://localhost:3002/health](http://localhost:3002/health)
- 🔴 RedisInsight (Quản lý Redis & Queue): [http://localhost:5540](http://localhost:5540)

**Khởi tạo dữ liệu mẫu (Seeding):**
```bash
docker compose run --rm backend node -r dotenv/config dist/database/seeds/run-seed.js
```

---

## 🛠️ Lựa Chọn 2: Phát Triển Từng Ứng Dụng Độc Lập (Local Dev)

### Bước 1: Khởi động cơ sở hạ tầng (Database & Redis)
Tại thư mục gốc của dự án:
```bash
docker compose up -d postgres redis
```

### Bước 2: Thiết lập & Khởi động Backend (`apps/cinema-backend`)
```bash
cd apps/cinema-backend

# Tạo file cấu hình môi trường từ mẫu
cp .env.example .env

# Cài đặt dependencies
npm install

# Khởi động chế độ Watch (Dev Mode)
npm run start:dev
```
Backend sẽ khởi động tại `http://localhost:3000`. Endpoint kiểm tra sức khỏe hệ thống: `http://localhost:3000/api/v1/health`.

### Bước 3: Thiết lập & Khởi động Web Portal (`apps/cinema-frontend-v1`)
```bash
cd apps/cinema-frontend-v1

# Tạo file cấu hình môi trường
cp .env.example .env.local

# Cài đặt dependencies
npm install

# Khởi động Next.js App
npm run dev
```
Truy cập giao diện Web tại `http://localhost:3001` (hoặc `http://localhost:3000` tùy theo cấu hình PORT).

### Bước 4: Thiết lập & Khởi động Mobile App (`apps/cinema-mobile`)
```bash
cd apps/cinema-mobile

# Cài đặt dependencies
npm install

# Khởi động Expo Development Server
npx expo start
```
- Nhấn `a` để mở trên Android Emulator.
- Nhấn `i` để mở trên iOS Simulator.
- Hoặc dùng camera điện thoại quét mã QR hiển thị trên terminal để mở qua ứng dụng **Expo Go**.

### Bước 5: Thiết lập & Khởi động AI Agent (`apps/cinema-agent`)
```bash
cd apps/cinema-agent

# Tạo file .env và điền GOOGLE_API_KEY
cp .env.example .env

# Cài đặt dependencies
npm install

# Khởi động server
npm run dev
```
AI Agent chạy tại `http://localhost:3002`.

---

## 🧪 Bảng Lệnh Kiểm Thử & Tiện Ích

| Thư mục | Lệnh | Mô tả chức năng |
| :--- | :--- | :--- |
| `apps/cinema-backend` | `npm run test` | Chạy bộ kiểm thử tự động **Vitest (32/32 tests pass)** |
| `apps/cinema-backend` | `npm run test:cov` | Báo cáo tỷ lệ bao phủ mã nguồn (Code Coverage) |
| `apps/cinema-backend` | `npm run lint` | Quét lỗi cú pháp và quy chuẩn mã nguồn bằng Oxlint |
| `apps/cinema-backend` | `npm run migration:run` | Chạy các file database migration với TypeORM CLI |
| `apps/cinema-frontend-v1` | `npm run lint` | Quét lỗi cú pháp ESLint cho Next.js 16 / React 19 (0 errors) |
| `apps/cinema-frontend-v1` | `npx tsc --noEmit` | Kiểm tra nghiêm ngặt kiểu dữ liệu TypeScript |
| Root | `docker compose down` | Dừng các container (dữ liệu Postgres được giữ nguyên trên volume) |
| Root | `docker compose down -v` | Dừng và **xóa sạch toàn bộ volume** dữ liệu để reset trắng database |
