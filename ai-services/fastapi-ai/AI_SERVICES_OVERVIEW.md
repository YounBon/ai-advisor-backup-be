# AI Services - Kiến Trúc & Luồng Thực Thi

## Tổng Quan

Tài liệu này mô tả 3 module AI chính trong hệ thống AI-Advisor, vai trò, đầu vào, đầu ra và **thứ tự thực thi đúng**.

---

## Thứ Tự Chạy AI (Theo Phụ Thuộc)

1. **Phân Tích Cảm Xúc (AI-02) chạy trước**
    - Kích hoạt khi sinh viên gửi feedback.
    - Tạo `sentiment_score` để các AI khác dùng lại.

2. **Dự Đoán Nguy Cơ Học Vụ (AI-01) chạy sau AI-02 (khuyến nghị)**
    - Chạy khi sinh viên nhập điểm hoặc cập nhật điểm học tập.
    - Dùng `sentiment_score` mới nhất để dự đoán chính xác hơn.

3. **Phát Hiện Bất Thường (AI-04) chạy cuối theo chu kỳ**
    - Chạy mỗi 7 ngày khi tạo bản ghi theo dõi định kỳ.
    - Cần history theo dõi và nên có `sentiment_score` từ AI-02.
    - Đây là bước tổng hợp để phát hiện thay đổi bất thường theo thời gian.

### Quy Tắc Nhớ Nhanh
- Muốn có phân tích cảm xúc: chạy AI-02.
- Muốn dự đoán nguy cơ chính xác hơn: chạy AI-02 rồi AI-01.
- Muốn phát hiện bất thường theo chu kỳ: chuẩn bị history, ưu tiên có AI-02, rồi chạy AI-04.

---

## AI-01 — Dự Đoán Nguy Cơ Học Vụ (Academic Risk Prediction)

### Mục Đích
Dự đoán mức độ nguy cơ học vụ của sinh viên để giúp cố vấn học tập phát hiện sớm sinh viên có nguy cơ.

### Đầu Vào
- `gpa_current`: GPA hiện tại (0-4)
- `attendance_rate`: Tỷ lệ chuyên cần (0-1)
- `num_failed`: Số môn rớt
- `stress_level`: Mức độ stress (1-5)
- `motivation_score`: Mức độ động lực (1-5)
- `shcvht_participation`: Số buổi SHCVHT đã tham gia
- `study_hours`: Số giờ tự học mỗi tuần
- `sentiment_score`: Điểm cảm xúc từ AI-02 (-1 đến 1)

### Đầu Ra
- `risk_score`: 0-1 (xác suất nguy cơ cao)
- `risk_label`: -1 (High) / 0 (Medium) / 1 (Low)
- `model_name`: Random Forest

### Công Nghệ
- **Chính**: Random Forest / XGBoost (model đã train)
- **Fallback**: Rule-based baseline scoring
- **Framework**: Scikit-learn, Python

### Khi Nào Chạy?
1. Khi sinh viên nhập điểm mới
2. Khi sinh viên cập nhật điểm học tập
3. Khi hệ thống đồng bộ dữ liệu điểm học tập từ nguồn bên ngoài

### Vai Trò Trong Hệ Thống
- Cung cấp risk score hiển thị trong dashboard cố vấn
- Đầu vào cho hệ thống cảnh báo sinh viên nguy cơ cao
- Được sử dụng bởi recommendation engine để đề xuất biện pháp hỗ trợ

---

## AI-02 — Phân Tích Cảm Xúc (Sentiment Analysis)

### Mục Đích
Phân tích nội dung feedback của sinh viên để hiểu trạng thái cảm xúc và mức độ hài lòng sau buổi tư vấn.

### Đầu Vào
- `feedback_text`: Văn bản phản hồi của sinh viên (tiếng Việt)
- `meeting_id`: ID buổi meeting liên quan
- `student_user_id`: Mã sinh viên

### Đầu Ra
- `sentiment_label`: POSITIVE / NEUTRAL / NEGATIVE
- `sentiment_score`: -1 đến 1 (tiêu cực đến tích cực)
- `model_name`: vinai/phobert-base

### Công Nghệ
- **Model**: PhoBERT (Vietnamese BERT)
- **Framework**: HuggingFace Transformers, PyTorch

### Khi Nào Chạy?
**NGAY LẬP TỨC** sau khi sinh viên gửi feedback cho buổi meeting.

**Đây là điều kiện tiên quyết cho AI-04** vì AI-04 sử dụng `sentiment_score` làm một trong các feature đầu vào.

### Vai Trò Trong Hệ Thống
- Lưu `sentiment_score` vào bản ghi theo dõi học tập định kỳ
- Cung cấp feature đầu vào cho AI-04 (Phát Hiện Bất Thường)
- Kích hoạt cảnh báo cảm xúc cho cố vấn khi feedback quá tiêu cực
- Giúp xác định sinh viên đang gặp stress hoặc không hài lòng

---

## AI-04 — Phát Hiện Bất Thường (Anomaly Detection)

### Mục Đích
Phát hiện những thay đổi bất thường trong hành vi học tập của sinh viên theo thời gian.

**Khác biệt với AI-01:**
- AI-01: Dự đoán mức độ nguy cơ dựa trên trạng thái hiện tại
- AI-04: Phát hiện thay đổi bất thường so với lịch sử cá nhân

### Đầu Vào
- `gpa_current`: GPA hiện tại
- `attendance_rate`: Tỷ lệ chuyên cần
- `sentiment_score`: Từ AI-02 (-1 đến 1)
- `stress_level`: Mức độ stress (1-5)
- `history`: Danh sách các bản ghi theo dõi trước đó (tối thiểu 2 bản ghi)

### Cơ Chế Phát Hiện 3 Tầng

#### Tầng 0 — Hard Rules (Nguy Hiểm Tức Thời)
Kích hoạt cảnh báo ngay lập tức nếu giá trị rơi vào ngưỡng nguy hiểm tuyệt đối, không cần history.

**Ngưỡng critical:**
- `gpa_current` < 1.5
- `attendance_rate` < 0.5
- `sentiment_score` < -0.8
- `stress_level` >= 5

#### Tầng 1 — Delta Rules (History < 5 bản ghi)
So sánh với bản ghi gần nhất để phát hiện thay đổi lớn.

**Ngưỡng delta:**
- `gpa_current` giảm ≥ 0.5
- `attendance_rate` giảm ≥ 0.3
- `sentiment_score` giảm ≥ 0.4
- `stress_level` tăng ≥ 2.0

#### Tầng 2 — Z-score + Isolation Forest (History ≥ 5 bản ghi)
Phát hiện bất thường dựa trên thói quen lịch sử của chính sinh viên.

- Sử dụng Isolation Forest để xác định outlier
- Áp dụng Z-score với ngưỡng directional (mặc định: |z| > 2.0)
- Chỉ kích hoạt khi CẢ Isolation Forest VÀ directional Z-score đều đồng ý

**Công thức Z-score theo từng feature:**

> **z_f = (x_f - μ_f) / (σ_f + ε)**

Trong đó:
- **x_f**: giá trị hiện tại của feature f
- **μ_f**: trung bình lịch sử của chính sinh viên cho feature f
- **σ_f**: độ lệch chuẩn lịch sử
- **ε**: hằng số nhỏ để tránh chia cho 0

**Directional Z-score (đúng chiều rủi ro):**
- `gpa_current`, `attendance_rate`, `sentiment_score`: bất thường khi **z_f < -2.0**
- `stress_level`: bất thường khi **z_f > 2.0**

**Isolation Forest signal:**

> **if_flag = 1** nếu decision_function(x) < τ  
> **if_flag = 0** nếu ngược lại

Với **τ** là ngưỡng outlier đã cấu hình.

**Điều kiện kích hoạt cuối cùng (Tier 2):**

> **is_anomaly = if_flag AND directional_z_flag**

Mục tiêu của cơ chế này là giảm false positive: chỉ cảnh báo khi cả mô hình outlier và sai lệch thống kê cùng xác nhận.

### Đầu Ra
- `is_anomaly`: Boolean (true/false)
- `anomaly_score`: Điểm bất thường (càng thấp = càng bất thường với Isolation Forest)
- `anomaly_type`: "Study anomaly" / "Attendance anomaly" / "Sentiment anomaly"
- `triggered_features`: Danh sách các feature kích hoạt anomaly
- `z_scores`: Z-scores cho từng feature (hoặc delta values cho Tier 1)
- `feature_values`: Giá trị hiện tại của các feature

**Cách diễn giải nhanh:**
- `is_anomaly = true`: sinh viên có dấu hiệu lệch bất thường so với lịch sử cá nhân.
- `anomaly_score` càng nhỏ: mức độ bất thường càng mạnh.
- `triggered_features`: cho biết chính xác biến nào gây cảnh báo để cố vấn hành động đúng trọng tâm.
- `z_scores`: dùng để giải thích mức lệch theo đơn vị độ lệch chuẩn, dễ audit và debug.

### Công Nghệ
- **Tier 2**: Isolation Forest + Z-score (unsupervised)
- **Framework**: Scikit-learn
- **Không cần training**: Chỉ inference, hoạt động dựa trên history của sinh viên

**Gợi ý cấu hình thực tế:**
- Chuẩn hóa feature theo cùng thang đo trước khi fit/score.
- Giữ cửa sổ history ổn định (ví dụ 8-16 bản ghi gần nhất) để tránh drift quá mạnh.
- Theo dõi tỷ lệ cảnh báo theo tuần để hiệu chỉnh ngưỡng `tau` và ngưỡng `|z|`.

### Khi Nào Chạy?
**Mỗi 7 ngày** khi hệ thống tạo bản ghi theo dõi học tập định kỳ.

**Điều kiện tiên quyết:**
1. Sinh viên phải có ít nhất 2 bản ghi theo dõi trong history
2. `sentiment_score` phải có sẵn từ AI-02 (nếu đã gửi feedback)

### Vai Trò Trong Hệ Thống
- Tạo cảnh báo anomaly cho cố vấn
- Giải thích yếu tố cụ thể nào gây ra bất thường
- Giúp xác định sinh viên có hành vi suy giảm nhanh chóng
- Bổ sung cho AI-01 bằng cách phát hiện thay đổi, không chỉ trạng thái hiện tại

---


### Biểu Đồ Phụ Thuộc

```
AI-02 (Phân Tích Cảm Xúc)
    │
    ├─▶ Đầu ra: sentiment_score
    │       │
    │       ├─▶ Được sử dụng bởi AI-01 (Dự Đoán Nguy Cơ) làm feature đầu vào
    │       │
    │       └─▶ Được sử dụng bởi AI-04 (Phát Hiện Bất Thường) làm feature đầu vào
    │
    └─▶ Chạy: Sau khi sinh viên gửi feedback


AI-01 (Dự Đoán Nguy Cơ)
    │
    ├─▶ Đầu vào: sentiment_score (từ AI-02)
    │
    └─▶ Chạy: Khi sinh viên nhập/cập nhật điểm học tập


AI-04 (Phát Hiện Bất Thường)
    │
    ├─▶ Đầu vào: sentiment_score (từ AI-02)
    ├─▶ Đầu vào: history records (tạo mỗi 7 ngày)
    │
    └─▶ Chạy: Mỗi 7 ngày khi tạo bản ghi theo dõi mới
```

### Quy Tắc Thứ Tự Thực Thi Quan Trọng

1. **AI-02 PHẢI chạy trước AI-04** cho cùng kỳ theo dõi
   - AI-04 cần `sentiment_score` từ AI-02
   - Nếu sinh viên chưa gửi feedback, dùng `sentiment_score = 0` (trung tính)

2. **AI-01 có thể chạy độc lập** nhưng chính xác hơn khi AI-02 đã chạy
   - AI-01 sử dụng `sentiment_score` làm feature
   - Vẫn có thể chạy với sentiment mặc định nếu AI-02 chưa chạy

3. **AI-04 yêu cầu dữ liệu lịch sử**
   - Tối thiểu 2 bản ghi theo dõi trong history
   - Chính xác hơn với 5+ bản ghi (chuyển từ Delta sang Isolation Forest)

---

## Tích Hợp Với Backend System

### Khi Backend Tạo Bản Ghi Theo Dõi (Mỗi 7 Ngày)

```
Backend tạo bản ghi AcademicTracking
    │
    ├─▶ 1. Kiểm tra sinh viên đã gửi feedback cho meetings gần đây chưa
    │       └─▶ Nếu CÓ và AI-02 chưa chạy: Chạy AI-02 trước
    │
    ├─▶ 2. Thu thập tất cả feature đầu vào:
    │       - gpa_current (từ academic records)
    │       - attendance_rate (từ attendance records)
    │       - sentiment_score (từ kết quả AI-02)
    │       - stress_level (từ student survey)
    │
    ├─▶ 3. Gọi AI-04 API: POST /api/v1/anomaly/detect
    │       └─▶ Truyền full history (đã sắp xếp theo recorded_at)
    │
    ├─▶ 4. Nếu AI-04 trả về is_anomaly = true:
    │       └─▶ Tạo bản ghi AnomalyAlert
    │           └─▶ Thông báo cho cố vấn (nếu bật notification)
    │
    └─▶ 5. Cập nhật dashboard sinh viên với anomaly status mới nhất
```

### Khi Sinh Viên Gửi Feedback

```
Sinh viên gửi feedback form
    │
    ├─▶ 1. Lưu feedback vào database
    │
    ├─▶ 2. Gọi AI-02 API: POST /api/v1/sentiment/classify
    │       └─▶ Truyền: feedback_text, meeting_id, student_user_id
    │
    ├─▶ 3. Lưu kết quả AI-02:
    │       - sentiment_label
    │       - sentiment_score
    │
    ├─▶ 4. Nếu sentiment rất tiêu cực (score < -0.7):
    │       └─▶ Tạo SentimentAlert cho cố vấn
    │
    └─▶ 5. Cập nhật bản ghi AcademicTracking mới nhất với sentiment_score mới
```

---

## Tổng Kết API Endpoints

| AI Module | Endpoint | Method | Mục Đích |
|-----------|----------|--------|----------|
| AI-01 | `/api/v1/risk/predict` | POST | Dự đoán nguy cơ học vụ |
| AI-02 | `/api/v1/sentiment/classify` | POST | Phân loại cảm xúc feedback |
| AI-04 | `/api/v1/anomaly/detect` | POST | Phát hiện bất thường học vụ |
| Health | `/api/v1/health` | GET | Kiểm tra trạng thái |

---

## Thực Tốt Nhất

1. **Luôn chạy AI-02 trước AI-04** khi xử lý feedback
2. **Đảm bảo history được sắp xếp theo `recorded_at`** trước khi gọi AI-04
3. **Sử dụng fallback values** khi AI models không sẵn sàng:
   - AI-01: Rule-based baseline
   - AI-02: Trả về 503 nếu model không sẵn sàng
   - AI-04: Delta fallback cho history nhỏ
4. **Theo dõi hiệu suất model** và retrain định kỳ
5. **Log tất cả dự đoán AI** để auditing và debugging

---

*Tài liệu Version: 1.0*  
*Cập nhật lần cuối: 2026-04-10*  
*Phát triển bởi: AI-Advisor Development Team*
