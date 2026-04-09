import os

import numpy as np
from sklearn.ensemble import IsolationForest

from app.schemas.anomaly import AnomalyRequest, AnomalyResponse
from app.schemas.common import Meta

FEATURE_COLUMNS = ["gpa_current", "attendance_rate", "sentiment_score", "stress_level"]
DIRECTIONAL_Z_THRESHOLD = float(os.getenv("ANOMALY_DIRECTIONAL_Z_THRESHOLD", "2.0"))
MIN_HISTORY_FOR_STAT_MODEL = int(os.getenv("ANOMALY_MIN_HISTORY_FOR_STAT_MODEL", "5"))
DELTA_THRESHOLDS = {
    "gpa_current": float(os.getenv("ANOMALY_DELTA_GPA", "0.5")),
    "attendance_rate": float(os.getenv("ANOMALY_DELTA_ATTENDANCE", "0.3")),
    "sentiment_score": float(os.getenv("ANOMALY_DELTA_SENTIMENT", "0.4")),
    "stress_level": float(os.getenv("ANOMALY_DELTA_STRESS", "2.0")),
}


def _resolve_contamination() -> float:
    raw = float(os.getenv("ANOMALY_CONTAMINATION", "0.15"))
    return max(0.01, min(raw, 0.49))


def _build_matrix(payload: AnomalyRequest) -> np.ndarray:
    rows: list[list[float]] = []
    for point in payload.history:
        rows.append(
            [
                float(point.gpa_current),
                float(point.attendance_rate),
                float(point.sentiment_score),
                float(point.stress_level),
            ]
        )
    return np.array(rows, dtype=float)


def _is_directional_trigger(feature: str, z: float) -> bool:
    if feature in {"gpa_current", "attendance_rate", "sentiment_score"}:
        return z <= -DIRECTIONAL_Z_THRESHOLD
    if feature == "stress_level":
        return z >= DIRECTIONAL_Z_THRESHOLD
    return False


def _pick_anomaly_type(z_scores: dict[str, float], triggered_features: list[str]) -> str:
    if triggered_features:
        feature = max(triggered_features, key=lambda key: abs(z_scores.get(key, 0.0)))
    else:
        feature = max(z_scores, key=lambda key: abs(z_scores[key]))
    if feature == "attendance_rate":
        return "Attendance anomaly"
    if feature == "sentiment_score":
        return "Sentiment anomaly"
    return "Study anomaly"


def _pick_anomaly_type_from_features(triggered_features: list[str]) -> str:
    if "attendance_rate" in triggered_features:
        return "Attendance anomaly"
    if "sentiment_score" in triggered_features:
        return "Sentiment anomaly"
    return "Study anomaly"


def detect_anomaly(payload: AnomalyRequest) -> AnomalyResponse:
    matrix = _build_matrix(payload)
    latest_idx = matrix.shape[0] - 1
    latest_values = matrix[latest_idx]

    feature_values: dict[str, float] = {
        feature: float(latest_values[i]) for i, feature in enumerate(FEATURE_COLUMNS)
    }

    if matrix.shape[0] < MIN_HISTORY_FOR_STAT_MODEL:
        prev_values = matrix[latest_idx - 1]
        deltas = {
            feature: float(latest_values[i] - prev_values[i]) for i, feature in enumerate(FEATURE_COLUMNS)
        }

        triggered_features: list[str] = []
        if deltas["gpa_current"] <= -DELTA_THRESHOLDS["gpa_current"]:
            triggered_features.append("gpa_current")
        if deltas["attendance_rate"] <= -DELTA_THRESHOLDS["attendance_rate"]:
            triggered_features.append("attendance_rate")
        if deltas["sentiment_score"] <= -DELTA_THRESHOLDS["sentiment_score"]:
            triggered_features.append("sentiment_score")
        if deltas["stress_level"] >= DELTA_THRESHOLDS["stress_level"]:
            triggered_features.append("stress_level")

        is_anomaly = bool(triggered_features)
        return AnomalyResponse(
            student_user_id=payload.student_user_id,
            latest_record_id=payload.latest_record_id,
            is_anomaly=is_anomaly,
            anomaly_score=-1.0 if is_anomaly else 0.0,
            anomaly_type=_pick_anomaly_type_from_features(triggered_features),
            triggered_features=triggered_features,
            z_scores={feature: 0.0 for feature in FEATURE_COLUMNS},
            feature_values=feature_values,
            meta=Meta(model_name="DeltaFallback+IsolationForest+ZScore"),
        )

    model = IsolationForest(
        contamination=_resolve_contamination(),
        random_state=42,
        n_estimators=200,
    )
    model.fit(matrix)

    decisions = model.decision_function(matrix)
    predictions = model.predict(matrix)
    latest_score = float(decisions[latest_idx])

    means = matrix.mean(axis=0)
    stds = matrix.std(axis=0)
    z_scores: dict[str, float] = {}
    for i, feature in enumerate(FEATURE_COLUMNS):
        std = float(stds[i])
        z_scores[feature] = 0.0 if std == 0 else float((latest_values[i] - means[i]) / std)

    triggered_features = [feature for feature in FEATURE_COLUMNS if _is_directional_trigger(feature, z_scores[feature])]
    directional_triggered = bool(triggered_features)
    iforest_triggered = int(predictions[latest_idx]) == -1
    is_anomaly = bool(iforest_triggered and directional_triggered)

    return AnomalyResponse(
        student_user_id=payload.student_user_id,
        latest_record_id=payload.latest_record_id,
        is_anomaly=is_anomaly,
        anomaly_score=latest_score,
        anomaly_type=_pick_anomaly_type(z_scores, triggered_features),
        triggered_features=triggered_features,
        z_scores=z_scores,
        feature_values=feature_values,
        meta=Meta(model_name="IsolationForest+ZScore"),
    )
