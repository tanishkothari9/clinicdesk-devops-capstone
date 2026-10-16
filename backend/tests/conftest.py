from collections.abc import Iterator
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import clinic_now
from app.db import Base, get_db
from app.main import app


@pytest.fixture
def client() -> Iterator[TestClient]:
    """API client backed by a fresh in-memory SQLite database per test.

    The production Postgres engine is never touched: get_db is overridden.
    """
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db() -> Iterator[Session]:
        with TestSession() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture
def doctor(client: TestClient) -> dict:
    response = client.post(
        "/api/doctors",
        json={"full_name": "Dr. Asha Rao", "specialty": "Cardiology", "room": "C-101", "email": "asha@clinic.test"},
    )
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def tomorrow_10am() -> datetime:
    return (clinic_now() + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)


def appointment_payload(doctor_id: int, at: datetime, **overrides) -> dict:
    payload = {
        "patient_name": "Rahul Mehta",
        "patient_phone": "+91 98765 43210",
        "doctor_id": doctor_id,
        "scheduled_at": at.isoformat(),
        "duration_minutes": 30,
        "visit_type": "consultation",
        "reason": "Chest pain follow-up",
    }
    payload.update(overrides)
    return payload
