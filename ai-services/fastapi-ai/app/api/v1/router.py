from fastapi import APIRouter

from app.api.v1.endpoints import (
    anomaly,
    health,
    risk,
    sentiment,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(risk.router, prefix="/risk", tags=["risk"])
api_router.include_router(sentiment.router, prefix="/sentiment", tags=["sentiment"])
api_router.include_router(anomaly.router, prefix="/anomaly", tags=["anomaly"])
