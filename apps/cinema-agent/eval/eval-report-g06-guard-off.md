# BÁO CÁO THỰC NGHIỆM ĐÁNH GIÁ AI CINEMA BOOKING AGENT

**Ngày thực nghiệm:** 22:51:26 16/11/2026  
**Mô hình:** gemini-3.5-flash-lite (temperature 0.2)  
**Môi trường:** Node.js v24.12.0  
**Chốt chặn giữ ghế:** tắt · đã chặn 0 lời gọi  
**Số kịch bản đã chạy:** 1/100 (lọc: --cases=G06 --repeat=3)  
**Kết quả:** 0 đạt · 1 không đạt · 0 lỗi hạ tầng (không chấm được)  
**Tỷ lệ hoàn thành tác vụ (TCR = đạt / chấm được):** 0.0%  
**Độ trễ trung bình:** 7.37s

> [!WARNING]
> Báo cáo chỉ phản ánh 1/100 kịch bản – không đại diện cho toàn bộ bộ dữ liệu.

---

## 1. Kết quả theo 1 nhóm năng lực

| Nhóm | Số kịch bản | Đạt | Không đạt | Lỗi hạ tầng | TCR | Độ trễ TB |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: |
| **G-stability** | 1 | 0 | 1 | 0 | 0.0% | 7.37s |
| **Tổng** | **1** | **0** | **1** | **0** | **0.0%** | **7.37s** |

---

## 2. Độ chính xác gọi công cụ

TP: tool bắt buộc và đã gọi · FN: bắt buộc nhưng không gọi · FP: gọi tool cấm hoặc tool hành động (giữ ghế, tạo đơn, nhả ghế) khi không được yêu cầu · Gọi thêm: tool tra cứu không bắt buộc (hợp lệ, không tính vào TP/FP). N/A: không đủ dữ liệu để tính.

| Tool | TP | FP | FN | Gọi thêm | Precision | Recall | F1 |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `search_movies` | 1 | 0 | 0 | 0 | 100.0% | 100.0% | 1.000 |
| `get_movie_details` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| `get_showtimes` | 1 | 0 | 0 | 0 | 100.0% | 100.0% | 1.000 |
| `get_available_seats` | 0 | 0 | 0 | 1 | N/A | N/A | N/A |
| `get_fnb_items` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| `get_my_orders` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| `get_order_status` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| `hold_seats` | 0 | 1 | 0 | 0 | 0.0% | N/A | N/A |
| `release_seats` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| `create_order_and_payment` | 0 | 0 | 0 | 0 | N/A | N/A | N/A |
| **Micro-Average** | 2 | 1 | 0 | 1 | 66.7% | 100.0% | 0.800 |

---

## 3. Phân bố độ trễ

Đo từ lúc gửi tin nhắn tới khi agent kết thúc lượt (gồm suy luận LLM và các lần gọi backend), cộng dồn mọi lượt của kịch bản; chỉ tính kịch bản chấm được.

| Chỉ số | Giá trị |
| :--- | :-: |
| Min | 7.37s |
| P50 (trung vị) | 7.37s |
| P90 | 7.37s |
| P95 | 7.37s |
| Max | 7.37s |
| Trung bình | 7.37s |

---

## 4. Độ nhất quán (kịch bản chạy lặp)

| Kịch bản | Số lần chạy | Số lần đạt | Tỷ lệ |
| :--- | :-: | :-: | :-: |
| G06 | 3 | 1 | 33.3% |

Một kịch bản chạy lặp chỉ được tính ĐẠT khi đạt ở mọi lần chạy.

---

## Phân tích lỗi

### [G06] Câu lệnh trộn lẫn tiếng Anh và tiếng Việt (Code-switching)
- **Nhóm:** `G-stability`
- **Đạt:** 1/3 lần chạy
- **Nguyên nhân:**
  - Lần 1/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
  - Lần 2/3: Tự ý gọi tool hành động 'hold_seats' khi kịch bản không yêu cầu (có tác dụng phụ: giữ ghế/tạo đơn)
- **Phản hồi của agent:**
```text
Mình đã giữ chỗ 2 vé xem phim **Mai** suất **10:00** ngày mai (**17/11/2026**) tại rạp **Cinema Star - Bến Nghé Plaza**, ghế **F6, F7** (giá vé: 176.000đ).

Bạn có muốn chọn thêm bắp nước không? Nếu không, mình có thể tiến hành tạo đơn hàng và link thanh toán giúp bạn luôn nhé!
```
