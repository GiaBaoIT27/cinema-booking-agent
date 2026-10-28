# 04 — Standards: Engineering Standards

Tài liệu này quy định các tiêu chuẩn kỹ thuật, kiến trúc mã nguồn và quy ước làm việc áp dụng cho toàn bộ monorepo **Cinema Booking Agent**.

---

## 🏛️ Ranh Giới Kiến Trúc (Architectural Boundaries)

1. **Domain-Driven Design (DDD) trong Backend:**
   - **Tầng Domain:** Là trung tâm của nghiệp vụ, tuyệt đối độc lập và không phụ thuộc vào framework, ORM (TypeORM) hay hạ tầng ngoài.
   - **Giao tiếp liên-module:** Nghiêm cấm import repository hoặc entity trực tiếp giữa các module khác nhau. Mọi tương tác phải đi qua **Facade Interface** đã được công khai trong module mục tiêu.
   - **ESM NodeNext Imports:** Các file TypeScript trong backend tuân thủ quy chuẩn NodeNext (sử dụng hậu tố `.js` trong đường dẫn import tương đối).

2. **Feature-Driven Architecture trong Frontend:**
   - Nhóm các component, hook, service và type liên quan chặt chẽ theo từng tính năng trong `features/<feature-name>`.
   - Tránh việc đặt toàn bộ component vào thư mục chung `components/` gây khó khăn khi scale ứng dụng.

---

## 🔒 Quy Chuẩn Dữ Liệu & Concurrency

1. **Nhất quán trạng thái ghế (Seat Hold Consistency):**
   - Không tin cậy trạng thái ghế từ phía Client gửi lên. Mọi thao tác giữ ghế đều phải kiểm tra và khóa thông qua **Redlock** trên Redis.
   - Trạng thái đơn hàng trong PostgreSQL và khóa giữ ghế trong Redis phải luôn được đồng bộ hóa vòng đời.
2. **Xác thực dữ liệu (Strict Validation):**
   - Tất cả request body gửi vào API đều phải được định nghĩa bằng DTO kèm các decorator kiểm tra của `class-validator`.
   - Sử dụng `Zod` schema ở cả Frontend Web và Mobile để đảm bảo type-safety từ phía Client trước khi gửi request.

---

## 📝 Quy Ước Commit (Conventional Commits)

Toàn bộ lịch sử commit của dự án tuân theo chuẩn **Conventional Commits**:

| Tiền tố | Mục đích sử dụng | Ví dụ |
| :--- | :--- | :--- |
| `feat:` | Thêm tính năng mới | `feat(backend): add typeorm cli datasource and health check` |
| `fix:` | Sửa lỗi hệ thống | `fix(frontend): resolve react 19 cascading renders` |
| `test:` | Thêm mới hoặc cập nhật unit tests | `test(backend): add vitest test suite covering domain rules` |
| `docs:` | Cập nhật tài liệu hoặc README | `docs(root): rewrite professional portfolio showcase readme` |
| `refactor:` | Tái cấu trúc mã nguồn (không đổi hành vi) | `refactor(mobile): restructure expo router stack navigation` |
| `chore:` | Cập nhật config, dependencies, tooling | `chore(docker): update dockerfile to resilient npm install` |

---

## 🧪 Quy Chuẩn Kiểm Thử (Testing & Quality Control)

1. **Backend Unit Testing (Vitest):**
   - Mọi quy tắc nghiệp vụ trong `domain/rules/` và các service quan trọng (`payments.service.ts`, `seat-reservations.service.ts`) bắt buộc phải có unit test bao phủ.
   - Mục tiêu: 100% test pass trước khi tạo Pull Request vào nhánh `main`.
2. **Frontend Quality Check:**
   - Đảm bảo **0 ESLint errors/warnings** khi chạy `npm run lint`.
   - Đảm bảo **0 TypeScript errors** khi chạy `npx tsc --noEmit`.
