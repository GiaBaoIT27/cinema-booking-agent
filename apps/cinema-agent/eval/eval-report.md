# BÁO CÁO THỰC NGHIỆM ĐÁNH GIÁ AI CINEMA BOOKING AGENT

**Ngày thực nghiệm:** 22:33:46 16/11/2026  
**Mô hình:** gemini-3.5-flash-lite (temperature 0.2)  
**Môi trường:** Node.js v24.12.0  
**Chốt chặn giữ ghế:** bật · đã chặn 4 lời gọi  
**Số kịch bản đã chạy:** 100/100  
**Kết quả:** 100 đạt · 0 không đạt · 0 lỗi hạ tầng (không chấm được)  
**Tỷ lệ hoàn thành tác vụ (TCR = đạt / chấm được):** 100.0%  
**Độ trễ trung bình:** 6.14s

> [!NOTE]
> Báo cáo gộp: 93 kịch bản lấy từ lần chạy 00:32:53 16/11/2026, 7 kịch bản chạy lại lúc 22:33:46 16/11/2026 (G04, G05, G06, G07, G08, G09, G10), cùng model gemini-3.5-flash-lite.

---

## 1. Kết quả theo 7 nhóm năng lực

| Nhóm | Số kịch bản | Đạt | Không đạt | Lỗi hạ tầng | TCR | Độ trễ TB |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: |
| **A-booking** | 25 | 25 | 0 | 0 | 100.0% | 11.48s |
| **B-ambiguous** | 15 | 15 | 0 | 0 | 100.0% | 2.77s |
| **C-truth** | 15 | 15 | 0 | 0 | 100.0% | 2.92s |
| **D-safety** | 15 | 15 | 0 | 0 | 100.0% | 2.87s |
| **E-offtopic** | 10 | 10 | 0 | 0 | 100.0% | 1.48s |
| **F-multiturn** | 10 | 10 | 0 | 0 | 100.0% | 13.80s |
| **G-stability** | 10 | 10 | 0 | 0 | 100.0% | 4.59s |
| **Tổng** | **100** | **100** | **0** | **0** | **100.0%** | **6.14s** |

---

## 2. Độ chính xác gọi công cụ

TP: tool bắt buộc và đã gọi · FN: bắt buộc nhưng không gọi · FP: gọi tool cấm hoặc tool hành động (giữ ghế, tạo đơn, nhả ghế) khi không được yêu cầu · Gọi thêm: tool tra cứu không bắt buộc (hợp lệ, không tính vào TP/FP). N/A: không đủ dữ liệu để tính.

| Tool | TP | FP | FN | Gọi thêm | Precision | Recall | F1 |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `search_movies` | 28 | 0 | 0 | 31 | 100.0% | 100.0% | 1.000 |
| `get_movie_details` | 2 | 0 | 0 | 2 | 100.0% | 100.0% | 1.000 |
| `get_showtimes` | 24 | 0 | 0 | 24 | 100.0% | 100.0% | 1.000 |
| `get_available_seats` | 13 | 0 | 0 | 10 | 100.0% | 100.0% | 1.000 |
| `get_fnb_items` | 9 | 0 | 0 | 1 | 100.0% | 100.0% | 1.000 |
| `get_my_orders` | 2 | 0 | 0 | 0 | 100.0% | 100.0% | 1.000 |
| `get_order_status` | 3 | 0 | 0 | 1 | 100.0% | 100.0% | 1.000 |
| `hold_seats` | 18 | 0 | 0 | 2 | 100.0% | 100.0% | 1.000 |
| `release_seats` | 3 | 0 | 0 | 0 | 100.0% | 100.0% | 1.000 |
| `create_order_and_payment` | 8 | 0 | 0 | 0 | 100.0% | 100.0% | 1.000 |
| **Micro-Average** | 110 | 0 | 0 | 71 | 100.0% | 100.0% | 1.000 |

---

## 3. Phân bố độ trễ

Đo từ lúc gửi tin nhắn tới khi agent kết thúc lượt (gồm suy luận LLM và các lần gọi backend), cộng dồn mọi lượt của kịch bản; chỉ tính kịch bản chấm được.

| Chỉ số | Giá trị |
| :--- | :-: |
| Min | 1.00s |
| P50 (trung vị) | 3.96s |
| P90 | 12.19s |
| P95 | 22.03s |
| Max | 31.14s |
| Trung bình | 6.14s |

---

## 4. Độ nhất quán (kịch bản chạy lặp)

| Kịch bản | Số lần chạy | Số lần đạt | Tỷ lệ |
| :--- | :-: | :-: | :-: |
| G01 | 3 | 3 | 100.0% |
| G02 | 3 | 3 | 100.0% |
| G03 | 3 | 3 | 100.0% |
| G04 | 3 | 3 | 100.0% |
| G05 | 5 | 5 | 100.0% |
| G06 | 3 | 3 | 100.0% |
| G07 | 3 | 3 | 100.0% |
| G08 | 3 | 3 | 100.0% |
| G09 | 3 | 3 | 100.0% |
| G10 | 3 | 3 | 100.0% |

Một kịch bản chạy lặp chỉ được tính ĐẠT khi đạt ở mọi lần chạy.

---

## Phân tích lỗi

Tất cả 100 kịch bản đã chạy đều đạt các tiêu chí kiểm tra tự động; ghi nhận 0 lần gọi tool sai (FP). Kết luận chỉ áp dụng cho các tiêu chí được kiểm tra trong bộ dữ liệu.
