# Cinema Booking Web Frontend

Ứng dụng Web đặt vé xem phim trực tuyến hiện đại của hệ sinh thái **Cinema Booking Agent**, được xây dựng trên nền tảng **Next.js 16 (Turbopack)** kết hợp **React 19**, **Tailwind CSS v4** và kiến trúc **Feature-Driven Architecture**.

Giao diện được thiết kế theo phong cách rạp chiếu phim chuyên nghiệp (Dark Theme), hỗ trợ luồng đặt vé toàn diện từ duyệt phim, chọn rạp, chọn suất chiếu, đặt ghế theo sơ đồ thời gian thực, chọn combo bắp nước đến tích hợp trợ lý AI hội thoại thông minh.

---

## Điểm Nhấn Công Nghệ & Kỹ Thuật

- **Next.js 16 (App Router) & React 19:** Tận dụng Server Components tối ưu SEO, streaming UI, kết hợp Client Components linh hoạt và tuân thủ các tiêu chuẩn nghiêm ngặt mới nhất của React 19.
- **Feature-Driven Architecture:** Mã nguồn được tổ chức theo từng miền nghiệp vụ riêng biệt (`features/booking`, `features/cineplex`, `features/seats`, `features/ai-agent`, `features/movie`...) tăng tính module hóa và dễ bảo trì khi dự án mở rộng.
- **Server State & Caching (TanStack Query v5):** Quản lý trạng thái bất đồng bộ từ API với khả năng tự động cache, revalidate khi đổi ngày chiếu, stale-time 5 phút cho hero banner và showtimes.
- **Client State Management (Zustand):** Quản lý phiên đăng nhập (`useAuthStore`) và luồng đặt vé xuyên suốt các bước (`useBookingStore`) nhẹ nhàng, không gây re-render dư thừa.
- **Bản Đồ Cụm Rạp Tương Tác (React Leaflet):** Tích hợp OpenStreetMap và Leaflet giúp người dùng dễ dàng định vị vị trí các cụm rạp trên bản đồ.
- **Hero Banner Slider Mượt Mà:** Slider chuyển slide tự động có progress bar, điều hướng mũi tên và dots indicator được tối ưu hoàn toàn không cần thư viện carousel cồng kềnh.
- **Hydration-Safe Architecture:** Sử dụng `useSyncExternalStore` (`useMounted` hook) loại bỏ hoàn toàn lỗi Hydration Mismatch và chống cascading re-renders.
- **Khả Năng Chống Lỗi (Fault-Tolerance):** Tích hợp **Global Error Boundary** (`app/error.tsx`) và trang **404 Custom** (`app/not-found.tsx`) đảm bảo trải nghiệm liền mạch, không bao giờ bị trắng trang khi gặp sự cố mạng.

---

## Cấu Trúc Thư Mục Dự Án

```text
apps/cinema-frontend-v1/
├── app/                              # Next.js App Router
│   ├── (customer)/                   # Route group cho khách hàng
│   │   ├── booking/                  # Luồng đặt vé: seat-selection, combo, checkout
│   │   ├── cineplexes/               # Danh sách và chi tiết cụm rạp & bản đồ
│   │   ├── login/ & register/        # Đăng nhập & Đăng ký tài khoản
│   │   ├── movies/                   # Danh sách phim & chi tiết phim (slug)
│   │   └── payment-result/           # Màn hình kết quả thanh toán VNPay
│   ├── error.tsx                     # Global Error Boundary (Bắt lỗi runtime)
│   ├── not-found.tsx                 # Trang 404 phong cách Cinema
│   ├── layout.tsx                    # Root Layout bọc Providers & Fonts
│   └── page.tsx                      # Trang chủ (Hero Banner, Fast Booking, Tabs)
├── components/                       # Shared UI components
│   ├── layout/                       # Header, Footer, Navigation
│   └── ui/                           # Button, Modal, Tabs, Input...
├── features/                         # Feature-Driven Modules
│   ├── ai-agent/                     # Giao diện chat trợ lý AI hội thoại
│   ├── auth/                         # Form đăng ký/đăng nhập (Zod + React Hook Form)
│   ├── booking/                      # Thanh đặt vé nhanh, tóm tắt đơn hàng
│   ├── cineplex/                     # Danh sách lịch chiếu theo rạp, bộ lọc ngày
│   ├── fnb/                          # Danh mục combo bắp nước
│   ├── home/                         # Hero banner slider, khuyến mãi, tin tức
│   ├── movie/                        # Tabs phim đang chiếu / sắp chiếu
│   └── seats/                        # Sơ đồ ghế ngồi phòng chiếu tương tác
├── hooks/                            # Custom hooks tái sử dụng (useMounted, useDebounce...)
├── lib/                              # Axios/Fetch API client cấu hình chung
├── providers/                        # QueryClientProvider, ToastProvider...
├── stores/                           # Global stores dùng Zustand
└── styles/                           # globals.css (Tailwind CSS v4 & theme tokens)
```

---

## Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Yêu cầu môi trường

- **Node.js:** v20+ hoặc v24+
- **Backend Service:** Backend API đã được khởi chạy tại cổng `:3000` (hoặc cấu hình URL tương ứng).

### 2. Cài đặt Dependencies

Tại thư mục `apps/cinema-frontend-v1`:

```bash
npm install
```

### 3. Cấu hình biến môi trường

Tạo file `.env.local` tại thư mục này:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_AGENT_URL=http://localhost:3002
```

### 4. Khởi chạy Server

- **Chế độ phát triển (Development):**

  ```bash
  npm run dev
  ```

  Truy cập ứng dụng tại: `http://localhost:3000` (hoặc cổng hiển thị trên terminal).

- **Đóng gói và chạy Production:**
  ```bash
  npm run build
  npm run start
  ```

---

## 🧪 Kiểm Tra Chất Lượng Mã Nguồn (Code Quality)

Dự án áp dụng quy chuẩn nghiêm ngặt về TypeScript và ESLint:

| Lệnh               | Mục đích                                               | Kết quả mong đợi            |
| :----------------- | :----------------------------------------------------- | :-------------------------- |
| `npm run lint`     | Kiểm tra toàn bộ mã nguồn theo chuẩn ESLint Next.js    | **0 errors, 0 warnings**    |
| `npx tsc --noEmit` | Kiểm tra tĩnh toàn bộ hệ thống kiểu dữ liệu TypeScript | **Exit code 0** (Pass 100%) |

---

## Design Tokens & Dark Theme

Ứng dụng sử dụng bảng màu điện ảnh sang trọng với Tailwind CSS v4:

- **Nền chính (Background):** `#080C15` (Deep Space Dark)
- **Thẻ & Khung (Surface/Card):** `#111827` / `#1F2937`
- **Màu thương hiệu (Brand Accent):** `#EF4444` (Cinema Red)
- **Văn bản (Typography):**
  - Font tiêu đề: `Plus Jakarta Sans`
  - Font nội dung: `Be Vietnam Pro`
