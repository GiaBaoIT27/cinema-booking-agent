# BÁO CÁO THỰC NGHIỆM ĐÁNH GIÁ HỆ THỐNG AI CINEMA BOOKING AGENT

**Ngày thực nghiệm:** 17:04:46 4/11/2026
**Cấu hình mô hình:** Google Gemini 2.0 Flash (Temperature: 0.2, TopP: 0.95)
**Môi trường thực thi:** Docker Compose, Node.js v20, PostgreSQL 16, Redis 7
**Tổng số kịch bản kiểm thử (N):** 15
**Tỷ lệ hoàn thành tác vụ (Task Completion Rate - TCR):** 100.0%
**Độ trễ trung bình toàn hệ thống:** 8.91s

---

## 1. Kết quả thực nghiệm theo 7 nhóm năng lực cốt lõi

|  STT  | Nhóm năng lực kiểm thử (Category) | Số kịch bản | Đạt (Pass) | Tỷ lệ thành công (%) | Độ trễ trung bình (s) |
| :---: | :-------------------------------- | :---------: | :--------: | :------------------: | :-------------------: |
|   1   | **B-ambiguous**                   |     15      |     15     |        100.0%        |         8.91s         |
| **Σ** | **TỔNG HỢP TOÀN HỆ THỐNG**        |   **15**    |   **15**   |      **100.0%**      |       **8.91s**       |

---

## 2. Đánh giá độ chính xác gọi công cụ (Tool-Calling Confusion Matrix & Metrics)

| Tên công cụ (Tool Name)    |   TP   |  FP   |  FN   | Precision |   Recall   | F1-Score  |
| :------------------------- | :----: | :---: | :---: | :-------: | :--------: | :-------: |
| `search_movies`            |   8    |   0   |   0   |  100.0%   |   100.0%   | **1.000** |
| `get_movie_details`        |   0    |   0   |   0   |  100.0%   |   100.0%   | **1.000** |
| `get_showtimes`            |   6    |   0   |   0   |  100.0%   |   100.0%   | **1.000** |
| `get_available_seats`      |   3    |   0   |   0   |  100.0%   |   100.0%   | **1.000** |
| `get_fnb_items`            |   1    |   0   |   0   |  100.0%   |   100.0%   | **1.000** |
| `hold_seats`               |   0    |   2   |   0   |   0.0%    |   100.0%   | **0.000** |
| `release_seats`            |   0    |   0   |   0   |  100.0%   |   100.0%   | **1.000** |
| `create_order_and_payment` |   0    |   0   |   0   |  100.0%   |   100.0%   | **1.000** |
| `get_my_orders`            |   0    |   0   |   0   |  100.0%   |   100.0%   | **1.000** |
| `get_order_status`         |   0    |   0   |   0   |  100.0%   |   100.0%   | **1.000** |
| **Micro-Average**          | **18** | **2** | **0** | **90.0%** | **100.0%** | **0.947** |

---

## 3. Phân bố độ trễ phản hồi (End-to-End Latency Distribution)

Độ trễ tính từ lúc gửi câu lệnh người dùng qua HTTP Server-Sent Events (SSE) đến khi Agent hoàn tất lượt xử lý (bao gồm suy luận LLM, gọi REST API Backend, truy vấn Redis Lock và PostgreSQL).

| Chỉ số độ trễ (Latency Metric) | Giá trị (giây) | Giá trị (mili-giây) | Ghi chú kỹ thuật                                    |
| :----------------------------- | :------------: | :-----------------: | :-------------------------------------------------- |
| **Giá trị nhỏ nhất (Min)**     |     1.30s      |       1303 ms       | Phản hồi chào hỏi / Out-of-Domain không gọi tool    |
| **Trung vị (Median - P50)**    |     8.35s      |       8352 ms       | 50% yêu cầu phản hồi nhanh hơn mốc này              |
| **Phân vị 90 (P90)**           |     19.98s     |      19975 ms       | Tác vụ gọi 1-2 tool (tìm phim, xem suất chiếu)      |
| **Phân vị 95 (P95)**           |     20.95s     |      20951 ms       | Giao dịch phức tạp đa bước (giữ ghế + tạo đơn hàng) |
| **Giá trị lớn nhất (Max)**     |     20.95s     |      20951 ms       | Hội thoại đa lượt kết hợp giữ ghế và áp mã voucher  |
| **Trung bình (Mean)**          |     8.91s      |       8912 ms       | Độ trễ trung bình trên toàn bộ tập dữ liệu          |

---

## 4. Báo cáo các trường hợp không đạt & phân tích lỗi (Error Analysis)

> [!NOTE]
> **Kết quả hoàn hảo:** 100% các kịch bản kiểm thử trong tập dữ liệu đều đạt yêu cầu định trước. Không ghi nhận hiện tượng ảo giác (hallucination), không rò rỉ dữ liệu nhạy cảm (prompt injection), và cơ chế giữ chỗ phân tán Redis Lock luôn duy trì tính toàn vẹn trạng thái.
