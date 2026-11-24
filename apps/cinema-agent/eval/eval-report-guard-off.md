# BÁO CÁO THỰC NGHIỆM ĐÁNH GIÁ AI CINEMA BOOKING AGENT

**Ngày thực nghiệm:** 23:54:34 15/11/2026  
**Mô hình:** gemini-3.5-flash-lite (temperature 0.2)  
**Môi trường:** Node.js v24.12.0  
**Chốt chặn giữ ghế:** tắt · đã chặn 0 lời gọi  
**Số kịch bản đã chạy:** 5/100 (lọc: --cases=A04,B03,B07,C02,G06 --repeat=3)  
**Kết quả:** 0 đạt · 5 không đạt · 0 lỗi hạ tầng (không chấm được)  
**Tỷ lệ hoàn thành tác vụ (TCR = đạt / chấm được):** 0.0%  
**Độ trễ trung bình:** 5.86s

> [!WARNING]
> Báo cáo chỉ phản ánh 5/100 kịch bản – không đại diện cho toàn bộ bộ dữ liệu.

---

## 1. Kết quả theo 4 nhóm năng lực

| Nhóm | Số kịch bản | Đạt | Không đạt | Lỗi hạ tầng | TCR | Độ trễ TB |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: |
| **A-booking** | 1 | 0 | 1 | 0 | 0.0% | 5.31s |
| **B-ambiguous** | 2 | 0 | 2 | 0 | 0.0% | 6.08s |
| **C-truth** | 1 | 0 | 1 | 0 | 0.0% | 6.20s |
| **G-stability** | 1 | 0 | 1 | 0 | 0.0% | 5.60s |
| **Tổng** | **5** | **0** | **5** | **0** | **0.0%** | **5.86s** |

---

## 2. Độ chính xác gọi công cụ

TP: tool bắt buộc và đã gọi · FN: bắt buộc nhưng không gọi · FP: gọi tool cấm hoặc tool hành động (giữ ghế, tạo đơn, nhả ghế) khi không được yêu cầu · Gọi thêm: tool tra cứu không bắt buộc (hợp lệ, không tính vào TP/FP). N/A: không đủ dữ liệu để tính.

| Tool | TP | FP | FN | Gọi thêm | Precision | Recall | F1 |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `search_movies` | 1 | 0 | 0 | 4 | 100.0% | 100.0% | 1.000 |
| `get_movie_details` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| `get_showtimes` | 1 | 0 | 0 | 4 | 100.0% | 100.0% | 1.000 |
| `get_available_seats` | 3 | 0 | 0 | 2 | 100.0% | 100.0% | 1.000 |
| `get_fnb_items` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| `get_my_orders` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| `get_order_status` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| `hold_seats` | 0 | 5 | 0 | 0 | 0.0% | N/A | N/A |
| `release_seats` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| `create_order_and_payment` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| **Micro-Average** | 5 | 5 | 0 | 10 | 50.0% | 100.0% | 0.667 |

---

## 3. Phân bố độ trễ

Đo từ lúc gửi tin nhắn tới khi agent kết thúc lượt (gồm suy luận LLM và các lần gọi backend), cộng dồn mọi lượt của kịch bản; chỉ tính kịch bản chấm được.

| Chỉ số | Giá trị |
| :--- | :-: |
| Min | 5.31s |
| P50 (trung vị) | 6.07s |
| P90 | 6.20s |
| P95 | 6.20s |
| Max | 6.20s |
| Trung bình | 5.86s |

---

## 4. Độ nhất quán (kịch bản chạy lặp)

| Kịch bản | Số lần chạy | Số lần đạt | Tỷ lệ |
| :--- | :-: | :-: | :-: |
| A04 | 3 | 0 | 0.0% |
| B03 | 3 | 0 | 0.0% |
| B07 | 3 | 0 | 0.0% |
| C02 | 3 | 0 | 0.0% |
| G06 | 3 | 1 | 33.3% |

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
Dạ, ghế **H7** suất **10:00** ngày mai (**16/11/2026**) phim **Mai** tại rạp Cinema Star - Bến Nghé Plaza hiện còn trống và có giá vé là 65.000đ. 

Để tiến hành giữ ghế, bạn vui lòng đăng nhập vào tài khoản của mình nhé!
```

### [B03] Yêu cầu "chỗ ngồi đẹp nhất" một cách cảm tính
- **Nhóm:** `B-ambiguous`
- **Đạt:** 0/3 lần chạy
- **Nguyên nhân:**
  - Lần 1/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
  - Lần 2/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
  - Lần 3/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
- **Phản hồi của agent:**
```text
Tôi đã giữ cho bạn 2 ghế VIP đẹp nhất ở giữa rạp (ghế **F6, F7**) cho suất chiếu **10:00 ngày mai (16/11/2026)** phim **Mai** tại *Cinema Star - Bến Nghé Plaza*. 

Tổng tiền vé: **176.000đ** (88.000đ/ghế). 
Ghế được giữ đến **00:02**. Bạn có muốn chọn thêm bắp nước không hay tiến hành thanh toán luôn?
```

### [B07] Chỉ định vị trí ghế chung chung (ghế lối đi / ghế cuối)
- **Nhóm:** `B-ambiguous`
- **Đạt:** 0/3 lần chạy
- **Nguyên nhân:**
  - Lần 1/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
  - Lần 2/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
  - Lần 3/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
- **Phản hồi của agent:**
```text
Tôi đã giữ thành công ghế sát lối đi **F1** (ghế VIP, giá 88.000đ) cho suất chiếu phim **Mai** lúc **10:00 ngày mai (16/11/2026)** tại *Cinema Star - Bến Nghé Plaza*. 

Ghế của bạn sẽ được giữ đến **00:02** hôm nay. Bạn có muốn chọn thêm bắp nước không hay tiến hành tạo đơn thanh toán luôn?
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
Rất tiếc, ghế **H9** suất **10:00 ngày mai (16/11)** tại rạp **Cinema Star - Bến Nghé Plaza** phim **Mai** hiện đã có người đặt rồi ạ. 

Ghế H hàng này hiện còn trống các số từ **H1 đến H8** và **H10 đến H12** (giá vé: 65.000đ). Bạn có muốn chọn sang ghế khác cạnh đó không ạ?
```

### [G06] Câu lệnh trộn lẫn tiếng Anh và tiếng Việt (Code-switching)
- **Nhóm:** `G-stability`
- **Đạt:** 1/3 lần chạy
- **Nguyên nhân:**
  - Lần 1/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
  - Lần 2/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
- **Phản hồi của agent:**
```text
Mình đã giữ giúp bạn 2 ghế VIP **E6, E7** cho suất chiếu phim **Mai** lúc **10:00 ngày mai (16/11/2026)** tại **Cinema Star - Bến Nghé Plaza** (Tổng tiền vé: 176.000đ).

Bạn có muốn lấy thêm bắp nước không? Nếu không, mình tiến hành tạo đơn hàng và link thanh toán luôn nhé!
```
