# ML Training Guide (AI-02 + AI-01 + AI-04)

## 1) Cài đặt thư viện cần thiết

```bash
cd ai-services/fastapi-ai
uv venv
.venv\\Scripts\\activate
uv sync --group train
```

## 2) Train AI-02 (Sentiment PhoBERT)

### 2.1 Chuẩn bị dữ liệu AI-02

Đặt file CSV vào:
- `ml/sentiment/data/sentiment_train.csv`

Cột bắt buộc:
- `feedback_text`
- `sentiment_label` (`NEGATIVE`, `NEUTRAL`, `POSITIVE`)

Cột optional:
- `rating`

Nếu muốn tạo dữ liệu mẫu để test nhanh, bạn có thể chạy lệnh sau hoặc nhờ AI gen các câu feedback thông thường:

```bash
uv run python ml/sentiment/data/gen_data.py
```

### 2.2 Chuẩn bị model PhoBERT base

```bash
uv run python ml/sentiment/scripts/prepare_phobert.py
```

Output:
- `ml/sentiment/artifacts/checkpoints/phobert-base-initial`

### 2.3 Train model

```bash
uv run python ml/sentiment/scripts/train_sentiment.py --config ml/sentiment/configs/sentiment_train.yaml
```

Output checkpoint:
- `ml/sentiment/artifacts/checkpoints/phobert-sentiment/final`

### 2.4 Dự đoán nhanh 1 câu

```bash
uv run python ml/sentiment/scripts/predict_sentiment.py --text "Buổi SHCVHT rất hữu ích"
```

## 3) Train AI-01 (Risk Prediction)

### 3.1 Chuẩn bị dữ liệu AI-01

Đặt file CSV vào:
- `ml/risk/data/risk_train.csv`

Cột bắt buộc:
- `gpa_current` (0..4)
- `attendance_rate` (0..1)
- `num_failed` (0..5)
- `stress_level` (1..5)
- `motivation_score` (1..5)
- `shcvht_participation` (0..5)
- `study_hours` (0..30)
- `sentiment_score` (-1..1)
- `risk_label` (-1/0/1; High/Medium/Low)

Rule gán nhãn để thống nhất:
- Hard rule ưu tiên:
  - `-1 (High)` nếu `gpa_current < 2.0` hoặc `num_failed >= 3`
- High indicators:
  - `gpa_current < 2.5`
  - `num_failed >= 2`
  - `stress_level >= 3`
  - `sentiment_score < -0.2`
  - `attendance_rate < 0.7`
- Low indicators:
  - `gpa_current >= 2.8`
  - `num_failed == 0`
  - `stress_level <= 2`
  - `sentiment_score >= 0.2`
  - `attendance_rate >= 0.8`
- Gán nhãn:
  - `-1 (High)`: hard rule hoặc `high_count >= 3`
  - `1 (Low)`: `low_count >= 3` (nếu chưa là High)
  - `0 (Medium)`: các trường hợp còn lại

Nếu muốn tạo dữ liệu mẫu để test nhanh:

```bash
uv run python ml/risk/data/gen_risk_data.py
```

Check nhanh phân bố nhãn:

```bash
uv run python ml/risk/data/check_risk_data.py
```

Output sẽ hiển thị số lượng và tỉ lệ (%) của từng nhãn `-1/0/1` cho `train/valid/test`.

### 3.2 Train model AI-01

```bash
uv run python ml/risk/scripts/train_risk.py --config ml/risk/configs/risk_train.yaml
```

Output checkpoint:
- `ml/risk/artifacts/checkpoints/risk-rf/final/model.pkl`

### 3.3 Dự đoán với input tùy chỉnh

Mở file:
- `ml/risk/scripts/predict_risk_edit_input.py`

Sửa các số trong biến `PAYLOAD`, sau đó chạy:

```bash
uv run python ml/risk/scripts/predict_risk_edit_input.py
```

Script sẽ in:
- `Input payload`
- `risk_score`
- `risk_label`

## 4) AI-04 (Anomaly Detection)

AI-04 là unsupervised model - **KHÔNG CẦN TRAIN**, chỉ cần có dữ liệu điểm là chạy được.

### Cơ chế hoạt động
- Model: Isolation Forest + Z-score
- Feature set: `gpa_current`, `attendance_rate`, `sentiment_score`, `stress_level`
- Input: full student history (đã sorted theo `recorded_at`)
- Output: `is_anomaly`, `anomaly_score`, `anomaly_type`, `z_scores`

### Yêu cầu dữ liệu
- **Tối thiểu**: 2 bản ghi history để chạy Delta Rules
- **Tốt nhất**: 5+ bản ghi để chạy Isolation Forest + Z-score
- Không cần checkpoint training, model chạy trực tiếp trên dữ liệu history của sinh viên

### Các thông số cấu hình

| Thông số | Giá trị mặc định | Mô tả |
|----------|------------------|--------|
| `ANOMALY_CONTAMINATION` | `0.15` | Tỉ lệ anomaly dự kiến trong dữ liệu |
| `ANOMALY_DIRECTIONAL_Z_THRESHOLD` | `2.0` | Ngưỡng Z-score để phát hiện bất thường |
| `ANOMALY_MIN_HISTORY_FOR_STAT_MODEL` | `5` | Số bản ghi tối thiểu để dùng Isolation Forest |
| `ANOMALY_DELTA_GPA` | `0.5` | Ngưỡng giảm GPA bất thường |
| `ANOMALY_DELTA_ATTENDANCE` | `0.3` | Ngưỡng giảm attendance bất thường |
| `ANOMALY_DELTA_SENTIMENT` | `0.4` | Ngưỡng giảm sentiment bất thường |
| `ANOMALY_DELTA_STRESS` | `2.0` | Ngưỡng tăng stress bất thường |

### Cơ chế 3 tầng
1. **Tier 0 - Hard Rules**: Cảnh báo ngay nếu giá trị nguy hiểm (GPA < 1.5, attendance < 0.5, sentiment < -0.8, stress >= 5)
2. **Tier 1 - Delta Rules** (history < 5): So sánh với bản ghi gần nhất
3. **Tier 2 - Isolation Forest + Z-score** (history >= 5): Phát hiện bất thường dựa trên thống kê lịch sử

## 5) Sử dụng checkpoint trong FastAPI
Nếu không có checkpoint sentiment, service sentiment trả lời `503 model not ready`.
Nếu không có checkpoint risk, service risk fallback sang `risk-baseline`.
