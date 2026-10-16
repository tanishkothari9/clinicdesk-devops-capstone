from datetime import timedelta

from fastapi.testclient import TestClient

from app.config import clinic_now

from .conftest import appointment_payload


def test_create_appointment_embeds_doctor(client: TestClient, doctor: dict, tomorrow_10am) -> None:
    response = client.post("/api/appointments", json=appointment_payload(doctor["id"], tomorrow_10am))

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "scheduled"
    assert body["doctor"] == {"id": doctor["id"], "full_name": "Dr. Asha Rao", "specialty": "Cardiology", "room": "C-101"}
    assert body["scheduled_at"].startswith(tomorrow_10am.strftime("%Y-%m-%dT10:00"))


def test_create_appointment_for_unknown_doctor_returns_404(client: TestClient, tomorrow_10am) -> None:
    response = client.post("/api/appointments", json=appointment_payload(42, tomorrow_10am))
    assert response.status_code == 404


def test_create_appointment_rejects_invalid_fields(client: TestClient, doctor: dict, tomorrow_10am) -> None:
    payload = appointment_payload(doctor["id"], tomorrow_10am, duration_minutes=2, visit_type="spa")
    response = client.post("/api/appointments", json=payload)

    assert response.status_code == 422
    assert {err["loc"][-1] for err in response.json()["detail"]} == {"duration_minutes", "visit_type"}


def test_overlapping_booking_for_same_doctor_conflicts(client: TestClient, doctor: dict, tomorrow_10am) -> None:
    client.post("/api/appointments", json=appointment_payload(doctor["id"], tomorrow_10am))

    response = client.post(
        "/api/appointments",
        json=appointment_payload(doctor["id"], tomorrow_10am + timedelta(minutes=15), patient_name="Neha Iyer"),
    )

    assert response.status_code == 409
    assert "Dr. Asha Rao already has an appointment from 10:00 to 10:30" in response.json()["detail"]


def test_back_to_back_bookings_are_allowed(client: TestClient, doctor: dict, tomorrow_10am) -> None:
    client.post("/api/appointments", json=appointment_payload(doctor["id"], tomorrow_10am))
    response = client.post(
        "/api/appointments", json=appointment_payload(doctor["id"], tomorrow_10am + timedelta(minutes=30))
    )
    assert response.status_code == 201


def test_cancelled_slot_can_be_rebooked(client: TestClient, doctor: dict, tomorrow_10am) -> None:
    first = client.post("/api/appointments", json=appointment_payload(doctor["id"], tomorrow_10am)).json()
    client.put(f"/api/appointments/{first['id']}", json={"status": "cancelled"})

    response = client.post("/api/appointments", json=appointment_payload(doctor["id"], tomorrow_10am))

    assert response.status_code == 201


def test_update_appointment_status_and_reschedule(client: TestClient, doctor: dict, tomorrow_10am) -> None:
    created = client.post("/api/appointments", json=appointment_payload(doctor["id"], tomorrow_10am)).json()
    new_time = tomorrow_10am + timedelta(hours=2)

    response = client.put(
        f"/api/appointments/{created['id']}",
        json={"status": "checked_in", "scheduled_at": new_time.isoformat(), "notes": "Arrived early"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "checked_in"
    assert body["scheduled_at"].startswith(new_time.strftime("%Y-%m-%dT12:00"))
    assert body["notes"] == "Arrived early"
    assert body["patient_name"] == "Rahul Mehta"


def test_reschedule_into_taken_slot_conflicts(client: TestClient, doctor: dict, tomorrow_10am) -> None:
    client.post("/api/appointments", json=appointment_payload(doctor["id"], tomorrow_10am))
    later = client.post(
        "/api/appointments", json=appointment_payload(doctor["id"], tomorrow_10am + timedelta(hours=1))
    ).json()

    response = client.put(f"/api/appointments/{later['id']}", json={"scheduled_at": tomorrow_10am.isoformat()})

    assert response.status_code == 409


def test_delete_appointment(client: TestClient, doctor: dict, tomorrow_10am) -> None:
    created = client.post("/api/appointments", json=appointment_payload(doctor["id"], tomorrow_10am)).json()

    assert client.delete(f"/api/appointments/{created['id']}").status_code == 204
    assert client.get(f"/api/appointments/{created['id']}").status_code == 404


def test_list_filters_by_status_doctor_and_date(client: TestClient, doctor: dict, tomorrow_10am) -> None:
    other = client.post("/api/doctors", json={"full_name": "Dr. Meera Nair", "specialty": "ENT", "room": "E-4"}).json()
    a = client.post("/api/appointments", json=appointment_payload(doctor["id"], tomorrow_10am)).json()
    client.post("/api/appointments", json=appointment_payload(other["id"], tomorrow_10am))
    client.post("/api/appointments", json=appointment_payload(doctor["id"], tomorrow_10am + timedelta(days=1)))
    client.put(f"/api/appointments/{a['id']}", json={"status": "completed"})

    assert len(client.get("/api/appointments").json()) == 3
    assert [x["id"] for x in client.get("/api/appointments", params={"status": "completed"}).json()] == [a["id"]]
    assert len(client.get("/api/appointments", params={"doctor_id": other["id"]}).json()) == 1
    assert len(client.get("/api/appointments", params={"date": tomorrow_10am.date().isoformat()}).json()) == 2
    assert client.get("/api/appointments", params={"status": "lost"}).status_code == 422


def test_stats_summarise_the_schedule(client: TestClient, doctor: dict) -> None:
    now = clinic_now().replace(second=0, microsecond=0)
    later_today = min(now + timedelta(minutes=5), now.replace(hour=23, minute=59))
    done = client.post("/api/appointments", json=appointment_payload(doctor["id"], now - timedelta(days=2))).json()
    missed = client.post("/api/appointments", json=appointment_payload(doctor["id"], now - timedelta(days=1))).json()
    client.post("/api/appointments", json=appointment_payload(doctor["id"], now + timedelta(days=3)))
    client.post("/api/appointments", json=appointment_payload(doctor["id"], later_today, duration_minutes=5))
    client.put(f"/api/appointments/{done['id']}", json={"status": "completed"})
    client.put(f"/api/appointments/{missed['id']}", json={"status": "no_show"})

    stats = client.get("/api/appointments/stats").json()

    assert stats["total"] == 4
    assert stats["today"] == 1
    assert stats["upcoming"] == 2
    assert stats["completion_rate"] == 0.5
    assert stats["by_status"] == {"scheduled": 2, "checked_in": 0, "completed": 1, "cancelled": 0, "no_show": 1}
    assert stats["by_doctor"] == [
        {"doctor_id": doctor["id"], "doctor_name": "Dr. Asha Rao", "specialty": "Cardiology", "count": 4}
    ]
