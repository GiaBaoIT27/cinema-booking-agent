# Deploy backend lên production

Áp dụng cho `apps/cinema-backend` chạy với `NODE_ENV=production`.

## 1. Biến môi trường bắt buộc

Backend **từ chối khởi động** nếu thiếu hoặc dùng giá trị mặc định công khai (kiểm tra trong
`src/config/env.validation.ts`, lỗi liệt kê đầy đủ trong log):

| Biến | Yêu cầu ở production |
| :-- | :-- |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | ≥ 32 ký tự, ngẫu nhiên, khác nhau, không phải `change-me` |
| `VNPAY_HASH_SECRET` | Secret thật từ VNPay, ≥ 32 ký tự. **Không bao giờ** để `DEMO_HASH_SECRET`: ai cũng ký được IPN giả |
| `VNPAY_TMN_CODE` | Mã merchant thật |
| `VNPAY_RETURN_URL`, `VNPAY_IPN_URL` | Bắt buộc `https://` |
| `DB_PASSWORD` | Không phải `cinema_password` |
| `CORS_ORIGINS` | Danh sách origin của web, phân cách bằng dấu phẩy, không có `*` |
| `CLOUDINARY_*` | Bắt buộc ở mọi môi trường |

Tùy chọn:

| Biến | Ý nghĩa |
| :-- | :-- |
| `INTERNAL_SERVICE_TOKEN` | Token để AI agent không bị rate limit theo IP. Agent đặt cùng giá trị vào `BACKEND_INTERNAL_TOKEN`. Nếu đặt thì phải ≥ 32 ký tự |
| `TRUST_PROXY` | Số reverse proxy đứng trước backend (VD `1` khi có nginx). **Bắt buộc đặt đúng** nếu có proxy, nếu không mọi request bị coi là cùng một IP (của proxy) và rate limit chặn tất cả người dùng |
| `THROTTLE_LIMIT_PER_MINUTE` | Giới hạn mặc định mỗi IP mỗi phút (mặc định 120). Login/đăng ký: 10, giữ ghế: 30 |
| `DB_RUN_MIGRATIONS` | Mặc định `true` ở production (tự chạy migration khi khởi động). Đặt `false` nếu pipeline chạy migration riêng |

Tạo secret ngẫu nhiên: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 2. Schema database (migration)

Production **không** dùng `synchronize`. Schema do migration trong `src/database/migrations` quản lý.

### DB mới (trống)

Không cần làm gì: backend tự chạy migration khi khởi động. Hoặc chạy trước bằng tay:

```bash
npm run migration:run
```

### DB đã có schema (tạo bởi `synchronize` từ trước)

Migration `InitialSchema` sẽ lỗi vì bảng đã tồn tại. Đánh dấu nó là "đã chạy" **một lần**:

```bash
npm run migration:check     # phải báo không có thay đổi => schema hiện tại khớp entity
npm run migration:baseline  # ghi InitialSchema vào bảng typeorm_migrations, không chạy SQL
```

Nếu `migration:check` báo có thay đổi: schema đang lệch, xử lý tay trước khi baseline.

Sau đó chạy runbook [Backfill dữ liệu thanh toán & giữ ghế](payment-settlement-backfill.md)
**trước khi** bật job bảo trì.

### Khi sửa entity

```bash
npm run migration:generate -- src/database/migrations/TenThayDoi
npm run migration:check     # CI cũng chạy bước này: entity lệch migration => job đỏ
```

## 3. Checklist trước khi mở cho người dùng

- [ ] Backend khởi động không lỗi env, log có `Migration ... has been executed` (DB mới)
- [ ] `GET /api/v1/health` trả `status: ok`, có header `Strict-Transport-Security`
- [ ] Gọi API từ origin web được phép thành công; origin lạ không có `Access-Control-Allow-Origin`
- [ ] Đặt `TRUST_PROXY` nếu có reverse proxy, kiểm tra rate limit không chặn nhầm người dùng
- [ ] Đã chạy runbook backfill thanh toán (nếu DB có dữ liệu cũ)
- [ ] URL IPN đã đăng ký với VNPay trùng `VNPAY_IPN_URL`

## 4. Giới hạn đã biết

- **Rate limit lưu trong bộ nhớ** của từng instance. Chạy nhiều instance backend thì mỗi instance
  đếm riêng (hạn mức thực tế nhân lên theo số instance) – cần chuyển sang storage Redis dùng chung.
- **Chưa có ràng buộc DB chống trùng lịch chiếu** trong cùng phòng: chỉ kiểm tra ở tầng ứng dụng.
  Dữ liệu seed hiện tạo ra suất chiếu trùng giờ, cần sửa seed trước khi thêm ràng buộc
  `EXCLUDE USING gist` bằng migration.
- **Hoàn tiền VNPay chưa gọi API thật** (`VnPayGateway.refund` là stub): giao dịch `REFUND_PENDING`
  được đánh dấu `REFUNDED` mà tiền chưa thực sự được hoàn – phải tích hợp API hoàn tiền VNPay hoặc
  hoàn tay trước khi nhận tiền thật.
