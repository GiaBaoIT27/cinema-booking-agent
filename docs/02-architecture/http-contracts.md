# 02 — Architecture: HTTP Contracts & Endpoints

Tài liệu này đặc tả quy chuẩn giao tiếp HTTP RESTful API giữa Backend (NestJS) và các Client (Web Next.js, Mobile Expo, AI Agent).

---

## 🌐 Quy Chuẩn Chung (Global Conventions)

- **Địa chỉ Base URL:** `http://localhost:3000/api/v1` (Prefix cố định: `/api/v1`).
- **Header bắt buộc:** `Accept: application/json` và `Content-Type: application/json`.
- **CORS:** Đã kích hoạt cho toàn bộ các Client nguồn (`allow_origins: *`).
- **Bảo mật:** JWT Bearer Token tại header `Authorization: Bearer <access_token>`. Các endpoint công khai được đánh dấu bằng `@Public()`.
- **Validation DTO:** Sử dụng `ValidationPipe` với `whitelist: true`, `transform: true`. Nếu dữ liệu không hợp lệ, trả về mã **422 Unprocessable Entity**.

---

## 📦 Định Dạng Phản Hồi Chuẩn (Standard Response Envelopes)

### 1. Phản hồi thành công (`TransformInterceptor`)
```json
{
  "success": true,
  "code": 200,
  "message": "Thao tác thành công",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  },
  "meta": {
    "timestamp": "2026-10-28T16:00:00.000Z",
    "requestId": "req-98f2b71a",
    "path": "/api/v1/movies"
  }
}
```

### 2. Phản hồi lỗi chuẩn (`Rfc7807ExceptionFilter`)
```json
{
  "success": false,
  "code": 409,
  "errorCode": "SEAT_ALREADY_RESERVED",
  "message": "Ghế E10 đã có người khác chọn",
  "errors": [
    {
      "field": "seatId",
      "message": "Ghế này hiện đang trong thời gian giữ vé của người khác"
    }
  ],
  "meta": {
    "timestamp": "2026-10-28T16:00:00.000Z",
    "requestId": "req-98f2b71a",
    "path": "/api/v1/bookings/hold"
  }
}
```

---

## 📋 Danh Mục Endpoint Cốt Lõi (Core REST Endpoints)

### 1. System & Health Check
| Phương thức | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | `@Public()` | Kiểm tra trạng thái kết nối PostgreSQL (`SELECT 1`), Redis (`PING`), và thông số bộ nhớ RAM |

### 2. Identity & Authentication (`/api/v1/auth`)
| Phương thức | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | `@Public()` | Đăng ký tài khoản khách hàng mới |
| `POST` | `/api/v1/auth/login` | `@Public()` | Đăng nhập bằng Email/Password, trả về Access Token + Refresh Token |
| `POST` | `/api/v1/auth/refresh` | `@Public()` | Cấp mới Access Token bằng Refresh Token (Token Rotation) |
| `GET` | `/api/v1/auth/profile` | Authenticated | Lấy thông tin tài khoản đang đăng nhập |

### 3. Movie Catalog (`/api/v1/movies`)
| Phương thức | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/movies` | `@Public()` | Danh sách phim có phân trang, lọc theo trạng thái (Đang chiếu / Sắp chiếu) |
| `GET` | `/api/v1/movies/:id` | `@Public()` | Chi tiết phim, trailer, đạo diễn, diễn viên và thể loại |
| `POST` | `/api/v1/movies` | `Role: ADMIN` | Thêm phim mới (hỗ trợ upload poster lên Cloudinary) |

### 4. Cineplex & Showtimes (`/api/v1/cinemas`, `/api/v1/showtimes`)
| Phương thức | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/cinemas` | `@Public()` | Danh sách cụm rạp kèm tọa độ địa lý GIS (vĩ độ, kinh độ) |
| `GET` | `/api/v1/showtimes/movie/:movieId` | `@Public()` | Tra cứu lịch chiếu của phim theo ngày và cụm rạp |
| `GET` | `/api/v1/showtimes/:id/seats` | `@Public()` | Lấy ma trận sơ đồ ghế (Trạng thái: Trống, Đang giữ, Đã bán, Loại ghế: VIP, Standard, Sweetbox) |

### 5. Bookings & Concurrency (`/api/v1/bookings`)
| Phương thức | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/bookings/hold` | Authenticated | **Giữ ghế tạm thời (Redlock):** Khóa ghế trong 5 phút trên Redis để khách hàng thanh toán |
| `POST` | `/api/v1/bookings/release` | Authenticated | Hủy giữ ghế chủ động, hoàn trả ghế vào pool có sẵn |
| `POST` | `/api/v1/bookings/create-order` | Authenticated | Tạo đơn hàng chính thức từ các ghế đã giữ kèm bắp nước (Combo) |

### 6. Payments & VNPay Integration (`/api/v1/payments`)
| Phương thức | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payments/create-url` | Authenticated | Tạo đường dẫn thanh toán chuyển hướng sang cổng VNPay |
| `GET` | `/api/v1/payments/vnpay-return` | `@Public()` | URL tiếp nhận kết quả trả về từ trình duyệt khách hàng |
| `GET` | `/api/v1/payments/vnpay-ipn` | `@Public()` | Webhook ngầm (IPN) từ server VNPay xử lý Idempotency, xác thực chữ ký SHA512 và xuất vé QR |
