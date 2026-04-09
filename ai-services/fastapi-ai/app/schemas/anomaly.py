from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import Meta


class AnomalyHistoryPoint(BaseModel):
    gpa_current: float = Field(ge=0, le=4)
    attendance_rate: float = Field(ge=0, le=1)
    sentiment_score: float = Field(ge=-1, le=1)
    stress_level: float = Field(ge=1, le=5)
    recorded_at: datetime | None = None


class AnomalyRequest(BaseModel):
    student_user_id: str
    latest_record_id: str | None = None
    features: list[str] = Field(
        default_factory=lambda: ["gpa_current", "attendance_rate", "sentiment_score", "stress_level"]
    )
    history: list[AnomalyHistoryPoint] = Field(min_length=2)


class AnomalyResponse(BaseModel):
    student_user_id: str
    latest_record_id: str | None = None
    is_anomaly: bool
    anomaly_score: float
    anomaly_type: Literal["Study anomaly", "Attendance anomaly", "Sentiment anomaly"]
    triggered_features: list[str]
    z_scores: dict[str, float]
    feature_values: dict[str, float]
    meta: Meta
