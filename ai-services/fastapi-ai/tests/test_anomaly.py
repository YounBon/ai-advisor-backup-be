from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_anomaly_detect_returns_payload():
    payload = {
        "student_user_id": "student-1",
        "latest_record_id": "record-3",
        "history": [
            {
                "gpa_current": 3.1,
                "attendance_rate": 0.9,
                "sentiment_score": 0.2,
                "stress_level": 2,
            },
            {
                "gpa_current": 3.0,
                "attendance_rate": 0.88,
                "sentiment_score": 0.1,
                "stress_level": 2,
            },
            {
                "gpa_current": 1.7,
                "attendance_rate": 0.45,
                "sentiment_score": -0.8,
                "stress_level": 5,
            },
        ],
    }

    response = client.post("/api/v1/anomaly/detect", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["student_user_id"] == "student-1"
    assert data["latest_record_id"] == "record-3"
    assert "is_anomaly" in data
    assert "anomaly_score" in data
    assert "triggered_features" in data
    assert "z_scores" in data
    assert "feature_values" in data
