# ML Training Guide (AI-01 + AI-02 + AI-04)

## 1) Cài dependencies train

```bash
cd ai-services/fastapi-ai
uv venv
.venv\\Scripts\\activate
uv sync --group train
```

## 2) Train AI-01 (Risk Prediction)

### 2.1 Chuẩn bị dữ liệu AI-01

Đặt file CSV vào:
- `ml/risk/data/risk_train.csv`
- `ml/risk/data/risk_valid.csv`
- `ml/risk/data/risk_test.csv` (khuyên nghị)

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

### 2.2 Train AI-01

```bash
uv run python ml/risk/scripts/train_risk.py --config ml/risk/configs/risk_train.yaml
```

Output checkpoint:
- `ml/risk/artifacts/checkpoints/risk-rf/final/model.pkl`

### 2.3 Evaluate AI-01

```bash
uv run python ml/risk/scripts/eval_risk.py --config ml/risk/configs/risk_train.yaml
```

### 2.4 Predict bằng file sửa trực tiếp

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

## 3) Train AI-02 (Sentiment PhoBERT)

### 3.1 Chuẩn bị dữ liệu AI-02

Đặt file CSV vào:
- `ml/sentiment/data/sentiment_train.csv`
- `ml/sentiment/data/sentiment_valid.csv`
- `ml/sentiment/data/sentiment_test.csv` (khuyến nghị)

Cột bắt buộc:
- `feedback_text`
- `sentiment_label` (`NEGATIVE`, `NEUTRAL`, `POSITIVE`)

Cột optional:
- `rating`

Nếu muốn tạo dữ liệu mẫu để test nhanh:

```bash
uv run python ml/sentiment/data/gen_data.py
```

### 3.2 Prepare PhoBERT base

```bash
uv run python ml/sentiment/scripts/prepare_phobert.py
```

Output:
- `ml/sentiment/artifacts/checkpoints/phobert-base-initial`

### 3.3 Train

```bash
uv run python ml/sentiment/scripts/train_sentiment.py --config ml/sentiment/configs/sentiment_train.yaml
```

Output checkpoint:
- `ml/sentiment/artifacts/checkpoints/phobert-sentiment/final`

### 3.4 Evaluate

```bash
uv run python ml/sentiment/scripts/eval_sentiment.py --config ml/sentiment/configs/sentiment_train.yaml
```

### 3.5 Predict nhanh 1 text

```bash
uv run python ml/sentiment/scripts/predict_sentiment.py --text "Buoi SHCVHT rat huu ich"
```

## 4) Score mapping mặc định (AI-02)

`feedback_score = P(NEGATIVE) - P(POSITIVE)`  
Giá trị nằm trong `[-1, 1]`.

## 5) AI-04 (Anomaly Detection)

AI-04 in this MVP is unsupervised and inference-only:
- Model: Isolation Forest + Z-score
- Feature set: `gpa_current`, `attendance_rate`, `sentiment_score`, `stress_level`
- Input: full student history (already sorted by backend using `recorded_at`)
- Output: `is_anomaly`, `anomaly_score`, `anomaly_type`, `z_scores`

No offline training checkpoint is required for this version.

Runtime knobs (from `.env`):
- `ANOMALY_CONTAMINATION` (default `0.15`)
- `ANOMALY_DIRECTIONAL_Z_THRESHOLD` (default `2.0`)
- `ANOMALY_MIN_HISTORY_FOR_STAT_MODEL` (default `5`)
- `ANOMALY_DELTA_GPA` (default `0.5`)
- `ANOMALY_DELTA_ATTENDANCE` (default `0.3`)
- `ANOMALY_DELTA_SENTIMENT` (default `0.4`)
- `ANOMALY_DELTA_STRESS` (default `2.0`)

## 6) Dùng checkpoint trong FastAPI

Set env cho AI-01:
- `RISK_MODEL_DIR=ml/risk/artifacts/checkpoints/risk-rf/final`

Set env:
- `SENTIMENT_MODEL_DIR=ml/sentiment/artifacts/checkpoints/phobert-sentiment/final`

Nếu không có checkpoint sentiment, service sentiment trả lời `503 model not ready`.
Nếu không có checkpoint risk, service risk fallback sang `risk-baseline`.
