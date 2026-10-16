from fastapi.testclient import TestClient

from .conftest import appointment_payload


def test_create_and_list_doctors(client: TestClient, doctor: dict) -> None:
    client.post("/api/doctors", json={"full_name": "Dr. Vikram Shah", "specialty": "Dermatology", "room": "D-2"})

    response = client.get("/api/doctors")

    assert response.status_code == 200
    assert [d["full_name"] for d in response.json()] == ["Dr. Asha Rao", "Dr. Vikram Shah"]
    assert response.json()[0]["is_active"] is True


def test_create_doctor_validates_payload(client: TestClient) -> None:
    response = client.post("/api/doctors", json={"full_name": "X", "specialty": "Cardiology", "room": "C-1"})
    assert response.status_code == 422


def test_duplicate_doctor_email_conflicts(client: TestClient, doctor: dict) -> None:
    response = client.post(
        "/api/doctors",
        json={"full_name": "Dr. Someone Else", "specialty": "ENT", "room": "E-1", "email": doctor["email"]},
    )
    assert response.status_code == 409


def test_update_doctor(client: TestClient, doctor: dict) -> None:
    response = client.put(f"/api/doctors/{doctor['id']}", json={"room": "C-202", "is_active": False})

    assert response.status_code == 200
    assert response.json()["room"] == "C-202"
    assert response.json()["is_active"] is False
    assert response.json()["specialty"] == "Cardiology"


def test_get_missing_doctor_returns_404(client: TestClient) -> None:
    assert client.get("/api/doctors/999").status_code == 404


def test_delete_doctor_with_appointments_is_blocked(client: TestClient, doctor: dict, tomorrow_10am) -> None:
    client.post("/api/appointments", json=appointment_payload(doctor["id"], tomorrow_10am))

    response = client.delete(f"/api/doctors/{doctor['id']}")

    assert response.status_code == 409
    assert "still has appointments" in response.json()["detail"]


def test_delete_doctor_without_appointments(client: TestClient, doctor: dict) -> None:
    assert client.delete(f"/api/doctors/{doctor['id']}").status_code == 204
    assert client.get(f"/api/doctors/{doctor['id']}").status_code == 404
