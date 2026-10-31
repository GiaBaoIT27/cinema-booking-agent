# 📱 Cinema Mobile (React Native & Expo)

<p align="center">
  <img src="https://img.shields.io/badge/Platform-iOS%20%7C%20Android-000000?style=for-the-badge&logo=apple&logoColor=white" alt="iOS & Android" />
  <img src="https://img.shields.io/badge/Framework-React%20Native%200.88-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/SDK-Expo%2058-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo SDK 58" />
  <img src="https://img.shields.io/badge/Router-Expo%20Router%20v3-4630EB?style=for-the-badge&logo=expo" alt="Expo Router" />
  <img src="https://img.shields.io/badge/Language-TypeScript%20Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/State-Zustand%205%20%7C%20TanStack%20Query%20v5-FF4154?style=for-the-badge" alt="State Management" />
</p>

---

> **Cinema Mobile** là ứng dụng di động khách hàng đa nền tảng (iOS & Android) thuộc hệ sinh thái monorepo **Cinema Booking Agent**. Ứng dụng cung cấp trải nghiệm đặt vé xem phim trực quan theo thời gian thực, lưu trữ vé điện tử mã QR, tích hợp thanh toán trực tuyến và trò chuyện trực tiếp với Trợ lý ảo AI thông minh qua Server-Sent Events (SSE).

---

## 📸 Hình Ảnh Giao Diện Thực Tế

|                              🏠 Trang Chủ & Lịch Chiếu                              |                            🎟️ Chi Tiết Đặt Vé & Combo                            |                               📱 Vé Điện Tử QR Check-in                               |                               🤖 Trợ Lý Ảo AI Đàm Thoại                               |
| :---------------------------------------------------------------------------------: | :------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------: |
| <img src="../../docs/assets/mobile-home.jpg" alt="Trang chủ Mobile" width="100%" /> | <img src="../../docs/assets/mobile-ticket.jpg" alt="Chi tiết vé" width="100%" /> | <img src="../../docs/assets/mobile-ticket-qr.jpg" alt="Vé điện tử QR" width="100%" /> | <img src="../../docs/assets/mobile-ai-chat.jpg" alt="AI Agent Mobile" width="100%" /> |

---

## 🌟 Điểm Nhấn Kiến Trúc & Tính Năng

### 1. File-based Navigation (Expo Router v3)

- Quản lý điều hướng dạng cây thư mục tương tự Next.js App Router:
  - `(tabs)/`: 5 Tab chính (`index.tsx` - Trang chủ, `movies.tsx` - Danh sách phim, `cineplexes.tsx` - Cụm rạp, `tickets.tsx` - Vé của tôi, `account.tsx` - Tài khoản).
  - Dynamic Routes: `app/movies/[id].tsx`, `app/cineplexes/[id].tsx`, `app/booking/[showtimeId].tsx`.
  - Stack Navigation: `app/agent.tsx` (Màn hình chat AI chuyên biệt), `app/booking/checkout.tsx` (Thanh toán).

### 2. Quản Lý State & Caching Đa Tầng

- **Server State (TanStack Query v5):** Tự động cache danh sách phim, lịch chiếu và trạng thái ghế; hỗ trợ refetch thông minh khi người dùng quay lại app (`refetchOnWindowFocus`).
- **Client State (Zustand v5):** Quản lý giỏ vé (`booking.store`), thông tin phiên đăng nhập (`auth.store`), và lịch sử hội thoại AI (`agent-chat.store`).
- **Hardware Security:** Lưu trữ JWT Access Token và Refresh Token an toàn qua phần cứng mã hóa với `expo-secure-store`.

### 3. Quy Trình Đặt Vé Real-Time Liền Mạch

- **Sơ đồ ma trận ghế (`seat-grid.tsx`):** Trực quan hóa ghế Standard, VIP, Sweetbox; trạng thái trống, đang giữ và đã bán.
- **Giữ ghế tức thời (Distributed Seat Hold):** Kết nối trực tiếp với giải thuật Redlock trên Redis ở backend để giữ ghế 5 phút.
- **Thanh toán:** Mở cổng thanh toán an toàn trong app qua `expo-web-browser` với xử lý callback tự động.
- **Vé điện tử Offline:** Tạo mã QR vé số hóa cục bộ bằng `react-native-qrcode-svg` để nhân viên rạp quét check-in.

### 4. Trợ Lý AI Đàm Thoại Thời Gian Thực

- Kết nối tới `apps/cinema-agent` qua giao thức **Server-Sent Events (SSE)**.
- Gợi ý câu hỏi nhanh (Prompt Suggestions), hiệu ứng bong bóng chat đa năng (Bubble), và chỉ báo gõ chữ động (Typing Indicator).

---

## 🏛️ Cấu Trúc Mã Nguồn (Feature-Driven Modular)

```
apps/cinema-mobile/
├── src/
│   ├── app/                    # 🗺️ Expo Router v3 (Pages & Routes)
│   │   ├── (tabs)/             # Tab navigator (Home, Movies, Cineplexes, Tickets, Account)
│   │   ├── booking/            # Quy trình đặt vé: [showtimeId] -> fnb -> checkout -> result
│   │   ├── movies/             # Chi tiết phim & Trailer player
│   │   ├── cineplexes/         # Chi tiết rạp & Lịch chiếu
│   │   ├── agent.tsx           # Màn hình AI Chatbot Agent
│   │   └── _layout.tsx         # Root layout & providers setup
│   ├── features/               # 🧩 9 Feature Modules độc lập
│   │   ├── ai-agent/           # Components chat, hooks SSE stream, types
│   │   ├── auth/               # Đăng nhập, đăng ký, validate form
│   │   ├── booking/            # Countdown giữ ghế, store giỏ hàng
│   │   ├── cineplex/           # Danh sách rạp, định vị GIS
│   │   ├── fnb/                # Danh mục bắp nước, combo
│   │   ├── home/               # Hero banner slider, phim hot, ưu đãi
│   │   ├── movie/              # Movie cards, chi tiết phim, YouTube trailer
│   │   ├── orders/             # Tra cứu lịch sử đơn hàng & trạng thái thanh toán
│   │   ├── payments/           # Tích hợp WebBrowser thanh toán VNPay
│   │   └── seats/              # Ma trận sơ đồ ghế & tính giá vé
│   ├── lib/                    # ⚙️ Axios instance, Token storage, Query client
│   ├── store/                  # 📦 Global Zustand stores (Auth, Booking, Agent)
│   └── theme/                  # 🎨 Dark mode colors, typography & spacing
└── app.json                    # Cấu hình Expo, icon, splash screen, permissions
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Chuẩn Bị Môi Trường

Đảm bảo đã cài đặt Node.js (`>= 20.x`) và các dependencies:

```bash
cd apps/cinema-mobile
npm install
```

Tạo file `.env` từ `.env.example`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_AGENT_URL=http://localhost:3002
```

_(Lưu ý: Nếu chạy trên máy ảo Android Studio, đổi `localhost` thành `10.0.2.2`)._

---

### 2. Khởi Chạy Ứng Dụng

#### Khởi động Expo Bundler:

```bash
npm start
# hoặc npx expo start
```

- **Trên điện thoại thật (iOS / Android):** Cài app **Expo Go** từ App Store / Google Play và quét mã QR trên màn hình terminal.
- **Trên máy ảo Android:** Nhấn phím **`a`** trên terminal.
- **Trên máy ảo iOS Simulator (macOS):** Nhấn phím **`i`** trên terminal.
- **Trên trình duyệt Web:** Nhấn phím **`w`** trên terminal.

---

## 🧪 Kiểm Tra Chất Lượng Mã Nguồn (Code Quality)

Ứng dụng đáp ứng chuẩn kiểm thử nghiêm ngặt không lỗi:

```bash
# Kiểm tra TypeScript Compile (Strict Mode)
npx tsc --noEmit
# Kết quả: 0 errors (100% Pass)

# Quét lỗi quy chuẩn mã nguồn ESLint
npx eslint "src/**/*.{ts,tsx}"
# Kết quả: 0 errors, 0 warnings
```
