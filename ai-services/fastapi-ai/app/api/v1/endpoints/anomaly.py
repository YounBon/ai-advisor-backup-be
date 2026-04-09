from fastapi import APIRouter

from app.schemas.anomaly import AnomalyRequest, AnomalyResponse
from app.services.anomaly_service import detect_anomaly

router = APIRouter()


@router.post("/detect", response_model=AnomalyResponse)
def detect(payload: AnomalyRequest) -> AnomalyResponse:
    return detect_anomaly(payload)
