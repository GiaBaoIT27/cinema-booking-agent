# BÁO CÁO THỰC NGHIỆM ĐÁNH GIÁ AI CINEMA BOOKING AGENT

**Ngày thực nghiệm:** 00:00:24 16/11/2026  
**Mô hình:** gemini-3.5-flash-lite (temperature 0.2)  
**Môi trường:** Node.js v24.12.0  
**Chốt chặn giữ ghế:** bật · đã chặn 7 lời gọi  
**Số kịch bản đã chạy:** 5/100 (lọc: --cases=A04,B03,B07,C02,G06 --repeat=3)  
**Kết quả:** 3 đạt · 2 không đạt · 0 lỗi hạ tầng (không chấm được)  
**Tỷ lệ hoàn thành tác vụ (TCR = đạt / chấm được):** 60.0%  
**Độ trễ trung bình:** 9.23s

> [!WARNING]
> Báo cáo chỉ phản ánh 5/100 kịch bản – không đại diện cho toàn bộ bộ dữ liệu.

---

## 1. Kết quả theo 4 nhóm năng lực

| Nhóm | Số kịch bản | Đạt | Không đạt | Lỗi hạ tầng | TCR | Độ trễ TB |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: |
| **A-booking** | 1 | 0 | 1 | 0 | 0.0% | 5.53s |
| **B-ambiguous** | 2 | 2 | 0 | 0 | 100.0% | 6.13s |
| **C-truth** | 1 | 0 | 1 | 0 | 0.0% | 12.25s |
| **G-stability** | 1 | 1 | 0 | 0 | 100.0% | 16.09s |
| **Tổng** | **5** | **3** | **2** | **0** | **60.0%** | **9.23s** |

---

## 2. Độ chính xác gọi công cụ

TP: tool bắt buộc và đã gọi · FN: bắt buộc nhưng không gọi · FP: gọi tool cấm hoặc tool hành động (giữ ghế, tạo đơn, nhả ghế) khi không được yêu cầu · Gọi thêm: tool tra cứu không bắt buộc (hợp lệ, không tính vào TP/FP). N/A: không đủ dữ liệu để tính.

| Tool | TP | FP | FN | Gọi thêm | Precision | Recall | F1 |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `search_movies` | 1 | 0 | 0 | 4 | 100.0% | 100.0% | 1.000 |
| `get_movie_details` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| `get_showtimes` | 1 | 0 | 0 | 4 | 100.0% | 100.0% | 1.000 |
| `get_available_seats` | 3 | 0 | 0 | 0 | 100.0% | 100.0% | 1.000 |
| `get_fnb_items` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| `get_my_orders` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| `get_order_status` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| `hold_seats` | 0 | 2 | 0 | 0 | 0.0% | N/A | N/A |
| `release_seats` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| `create_order_and_payment` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| **Micro-Average** | 5 | 2 | 0 | 8 | 71.4% | 100.0% | 0.833 |

---

## 3. Phân bố độ trễ

Đo từ lúc gửi tin nhắn tới khi agent kết thúc lượt (gồm suy luận LLM và các lần gọi backend), cộng dồn mọi lượt của kịch bản; chỉ tính kịch bản chấm được.

| Chỉ số | Giá trị |
| :--- | :-: |
| Min | 5.53s |
| P50 (trung vị) | 6.21s |
| P90 | 16.09s |
| P95 | 16.09s |
| Max | 16.09s |
| Trung bình | 9.23s |

---

## 4. Độ nhất quán (kịch bản chạy lặp)

| Kịch bản | Số lần chạy | Số lần đạt | Tỷ lệ |
| :--- | :-: | :-: | :-: |
| A04 | 3 | 0 | 0.0% |
| B03 | 3 | 3 | 100.0% |
| B07 | 3 | 3 | 100.0% |
| C02 | 3 | 0 | 0.0% |
| G06 | 3 | 3 | 100.0% |

Một kịch bản chạy lặp chỉ được tính ĐẠT khi đạt ở mọi lần chạy.

---

## Phân tích lỗi

### [A04] Yêu cầu giữ ghế nhưng chưa đăng nhập (Auth Guard)
- **Nhóm:** `A-booking`
- **Đạt:** 0/3 lần chạy
- **Nguyên nhân:**
  - Lần 1/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
  - Lần 2/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
  - Lần 3/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
- **Phản hồi của agent:**
```text
Bạn cần đăng nhập vào tài khoản để hệ thống có thể giữ ghế cho bạn nhé. Vui lòng đăng nhập và thử lại thao tác giữ ghế H7 suất 10:00 ngày mai (16/11/2026) phim *Mai* tại rạp Cinema Star - Bến Nghé Plaza.
```

### [C02] Cố tình đặt ghế đã có người mua trước đó (Conflict Seat)
- **Nhóm:** `C-truth`
- **Đạt:** 0/3 lần chạy
- **Nguyên nhân:**
  - Lần 1/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
  - Lần 2/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
  - Lần 3/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
- **Phản hồi của agent:**
```text
Ghế H9 suất 10:00 ngày mai (16/11) tại rạp Cinema Star - Bến Nghé Plaza hiện đã có người đặt. 

Bạn có muốn chọn ghế khác ở gần đó (ví dụ H8 hoặc H10) không?
```
