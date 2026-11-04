# Backfill dữ liệu thanh toán & giữ ghế (bản sửa chống bán trùng / IPN idempotent)

Áp dụng **một lần** cho mọi database đã có dữ liệu từ trước bản sửa (thêm `showtime_seats.order_code`,
`orders.paid_txn_ref`, `payment_transactions.settled_at`, trạng thái `REFUND_PENDING`, job bảo trì định kỳ).

> **Vì sao bắt buộc:** job đối soát xử lý giao dịch `SUCCESS` có `settled_at IS NULL`. Dữ liệu cũ chưa
> có `settled_at`/`paid_txn_ref`. Code đã có lớp an toàn (đơn PAID mà `paid_txn_ref` NULL thì không
> hoàn tiền; chỉ đối soát giao dịch trong 3 ngày gần nhất), nhưng backfill để dữ liệu nhất quán và
> không phụ thuộc vào lớp an toàn đó.

## Thứ tự triển khai

1. Tạm tắt job bảo trì: đặt `MAINTENANCE_DISABLED=true` cho backend.
2. Deploy bản mới (schema mới được tạo: `synchronize` ở dev, migration ở môi trường khác).
3. Chạy bước **Kiểm tra** bên dưới và xử lý tay các dòng bất thường.
4. Chạy bước **Backfill**.
5. Bỏ `MAINTENANCE_DISABLED`, khởi động lại backend.

## 1. Kiểm tra (chỉ đọc)

```sql
-- Đã thu tiền nhưng đơn KHÔNG ở trạng thái PAID: khách mất tiền mà không có vé (lỗi cũ) – cần hoàn tiền tay
SELECT t.order_id, t.txn_ref, t.amount, t.paid_at, o.status AS order_status
FROM payment_transactions t JOIN orders o ON o.id = t.order_id
WHERE t.payment_status = 'SUCCESS' AND o.status <> 'PAID';

-- Đơn có nhiều hơn một giao dịch SUCCESS: khách trả trùng – cần hoàn tiền tay phần thừa
SELECT order_id, count(*) FROM payment_transactions
WHERE payment_status = 'SUCCESS' GROUP BY order_id HAVING count(*) > 1;

-- Đơn PENDING còn hạn: ghế của chúng chưa gắn order_code => sẽ không chốt được khi thanh toán.
-- Cách an toàn nhất là để chúng hết hạn tự nhiên trước khi deploy (tối đa 10 phút).
SELECT id, order_code, expires_at FROM orders WHERE status = 'PENDING' AND expires_at > now();
```

## 2. Backfill

```sql
BEGIN;

-- Đơn PAID: ghi nhận giao dịch đã chốt đơn (giao dịch SUCCESS mới nhất của đơn)
UPDATE orders o
SET paid_txn_ref = t.txn_ref
FROM (
  SELECT DISTINCT ON (order_id) order_id, txn_ref
  FROM payment_transactions
  WHERE payment_status = 'SUCCESS'
  ORDER BY order_id, paid_at DESC NULLS LAST
) t
WHERE o.id = t.order_id AND o.status = 'PAID' AND o.paid_txn_ref IS NULL;

-- Chốt sổ giao dịch SUCCESS của đơn PAID (các dòng bất thường ở bước 1 KHÔNG bị đụng tới)
UPDATE payment_transactions t
SET settled_at = COALESCE(t.paid_at, t.updated_at)
FROM orders o
WHERE o.id = t.order_id
  AND o.status = 'PAID'
  AND t.payment_status = 'SUCCESS'
  AND t.settled_at IS NULL;

COMMIT;
```

## Sự cố đã gặp khi phát triển (2026-11-05, DB dev)

Bản đầu của job đối soát chạy trên DB dev **trước khi backfill** và coi 12 giao dịch SUCCESS cũ là
"trả trùng" (vì `paid_txn_ref` NULL) rồi chuyển sang `REFUNDED` (cổng hoàn tiền VNPay đang là stub
nên không có tiền thật bị hoàn). Đã sửa code (lớp an toàn ở trên) và khôi phục bằng:

```sql
BEGIN;
UPDATE payments p SET status = 'SUCCESS'
FROM payment_transactions t JOIN orders o ON o.id = t.order_id
WHERE p.gateway_txn_ref = t.txn_ref AND p.status = 'REFUNDED'
  AND t.payment_status = 'REFUNDED' AND o.status = 'PAID' AND o.paid_txn_ref IS NULL;
UPDATE payment_transactions t SET payment_status = 'SUCCESS'
FROM orders o
WHERE o.id = t.order_id AND t.payment_status = 'REFUNDED'
  AND o.status = 'PAID' AND o.paid_txn_ref IS NULL;
COMMIT;
-- rồi chạy bước 2 (Backfill)
```

Bài học: **mọi job tự động động tới tiền phải có backfill dữ liệu cũ và cửa sổ thời gian giới hạn
trước khi bật.**
