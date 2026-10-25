# Bộ seed & công cụ đánh giá agent

Copy 3 file `eval.seed.ts`, `eval-db.ts`, `eval-cli.ts` vào `database/seeds/` (cạnh `run-seed.ts`).

## Chạy
```
npx tsx database/seeds/eval-cli.ts seed    # tạo 2 khách + 5 suất cố định, ghi eval-fixtures.json
npx tsx database/seeds/eval-cli.ts reset   # xóa đơn/vé/thanh toán/ghế giữ của dữ liệu eval
npx tsx database/seeds/eval-cli.ts state   # in JSON trạng thái ghế và đơn
```
(Dùng đúng lệnh bạn đang dùng để chạy `run-seed.ts`; chỉ đổi tên file.)

## Biến môi trường
- `EVAL_DATE=2026-11-20` cố định ngày chiếu suốt đợt đánh giá (khuyến nghị).
- `EVAL_DAY_OFFSET` mặc định 4 nếu không đặt EVAL_DATE.
- `EVAL_FIXTURES` đường dẫn file fixtures, mặc định `./eval-fixtures.json`.

## Tài khoản
`eval.user1@cinema.com`, `eval.user2@cinema.com`, mật khẩu `Eval123@Password`.

## Lịch suất (cụm Bến Nghé, giờ Việt Nam)
| key | phim | phòng | giờ |
| --- | --- | --- | --- |
| mai-morning | Mai | HALL-01 Standard | 10:00 |
| quatmo-afternoon | Quật Mộ Trùng Phùng | HALL-01 Standard | 14:00 |
| mai-evening | Mai | HALL-01 Standard | 19:30 |
| dune-afternoon | Dune | HALL-02 IMAX | 14:00 |
| dune-evening | Dune | HALL-02 IMAX | 20:00 |

## Chấm theo state DB
- `eval-expect.ts`: `checkState(snapshot, fixtures, expects)` trả danh sách kiểm tra đạt/không đạt (ghế HOLDING đúng user và còn hạn, ghế trống, số đơn/trạng thái/tổng tiền).
- `eval-cases.example.ts`: khung 1 test case và 3 ví dụ.
- `eval-expect.test.ts`: 5 test của bộ chấm (chạy: `npx tsx --test eval-expect.test.ts`).
- Tên tool agent: search_movies, get_movie_details, get_showtimes, get_available_seats, hold_seats, release_seats, get_fnb_items, create_order_and_payment, get_order_status, get_my_orders.
- Trạng thái ghế trong DB là AVAILABLE / HOLDING / BOOKED. Không có hàng = trống.
