# 📚 Cinema Booking Agent — Technical Documentation Hub

Chào mừng bạn đến với trung tâm tài liệu kỹ thuật toàn diện của dự án **Cinema Booking Agent**. Nơi đây lưu trữ kiến trúc, đặc tả API, mô hình nghiệp vụ và hướng dẫn triển khai hệ thống.

---

## 🗺️ Bản Đồ Tài Liệu Kỹ Thuật (Documentation Map)

| Phân khu | Nội dung quản lý | Tài liệu trọng tâm |
| :--- | :--- | :--- |
| [**01 — Overview**](01-overview/README.md) | Tổng quan hệ sinh thái Monorepo, vai trò các ứng dụng và mục tiêu giải pháp | [Repository Layout & Objectives](01-overview/README.md) |
| [**02 — Architecture**](02-architecture/README.md) | Sơ đồ hệ thống đa tầng, DDD Backend, Redlock Concurrency và HTTP API contracts | [System Map & Data Flow](02-architecture/system-map.md) <br/> [HTTP API Contracts](02-architecture/http-contracts.md) |
| [**03 — Product & Domain**](03-product/README.md) | Mô hình nghiệp vụ rạp chiếu phim: Cụm rạp, Ma trận ghế, Lịch chiếu, Bắp nước, Vé | [Cinema Domain Models](03-product/cinema-domain.md) |
| [**04 — Standards**](04-standards/README.md) | Quy chuẩn mã nguồn, Clean Architecture, Conventional Commits và TypeScript Strict | [Engineering Standards](04-standards/engineering.md) |
| [**05 — Specs**](05-specs/README.md) | Đặc tả hành vi giao diện người dùng và thiết kế UI/UX Design System | [M1 Foundation & Home Spec](05-specs/m1-foundation-home.md) |
| [**06 — Decisions (ADRs)**](06-decisions/README.md) | Hồ sơ ghi nhận các quyết định kiến trúc quan trọng (Architectural Decision Records) | [ADR 0001: Next.js + TypeScript](06-decisions/0001-nextjs-typescript-frontend.md) |
| [**07 — Guides**](07-guides/README.md) | Hướng dẫn phát triển môi trường Local và quy trình đóng góp mã nguồn | [Local Development Guide](07-guides/local-development.md) <br/> [Contributing Guide](07-guides/contributing.md) |
| [**08 — Runbooks**](08-runbooks/README.md) | Quy trình vận hành, xử lý sự cố database/redis và khắc phục môi trường | [Local Setup Recovery](08-runbooks/local-setup-recovery.md) |

---

## ⚡ Bắt Đầu Nhanh

- Để tìm hiểu kiến trúc kỹ thuật của hệ thống: bắt đầu tại [**02 — Architecture: System Map**](02-architecture/system-map.md).
- Để thiết lập môi trường chạy thử nghiệm local: xem [**07 — Guides: Local Development**](07-guides/local-development.md).
- Để kiểm tra tài liệu API: xem [**02 — Architecture: HTTP Contracts**](02-architecture/http-contracts.md) hoặc khởi chạy server và truy cập `/api/v1/health`.
