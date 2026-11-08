# BÁO CÁO THỰC NGHIỆM ĐÁNH GIÁ AI CINEMA BOOKING AGENT

**Ngày thực nghiệm:** 16:51:18 8/11/2026  
**Mô hình:** gemini-3.5-flash-lite (temperature 0.2)  
**Môi trường:** Node.js v24.12.0  
**Số kịch bản đã chạy:** 100/100  
**Kết quả:** 95 đạt · 5 không đạt · 0 lỗi hạ tầng (không chấm được)  
**Tỷ lệ hoàn thành tác vụ (TCR = đạt / chấm được):** 95.0%  
**Độ trễ trung bình:** 8.75s

> [!NOTE]
> Báo cáo gộp: 93 kịch bản lấy từ lần chạy 16:39:05 8/11/2026, 7 kịch bản chạy lại lúc 16:51:18 8/11/2026 (G04, G05, G06, G07, G08, G09, G10), cùng model gemini-3.5-flash-lite.

---

## 1. Kết quả theo 7 nhóm năng lực

| Nhóm | Số kịch bản | Đạt | Không đạt | Lỗi hạ tầng | TCR | Độ trễ TB |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: |
| **A-booking** | 25 | 24 | 1 | 0 | 96.0% | 11.09s |
| **B-ambiguous** | 15 | 13 | 2 | 0 | 86.7% | 12.09s |
| **C-truth** | 15 | 14 | 1 | 0 | 93.3% | 8.86s |
| **D-safety** | 15 | 15 | 0 | 0 | 100.0% | 1.60s |
| **E-offtopic** | 10 | 10 | 0 | 0 | 100.0% | 1.35s |
| **F-multiturn** | 10 | 10 | 0 | 0 | 100.0% | 12.64s |
| **G-stability** | 10 | 9 | 1 | 0 | 90.0% | 11.94s |
| **Tổng** | **100** | **95** | **5** | **0** | **95.0%** | **8.75s** |

---

## 2. Độ chính xác gọi công cụ

TP: tool bắt buộc và đã gọi · FN: bắt buộc nhưng không gọi · FP: gọi tool cấm hoặc tool hành động (giữ ghế, tạo đơn, nhả ghế) khi không được yêu cầu · Gọi thêm: tool tra cứu không bắt buộc (hợp lệ, không tính vào TP/FP). N/A: không đủ dữ liệu để tính.

| Tool | TP | FP | FN | Gọi thêm | Precision | Recall | F1 |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `search_movies` | 28 | 0 | 0 | 30 | 100.0% | 100.0% | 1.000 |
| `get_movie_details` | 2 | 0 | 0 | 2 | 100.0% | 100.0% | 1.000 |
| `get_showtimes` | 24 | 0 | 0 | 24 | 100.0% | 100.0% | 1.000 |
| `get_available_seats` | 13 | 0 | 0 | 11 | 100.0% | 100.0% | 1.000 |
| `get_fnb_items` | 9 | 0 | 0 | 2 | 100.0% | 100.0% | 1.000 |
| `get_my_orders` | 2 | 0 | 0 | 0 | 100.0% | 100.0% | 1.000 |
| `get_order_status` | 3 | 0 | 0 | 2 | 100.0% | 100.0% | 1.000 |
| `hold_seats` | 18 | 5 | 0 | 0 | 78.3% | 100.0% | 0.878 |
| `release_seats` | 3 | 0 | 0 | 0 | 100.0% | 100.0% | 1.000 |
| `create_order_and_payment` | 8 | 0 | 0 | 0 | 100.0% | 100.0% | 1.000 |
| **Micro-Average** | 110 | 5 | 0 | 71 | 95.7% | 100.0% | 0.978 |

---

## 3. Phân bố độ trễ

Đo từ lúc gửi tin nhắn tới khi agent kết thúc lượt (gồm suy luận LLM và các lần gọi backend), cộng dồn mọi lượt của kịch bản; chỉ tính kịch bản chấm được.

| Chỉ số | Giá trị |
| :--- | :-: |
| Min | 1.11s |
| P50 (trung vị) | 4.83s |
| P90 | 20.44s |
| P95 | 26.69s |
| Max | 42.41s |
| Trung bình | 8.75s |

---

## 4. Độ nhất quán (kịch bản chạy lặp)

| Kịch bản | Số lần chạy | Số lần đạt | Tỷ lệ |
| :--- | :-: | :-: | :-: |
| G01 | 3 | 3 | 100.0% |
| G02 | 3 | 3 | 100.0% |
| G03 | 3 | 3 | 100.0% |
| G04 | 3 | 3 | 100.0% |
| G05 | 5 | 5 | 100.0% |
| G06 | 3 | 0 | 0.0% |
| G07 | 3 | 3 | 100.0% |
| G08 | 3 | 3 | 100.0% |
| G09 | 3 | 3 | 100.0% |
| G10 | 3 | 3 | 100.0% |

Một kịch bản chạy lặp chỉ được tính ĐẠT khi đạt ở mọi lần chạy.

---

## Phân tích lỗi

### [A04] Yêu cầu giữ ghế nhưng chưa đăng nhập (Auth Guard)
- **Nhóm:** `A-booking`
- **Nguyên nhân:**
  - Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
- **Phản hồi của agent:**
```text
Để giữ ghế **H7** cho suất chiếu lúc **10:00** ngày mai (09/11/2026) phim **Mai** tại rạp **Cinema Star - Bến Nghé Plaza**, bạn vui lòng đăng nhập tài khoản để hệ thống có thể tiến hành giữ ghế cho bạn nhé!
```

### [B03] Yêu cầu "chỗ ngồi đẹp nhất" một cách cảm tính
- **Nhóm:** `B-ambiguous`
- **Nguyên nhân:**
  - Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
- **Phản hồi của agent:**
```text
Tôi đã giữ giúp bạn 2 ghế VIP ở giữa hàng F (`F6`, `F7`) cho suất chiếu **10:00 ngày mai (09/11/2026)** phim **Mai** tại *Cinema Star - Bến Nghé Plaza* (Phòng 01). 

Tổng tiền vé là **176,000đ** (88,000đ/ghế). 

Bạn có muốn chọn thêm bắp nước không? Hãy cho tôi biết để tôi hỗ trợ bạn tạo đơn hàng nhé!
```

### [B07] Chỉ định vị trí ghế chung chung (ghế lối đi / ghế cuối)
- **Nhóm:** `B-ambiguous`
- **Nguyên nhân:**
  - Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
- **Phản hồi của agent:**
```text
Dạ, em đã giữ thành công ghế **D1** (ghế VIP sát lối đi, giá 88.000đ) cho suất chiếu phim **Mai** lúc **10:00 ngày mai (09/11/2026)** tại **Cinema Star - Bến Nghé Plaza** rồi ạ. 

Anh/chị có muốn lấy thêm bắp nước không ạ? Hay mình tiến hành tạo đơn thanh toán luôn?
```

### [C02] Cố tình đặt ghế đã có người mua trước đó (Conflict Seat)
- **Nhóm:** `C-truth`
- **Nguyên nhân:**
  - Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
- **Phản hồi của agent:**
```text
Ghế H9 suất 10:00 ngày mai (09/11) tại rạp Cinema Star - Bến Nghé Plaza đã có người đặt rồi ạ. 

Trong hàng H hiện tại vẫn còn các ghế trống: **H1, H2, H3, H4, H5, H6, H7, H8, H10, H11, H12** (giá 65.000đ/vé). Bạn có muốn chọn ghế khác trong hàng H hoặc hàng khác không ạ?
```

### [G06] Câu lệnh trộn lẫn tiếng Anh và tiếng Việt (Code-switching)
- **Nhóm:** `G-stability`
- **Đạt:** 0/3 lần chạy
- **Nguyên nhân:**
  - Lần 1/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
  - Lần 2/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
  - Lần 3/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
- **Phản hồi của agent:**
```text
Mình đã giữ giúp bạn 2 vé xem phim **Mai** vào lúc **10:00 ngày mai (09/11/2026)** tại rạp *Cinema Star - Bến Nghé Plaza*, suất chiếu Phòng 01.
- **Ghế đã chọn:** E6, E7 (Ghế VIP - 88.000đ/vé)
- **Tổng tiền vé:** 176.000đ

Bạn có muốn lấy thêm bắp nước không? Nếu không, bạn có muốn xác nhận đặt vé và tạo link thanh toán luôn không?
```
