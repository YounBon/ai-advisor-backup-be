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

# Hard rules for critical thresholds (trigger even with 1-2 records)
HARD_RULE_THRESHOLDS = {
    "gpa_current": float(os.getenv("ANOMALY_HARD_GPA", "1.0")),
    "attendance_rate": float(os.getenv("ANOMALY_HARD_ATTENDANCE", "0.3")),
    "sentiment_score": float(os.getenv("ANOMALY_HARD_SENTIMENT", "-0.7")),
    "stress_level": float(os.getenv("ANOMALY_HARD_STRESS", "5.0")),
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


def _pick_anomaly_type_from_features(triggered_features: list[str], feature_values: dict[str, float], delta_scores: dict[str, float] | None = None, delta_triggered_features: list[str] | None = None) -> str:
    """Pick anomaly type based on the most significant triggered feature.
    
    Priority:
    1. Features with significant delta changes (delta-triggered)
    2. Features from hard rules only if no delta-triggered features
    """
    if not triggered_features:
        return "Study anomaly"
    
    # If we have delta scores, pick the feature with largest absolute change
    if delta_scores:
        # Prefer delta-triggered features over hard-rule-only features
        candidates = delta_triggered_features if delta_triggered_features else triggered_features
        
        primary_feature = max(
            candidates, 
            key=lambda key: abs(delta_scores.get(key, 0.0))
        )
    else:
        # Fallback: just pick first triggered feature
        primary_feature = triggered_features[0]
    
    if primary_feature == "attendance_rate":
        return "Attendance anomaly"
    if primary_feature == "sentiment_score":
        return "Sentiment anomaly"
    # gpa_current or stress_level → Study anomaly
    return "Study anomaly"


def _check_hard_rules(feature_values: dict[str, float]) -> list[str]:
    """Check if current values violate critical hard rule thresholds."""
    triggered: list[str] = []
    if feature_values.get("gpa_current") <= HARD_RULE_THRESHOLDS["gpa_current"]:
        triggered.append("gpa_current")
    if feature_values.get("attendance_rate") <= HARD_RULE_THRESHOLDS["attendance_rate"]:
        triggered.append("attendance_rate")
    if feature_values.get("sentiment_score") <= HARD_RULE_THRESHOLDS["sentiment_score"]:
        triggered.append("sentiment_score")
    if feature_values.get("stress_level") >= HARD_RULE_THRESHOLDS["stress_level"]:
        triggered.append("stress_level")
    return triggered


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

        # Check delta-based triggers
        triggered_features: list[str] = []
        if deltas["gpa_current"] <= -DELTA_THRESHOLDS["gpa_current"]:
            triggered_features.append("gpa_current")
        if deltas["attendance_rate"] <= -DELTA_THRESHOLDS["attendance_rate"]:
            triggered_features.append("attendance_rate")
        if deltas["sentiment_score"] <= -DELTA_THRESHOLDS["sentiment_score"]:
            triggered_features.append("sentiment_score")
        if deltas["stress_level"] >= DELTA_THRESHOLDS["stress_level"]:
            triggered_features.append("stress_level")

        # Check hard rule triggers (critical absolute thresholds)
        hard_rule_triggered = _check_hard_rules(feature_values)
        all_triggered = list(set(triggered_features + hard_rule_triggered))

        is_anomaly = bool(all_triggered)
        
        # For delta fallback, return actual deltas (not normalized)
        # Negative = decreased, Positive = increased
        delta_scores: dict[str, float] = {
            feature: deltas[feature] for feature in FEATURE_COLUMNS
        }

        return AnomalyResponse(
            student_user_id=payload.student_user_id,
            latest_record_id=payload.latest_record_id,
            is_anomaly=is_anomaly,
            anomaly_score=-1.0 if is_anomaly else 0.0,
            anomaly_type=_pick_anomaly_type_from_features(all_triggered, feature_values, delta_scores, triggered_features),
            triggered_features=all_triggered,
            z_scores=delta_scores,
            feature_values=feature_values,
            meta=Meta(model_name="DeltaFallback+HardRules"),
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
