# FastAPI AI Services

Dịch vụ này chứa 3 module AI được sử dụng bởi `BACKEND-ADVISOR`:

- AI-01: Dự báo Rủi ro Học tập
- AI-02: Phân tích Cảm xúc
- AI-04: Phát hiện Bất thường Học tập

## 1) Cài đặt

Nếu chưa cài đặt `uv` (Windows):
- `winget install --id=astral-sh.uv -e`

```bash
cd ai-services/fastapi-ai
uv venv
.venv\Scripts\activate
uv sync
```

## 2) Chạy ứng dụng

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Tài liệu:
- Swagger: `http://localhost:8001/docs`
- Health check: `http://localhost:8001/api/v1/health`

## 4) API Endpoints

- `GET /api/v1/health` - Kiểm tra trạng thái
- `POST /api/v1/risk/predict` (AI-01) - Dự báo rủi ro
- `POST /api/v1/sentiment/classify` (AI-02) - Phân loại cảm xúc
- `POST /api/v1/anomaly/detect` (AI-04) - Phát hiện bất thường

## 5) AI-04 Contract

Request:

```json
{
  "student_user_id": "student-id",
  "latest_record_id": "record-id",
  "features": ["gpa_current", "attendance_rate", "sentiment_score", "stress_level"],
  "history": [
    {
      "gpa_current": 2.8,
      "attendance_rate": 0.85,
      "sentiment_score": 0.1,
      "stress_level": 2,
      "recorded_at": "2026-04-01T10:00:00Z"
    }
  ]
}
```

Response:

```json
{
  "student_user_id": "student-id",
  "latest_record_id": "record-id",
  "is_anomaly": false,
  "anomaly_score": 0.12,
  "anomaly_type": "Study anomaly",
  "triggered_features": ["attendance_rate", "stress_level"],
  "z_scores": {
    "gpa_current": -0.9,
    "attendance_rate": -0.4,
    "sentiment_score": 0.3,
    "stress_level": 0.7
  },
  "feature_values": {
    "gpa_current": 2.8,
    "attendance_rate": 0.85,
    "sentiment_score": 0.1,
    "stress_level": 2.0
  },
  "meta": {
    "model_name": "IsolationForest+ZScore",
    "version": "0.1"
  }
}
```

Ghi chú:
- AI-04 là model không giám sát (unsupervised).
- Chỉ sử dụng lịch sử của sinh viên (đã được sắp xếp theo `recorded_at` ở backend).
- Khi `history < 5`: dùng delta fallback so với điểm gần nhất:
  - `gpa_current` giảm `>= 0.5`
  - `attendance_rate` giảm `>= 0.3`
  - `sentiment_score` giảm `>= 0.4`
  - `stress_level` tăng `>= 2.0`
- Khi `history >= 5`: dùng Isolation Forest + directional Z-score:
  - `gpa_current z <= -2.0`
  - `attendance_rate z <= -2.0`
  - `sentiment_score z <= -2.0`
  - `stress_level z >= +2.0`
  - Cảnh báo khi `IsolationForest == anomaly` AND có ít nhất 1 directional trigger.

## 6) Tài liệu Training

Tài liệu huấn luyện model:
- `ml/README.md`
