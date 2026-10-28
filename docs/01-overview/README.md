# 01 — Overview

Tài liệu này cung cấp cái nhìn tổng quan về kiến trúc và cấu trúc các ứng dụng trong monorepo **Cinema Booking Agent**.

---

## 🏛️ Bố Cục Repository (Monorepo Layout)

Hệ thống được tổ chức theo kiến trúc **Turborepo Monorepo** với 4 ứng dụng cốt lõi:

| Thư mục | Ứng dụng | Công nghệ chính | Trạng thái hiện tại |
| :--- | :--- | :--- | :--- |
| [`apps/cinema-backend/`](../../apps/cinema-backend/) | **Core REST API Backend** | NestJS 11, TypeScript, PostgreSQL, TypeORM, Redis, BullMQ | ✅ Đã hoàn thiện: DDD 4 tầng, Redlock, Swagger, Health Check, 32/32 tests pass |
| [`apps/cinema-frontend-v1/`](../../apps/cinema-frontend-v1/) | **Customer Web Portal** | Next.js 16, React 19, Tailwind CSS, TanStack Query v5, Zustand, Leaflet GIS | ✅ Đã hoàn thiện: App Router, Hero Carousel, Sơ đồ ghế, AI Chatbot widget, Error Boundary |
| [`apps/cinema-mobile/`](../../apps/cinema-mobile/) | **Customer Mobile App** | React Native, Expo SDK, Expo Router v3, Expo SecureStore | ✅ Đã hoàn thiện: iOS & Android, Tab navigation, Đặt vé, Vé điện tử QR, AI Chat streaming |
| [`apps/cinema-agent/`](../../apps/cinema-agent/) | **Conversational AI Agent** | LangGraph (Stateful Graph), Express.js, Google Gemini API, SSE | ✅ Đã hoàn thiện: Nhận diện ý định, gọi API Backend nội mạng, streaming Server-Sent Events |
| `packages/` | **Shared Config & Code** | TypeScript configs, shared types | Thư mục mở rộng cho chia sẻ type/configs dùng chung |
| `docs/` | **Tài liệu Kỹ thuật Dự án** | Markdown | Kiến trúc, API contracts, domain model, hướng dẫn cài đặt |
| `.github/` | **GitHub Automation** | GitHub Actions, Issue/PR Templates | Tự động hóa CI/CD pipelines kiểm thử mã nguồn |

---

## 🎯 Mục Tiêu Sản Phẩm & Bài Toán Giải Quyết

1. **Thương mại điện tử & Đặt vé xem phim đa nền tảng:**
   - Trải nghiệm liền mạch giữa Website máy tính và Ứng dụng di động (iOS & Android).
   - Đặt vé trực quan qua sơ đồ ghế thời gian thực, đặt bắp nước (Combo Concessions) và thanh toán trực tuyến qua cổng VNPay.
2. **Xử lý đồng thời cao (High-Concurrency Engineering):**
   - Loại bỏ nguy cơ **Double-Booking** (hai người cùng mua 1 ghế tại một thời điểm) bằng giải thuật **Distributed Lock (Redlock)** trên Redis.
   - Quản lý giữ ghế tạm thời (5 phút) và tự động giải phóng ghế nếu khách hàng hủy thanh toán hoặc quá hạn bằng **BullMQ Delay Queue**.
3. **Ứng dụng Trí tuệ nhân tạo (AI-Native Integration):**
   - Tích hợp Trợ lý ảo AI đàm thoại trực tiếp (không chỉ gợi ý text tĩnh) mà có khả năng **gọi công cụ (Tool Calling)** vào cơ sở dữ liệu thật để tra cứu giờ chiếu và rạp còn vé.

---

> Xem chi tiết:
> - [Sơ đồ kiến trúc toàn hệ thống (`02-architecture/system-map.md`)](../02-architecture/system-map.md)
> - [Đặc tả HTTP API Contracts (`02-architecture/http-contracts.md`)](../02-architecture/http-contracts.md)
> - [Mô hình nghiệp vụ rạp chiếu phim (`03-product/cinema-domain.md`)](../03-product/cinema-domain.md)
