# Alert + Notification Flow (3 AI)

This document describes how `alert` and `notification` are generated for:
- AI-01 Risk Alert
- AI-02 Sentiment Alert
- AI-04 Anomaly Alert

## 1) Common principle

AI detects issue -> create `alert` -> create `notification` for advisor.

- `alert`: source of truth for dashboard and workflow status.
- `notification`: bell item for advisor action.

## 2) AI-02 Sentiment Alert flow

1. Student submits feedback.
2. Backend stores `feedback`.
3. Backend calls AI-02 `/api/v1/sentiment/classify`.
4. Condition:
   - `sentiment_label == NEGATIVE`
   - `feedback_score < -0.6`
5. Create `alert`:
   - `alert_type = SENTIMENT`
   - `source_ai = AI02_SENTIMENT`
   - `feedback_id = feedback._id`
6. Create `notification` for advisor of that student.

## 3) AI-01 Risk Alert flow

1. Student submits academic record.
2. Backend computes payload and calls AI-01 `/api/v1/risk/predict`.
3. Backend stores `risk_predictions`.
4. Condition:
   - `risk_label == -1`
5. Create `alert`:
   - `alert_type = RISK`
   - `source_ai = AI01_RISK`
   - `risk_prediction_id = risk_prediction._id`
6. Create `notification` for advisor.

## 4) AI-04 Anomaly Alert flow

1. Student submits academic record (new row in `academic_records`).
2. Backend fetches full student history, sorted by `recorded_at`.
3. Backend calls AI-04 `/api/v1/anomaly/detect` with:
   - `gpa_current`
   - `attendance_rate`
   - `sentiment_score`
   - `stress_level`
4. Condition:
   - If `history < 5`: delta fallback vs previous record:
     - `gpa_current` giảm `>= 0.5`
     - `attendance_rate` giảm `>= 0.3`
     - `sentiment_score` giảm `>= 0.4`
     - `stress_level` tăng `>= 2.0`
   - If `history >= 5`:
     - `IsolationForest` detects anomaly
     - and at least one directional Z-score trigger:
       - `gpa_current z <= -2.0`
       - `attendance_rate z <= -2.0`
       - `sentiment_score z <= -2.0`
       - `stress_level z >= +2.0`
5. Create `alert`:
   - `alert_type = ANOMALY`
   - `source_ai = AI04_ANOMALY`
   - `academic_record_id = academic_record._id`
   - `metadata` includes `anomaly_score`, `anomaly_type`, `triggered_features`, `z_scores`, `feature_values`
6. Create `notification` for advisor.

## 5) Data mapping

- `notifications.alert_id` -> `alert._id`
- `alert.feedback_id` -> `feedbacks._id` (AI-02)
- `alert.risk_prediction_id` -> `risk_predictions._id` (AI-01)
- `alert.academic_record_id` -> `academic_records._id` (AI-04)
