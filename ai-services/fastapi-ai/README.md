xoa# FastAPI AI Services

Dịch vụ này chứa 3 module AI được sử dụng bởi `BACKEND-ADVISOR`:

- AI-01: Dự báo Rủi ro Học tập
- AI-02: Phân tích Cảm xúc
- AI-04: Phát hiện Bất thường Học tập

## 1) Cài đặt uv

**Lưu ý**: Phần này chỉ cài đặt `uv` (package manager). Để cài đặt các thư viện cần thiết cho training model, xem [Tài liệu Training](#4-tài-liệu-training).

Nếu chưa cài đặt `uv` (Windows):
- `winget install --id=astral-sh.uv -e`

```bash
cd ai-services/fastapi-ai
uv venv
.venv\Scripts\activate
uv sync
```

## 2) Chạy ứng dụng

**Lưu ý**: 
- Đọc kỹ [Tài liệu Training](#4-tài-liệu-training) để hiểu cách chuẩn bị data và train model trước khi chạy
- Service này cần được chạy **TRƯỚC** khi khởi động BACKEND-ADVISOR để đảm bảo AI services sẵn sàng

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Tài liệu:
- Swagger: `http://localhost:8001/docs`
- Health check: `http://localhost:8001/api/v1/health`

## 3) API Endpoints

- `GET /api/v1/health` - Kiểm tra trạng thái
- `POST /api/v1/risk/predict` (AI-01) - Dự báo rủi ro
- `POST /api/v1/sentiment/classify` (AI-02) - Phân loại cảm xúc
- `POST /api/v1/anomaly/detect` (AI-04) - Phát hiện bất thường

## 4) Tài liệu Training

Hướng dẫn chi tiết về cách chuẩn bị dữ liệu và train các model AI:
- **[ML Training Guide](ml/README.md)** - Hướng dẫn train AI-02 (Sentiment), AI-01 (Risk Prediction) và cấu hình AI-04 (Anomaly Detection)

## 5) Tài liệu Kiến trúc

Tài liệu mô tả chi tiết kiến trúc, luồng thực thi và cách tích hợp các AI services:
- **[AI Services Overview](AI_SERVICES_OVERVIEW.md)** - Kiến trúc hệ thống, thứ tự thực thi, input/output của từng AI, và luồng tích hợp với Backend
